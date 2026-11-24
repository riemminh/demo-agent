"""Hạ tầng chung cho 5 pattern: đếm API call, đo thời gian, ghi step trace.

Budget là giới hạn THẬT: hết budget thì `Trace.call()` raise, không chỉ ghi trong UI.
Mỗi step ghi `start_ms`/`end_ms` nên UI thấy được hai call của Parallel chạy chồng nhau.
"""

import time
from dataclasses import dataclass, field
from typing import Any

from anthropic import AsyncAnthropic

import config
from shared.claude import answer_text, elapsed_ms

MAX_OUTPUT_TOKENS = config.LLM_OUTPUT_MAX_TOKENS


class BudgetExceeded(RuntimeError):
    """Pattern cố gọi Claude nhiều hơn số call mà scenario được phép."""


class IncompleteResponse(RuntimeError):
    """Model trả stop_reason hoặc nội dung chưa đủ để coi là bước hoàn chỉnh."""


@dataclass
class Trace:
    budget: int
    started: float = field(default_factory=time.perf_counter)
    steps: list[dict[str, Any]] = field(default_factory=list)
    calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0

    def note(self, name: str, detail: str) -> None:
        """Step do CODE quyết định (branch, cap, aggregate) — không gọi model."""
        self.steps.append({"kind": "code", "name": name, "detail": detail,
                           "start_ms": elapsed_ms(self.started),
                           "end_ms": elapsed_ms(self.started)})

    async def call(self, client: AsyncAnthropic, name: str, prompt: str) -> str:
        if self.calls >= self.budget:
            raise BudgetExceeded(
                f"Scenario này chỉ được phép {self.budget} API call; pattern đang xin call thứ "
                f"{self.calls + 1}."
            )
        self.calls += 1
        start_ms = elapsed_ms(self.started)
        message = await client.messages.create(
            model=config.LLM_MODEL, max_tokens=MAX_OUTPUT_TOKENS,
            messages=[{"role": "user", "content": prompt}],
            thinking={"type": "disabled"},
        )
        if message.stop_reason != "end_turn":
            raise IncompleteResponse(
                f"Model trả stop_reason={message.stop_reason!r}, không coi là hoàn chỉnh."
            )
        text = answer_text(message).strip()
        if not text:
            raise IncompleteResponse("Model trả end_turn nhưng không có block text.")
        self.input_tokens += message.usage.input_tokens
        self.output_tokens += message.usage.output_tokens
        self.steps.append({
            "kind": "llm", "name": name, "prompt": prompt, "output": text,
            "start_ms": start_ms, "end_ms": elapsed_ms(self.started),
            "stop_reason": message.stop_reason,
            "usage": {"input_tokens": message.usage.input_tokens,
                      "output_tokens": message.usage.output_tokens},
        })
        return text

    def metrics(self) -> dict[str, Any]:
        return {"api_calls": self.calls, "budget": self.budget,
                "latency_ms": elapsed_ms(self.started),
                "input_tokens": self.input_tokens, "output_tokens": self.output_tokens}
