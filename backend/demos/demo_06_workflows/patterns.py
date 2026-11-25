"""Năm workflow pattern, mỗi pattern một async function ngắn. Không framework.

Điểm chung: CODE quyết định cấu trúc (thứ tự, branch, song song, cap), MODEL chỉ
quyết định nội dung và vài quyết định được hỏi tường minh (intent, subtask, verdict).
"""

import asyncio
from typing import Any

import anthropic
from anthropic import AsyncAnthropic

import config
from shared.claude import api_error, config_error, new_client

from .runner import BudgetExceeded, IncompleteResponse, Trace

MAX_WORKERS = 2
MAX_REVISIONS = 1
INTENTS = ("draft_task", "summarize", "translate")


def _intent_from_label(label: str) -> str | None:
    token = label.strip().lower().splitlines()[0].strip().strip("\"'")
    return token if token in INTENTS else None


def _evaluator_accept(verdict: str) -> bool:
    first = verdict.strip().splitlines()[0].strip().upper().lstrip("*# ").strip("\"'")
    return first == "ACCEPT"

# Budget thật cho từng scenario (số API call tối đa).
BUDGETS = {"chaining": 2, "routing": 2, "parallel": 2, "orchestrator": 3, "evaluator": 4}


async def chaining(client: AsyncAnthropic, trace: Trace, text: str) -> str:
    """Hai call TUẦN TỰ: output bước 1 là input bước 2, thứ tự do code quy định."""
    draft = await trace.call(client, "draft", f"Viết mô tả task ngắn (2 câu) cho yêu cầu: {text}")
    trace.note("pipe", "lấy nguyên output bước 1 làm input bước 2")
    return await trace.call(
        client, "improve",
        "Viết lại mô tả sau cho rõ hơn và thêm một tiêu chí hoàn thành. Tối đa 3 câu.\n"
        f"Mô tả: {draft}",
    )


async def routing(client: AsyncAnthropic, trace: Trace, text: str) -> str:
    """Call 1 phân loại, rồi CODE chọn nhánh. Nhãn lạ thì fallback, không gọi thêm."""
    label = await trace.call(
        client, "classify",
        "Phân loại yêu cầu sau vào đúng một nhãn: draft_task, summarize, translate. "
        f"Chỉ trả về nhãn, không giải thích.\nYêu cầu: {text}",
    )
    intent = _intent_from_label(label)
    trace.note("route", f"classifier trả {label!r} -> intent={intent or 'không xác định'}")
    if intent is None:
        return ("Không xác định được intent nên không chạy handler nào (fallback an toàn). "
                f"Classifier trả: {label!r}")
    prompts = {
        "draft_task": f"Viết mô tả task ngắn (2 câu) cho: {text}",
        "summarize": f"Tóm tắt nội dung sau trong 2 câu: {text}",
        "translate": f"Dịch nội dung sau sang tiếng Anh, giữ nguyên ý: {text}",
    }
    return await trace.call(client, f"handler:{intent}", prompts[intent])


async def parallel(client: AsyncAnthropic, trace: Trace, text: str) -> str:
    """Hai yêu cầu độc lập chạy ĐỒNG THỜI bằng asyncio.gather()."""
    parts = [part.strip() for part in text.replace("\n", ";").split(";") if part.strip()]
    if len(parts) < 2:
        trace.note("split", "input chỉ có một yêu cầu -> không có gì để chạy song song")
        return "Cần hai yêu cầu, cách nhau bằng dấu ';' hoặc xuống dòng, để thấy chạy song song."
    first, second = parts[:MAX_WORKERS]
    trace.note("split", f"tách {len(parts)} yêu cầu, chạy {MAX_WORKERS} đầu tiên song song")
    answers = await asyncio.gather(
        trace.call(client, "worker A", f"Phân tích ngắn (2 câu) yêu cầu: {first}"),
        trace.call(client, "worker B", f"Phân tích ngắn (2 câu) yêu cầu: {second}"),
    )
    trace.note("aggregate", "ghép kết quả hai worker; so start_ms/end_ms sẽ thấy chúng chồng nhau")
    return f"A. {first}\n{answers[0]}\n\nB. {second}\n{answers[1]}"


