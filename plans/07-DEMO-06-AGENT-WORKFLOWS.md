# PLAN 06 — AGENT PATTERNS & WORKFLOWS

**URL:** `/demos/06-workflows`  
**Domain:** 1.3 Agent Patterns and Frameworks.  
**Một câu:** Không phải mọi bài toán đều cần Agent tự quyết định; phải chọn workflow phù hợp.

## 1. Scope

**Một page, năm scenario**. Mỗi scenario ngắn và có thể chạy Claude API thật; không cần xây 5 trang, 5 backend services hay một orchestrator framework. Mỗi workflow có *giới hạn số API calls/worker* để tránh phát sinh chi phí demo.

## 2. Scenario và nhiệm vụ minh họa

| Scenario | Business example | Bước thực tế |
|---|---|---|
| Chaining | Viết mô tả task rõ ràng | Draft → Improve (hai LLM calls theo thứ tự do code quy định) |
| Routing | User nhập tiếng Việt tự do | Classify intent `draft_task / summarize / translate` → Python chọn handler/LLM prompt |
| Parallelization | Hai yêu cầu dự án độc lập | `asyncio.gather()` phân tích đồng thời hai yêu cầu; aggregate kết quả |
| Orchestrator–Workers | Lập kế hoạch tính năng Login | Claude Planner quyết định tối đa **2 subtask**; Python chạy workers → combine outputs |
| Evaluator–Optimizer | Cải thiện mô tả task | Generator → Evaluator → tối đa **1 revision**, accept/reject theo feedback |

Không đồng nhất Orchestrator–Workers thủ công với SDK Subagents của Demo 08. Workflows là *application control flow* có thể viết bằng Python + Claude API.

## 3. File ownership

```text
backend/demos/demo_06_workflows/
├── router.py         # POST /run {scenario,input}
└── patterns.py       # 5 async functions rất ngắn, mỗi hàm một pattern
frontend/src/app/(workspace)/demos/06-workflows/
├── page.tsx
└── api.ts
```

Một `patterns.py` là đủ ở giai đoạn này. Nếu nó vượt mức dễ đọc, chỉ sau đó mới tách theo pattern.

## 4. Flow, trace và UI

**UI:** `Chaining | Routing | Parallel | Orchestrator | Evaluator`, text input + Run; main result + từng step có `input/output` rút gọn + latency/calls thật.  
**Trace:** mỗi bước có loại (LLM/Code), thứ tự thực tế, số calls, latency, quyết định; phân biệt kết quả model với code branch.  
**Source:** 5 hàm với 1–2 breakpoint được chọn theo scenario đang chạy; không show cả patterns.py nếu dài.  
**Kết quả cần đạt:** thông điệp chọn workflow theo yêu cầu.

## 5. Code then chốt

```python
first = await call_claude(step1_prompt)
second = await call_claude(step2_prompt(first))   # Chaining
```

```python
a, b = await asyncio.gather(analyze(doc_a), analyze(doc_b))
```

```python
plan = await planner(user_request)
for subtask in plan.subtasks[:2]:  # bounded dynamic work
    results.append(await worker(subtask))
```

```python
for revision in range(2):   # Initial + at most one improvement
    draft = await generate(feedback)
    feedback = await evaluate(draft)
    if feedback.accepted: break
```

Các code snippet chỉ thể hiện cơ chế; implementation thật phải định nghĩa đầy đủ types/logic và budget.

## 6. Correctness / constraints

- Dùng Claude calls thật, không hardcode "planner decided" hoặc LLM scores.
- Routing branch xác định bằng kết quả classifier thật; nếu không xác định, hiển thị fallback an toàn.
- Parallel chạy đồng thời các call độc lập, log tổng latency để so sánh với sequential nếu cần.
- Orchestrator cap 2 workers; Evaluator cap 1 revision; total API calls có upper bound để tránh cost bùng nổ.
- Không cho 5 patterns tự ý ghi SQLite; output chỉ text/structured summaries.
- Không khẳng định model evaluation luôn khách quan hay đảm bảo chất lượng.

## 7. Verify

- Mỗi pattern chạy ít nhất một happy case với Claude thật (nếu có key) và 1 failure path hợp lý.
- Trace cho thấy Chaining tuần tự, Parallel có hai tasks overlapping, Routing có branch, Orchestrator có plan/subtasks, Evaluator có feedback.
- Budget/caps thực sự được enforce, không chỉ viết trong UI.

## 8. Kết quả cần đạt

1. Phân biệt developer-controlled workflow với model-decided steps.
2. Hiểu năm pattern và chọn pattern đúng theo cost, latency, độ linh hoạt.
3. Thấy concurrency/feedback qua trace thật, không phải sơ đồ tĩnh.

## 9. Prompt giao Claude

```text
Đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và plans/07-DEMO-06-AGENT-WORKFLOWS.md.
Chỉ implement Demo 06: 1 page, 5 scenario, các async function nhỏ trong patterns.py.
Claude API thật, log step/calls/latency thực, giới hạn cost/worker/revisions.
Không framework orchestrator, không subagents SDK, không thêm DB.
Test & hướng dẫn chọn pattern, dừng; không commit/push.
```