async def orchestrator(client: AsyncAnthropic, trace: Trace, text: str) -> str:
    """Model lập kế hoạch (dynamic), CODE cap số worker rồi chạy từng worker."""
    plan = await trace.call(
        client, "planner",
        f"Chia công việc sau thành các subtask ngắn, mỗi dòng một subtask, không giải thích: {text}",
    )
    proposed = [line.strip(" -•\t") for line in plan.splitlines() if line.strip()]
    subtasks = proposed[:MAX_WORKERS]
    trace.note("cap", f"planner đề xuất {len(proposed)} subtask, code chỉ chạy {len(subtasks)} "
                      f"(cap MAX_WORKERS={MAX_WORKERS})")
    results = []
    for index, subtask in enumerate(subtasks, start=1):
        results.append(await trace.call(
            client, f"worker {index}", f"Làm subtask sau, trả lời trong 2 câu: {subtask}",
        ))
    trace.note("combine", "code gộp output các worker thành kết quả cuối")
    return "\n\n".join(f"{subtask}\n{result}" for subtask, result in zip(subtasks, results))


async def evaluator(client: AsyncAnthropic, trace: Trace, text: str) -> str:
    """Generate → Evaluate → tối đa MAX_REVISIONS lần sửa. Verdict là call thật."""
    draft = await trace.call(client, "generate", f"Viết mô tả task ngắn (2 câu) cho: {text}")
    for revision in range(MAX_REVISIONS + 1):
        verdict = await trace.call(
            client, f"evaluate #{revision + 1}",
            'Đánh giá mô tả task sau. Nếu đã đủ rõ để giao việc, trả đúng một từ "ACCEPT". '
            'Nếu chưa, trả "REVISE: <lý do ngắn>".\n'
            f"Mô tả: {draft}",
        )
        if _evaluator_accept(verdict):
            trace.note("decision", f"evaluator ACCEPT ở lần {revision + 1} -> dừng")
            return draft
        if revision == MAX_REVISIONS:
            trace.note("decision", f"hết budget revision (cap {MAX_REVISIONS}); trả bản cuối "
                                   f"kèm feedback chưa xử lý: {verdict}")
            return f"{draft}\n\n[Chưa được accept. Feedback còn lại: {verdict}]"
        trace.note("decision", f"evaluator yêu cầu sửa -> dùng 1 lần revision")
        draft = await trace.call(
            client, "revise",
            f"Sửa mô tả task theo feedback. Tối đa 3 câu.\nFeedback: {verdict}\nMô tả: {draft}",
        )
    return draft  # Không tới được, giữ cho type checker.


PATTERNS = {"chaining": chaining, "routing": routing, "parallel": parallel,
            "orchestrator": orchestrator, "evaluator": evaluator}


async def run_workflow(scenario: str, text: str) -> dict[str, Any]:
    if config.missing_llm_settings():
        return {"status": "failed", "scenario": scenario, "answer": None,
                "steps": [], "metrics": None, "error": config_error()}
    trace = Trace(budget=BUDGETS[scenario])
    error: dict[str, Any] | None = None
    answer: str | None = None
    async with new_client() as client:
        try:
            answer = await PATTERNS[scenario](client, trace, text)
        except BudgetExceeded as exceeded:
            error = {"kind": "budget_exceeded", "message": str(exceeded), "upstream_status": None}
        except IncompleteResponse as incomplete:
            error = {"kind": "incomplete_response", "message": str(incomplete), "upstream_status": None}
        except anthropic.APIError as api:
            error = api_error(api)
    return {"status": "failed" if error else "succeeded", "scenario": scenario,
            "answer": answer, "steps": trace.steps, "metrics": trace.metrics(), "error": error}
