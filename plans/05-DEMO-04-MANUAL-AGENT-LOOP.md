# PLAN 04 — MANUAL AGENT LOOP

**URL:** `/demos/04-manual-loop`  
**Domain:** 1.1 Agent Architecture; 1.2 Agent Construction with Claude; 2.5 Application Design.  
**Một câu:** Model quyết định phải gọi tool thêm hay đã xong; Python điều khiển vòng lặp và giới hạn an toàn.

## 1. Đối tượng học

Demo 03 chỉ làm một tool round. Demo 04 bổ sung **loop** nhiều model turns, messages history và `MAX_TURNS`. Có SQLite Task Manager nhỏ để kết quả nhìn thấy được. Không build Task Board product đầy đủ.

## 2. Ba scenario

| Scenario | Input | Người xem thấy |
|---|---|---|
| Normal | "Nếu chưa có task Login, hãy tạo task ưu tiên high" | Claude gọi `list_tasks`, cân nhắc `create_task`, chờ approve nếu có ghi, rồi final; task xuất hiện trong SQLite khi được duyệt |
| Max Turns | Chọn giới hạn `1` và prompt cần nhiều bước | Khi hết lượt không có final hợp lệ → trả trạng thái `max_turns_reached` rõ ràng, không tự nói đã xong |
| Tool Failure / Rollback | Trigger tool đọc task ID không tồn tại | `tool_result(is_error=True)` hoặc fail theo chính sách, history chỉ commit sau run hoàn chỉnh; database side effects đã xảy ra **không tự rollback** |

Không ép model phải có đúng ba turns. UI log chính xác turns model thực tế. `MAX_TURNS` là giới hạn an toàn, không phải guarantee output tốt.

## 3. File ownership

```text
backend/shared/task_store.py                # Tạo từ demo này (sqlite3, demo_scope)
backend/demos/demo_04_manual_loop/
├── router.py                            # POST runs, GET tasks, reset scoped data
└── agent_loop.py                        # loop + message append + tool dispatch
frontend/src/app/(workspace)/demos/04-manual-loop/
├── page.tsx
└── api.ts
```

Nếu cần approvals lúc chạy, ưu tiên reuse `ApprovalBroker` được **trích ra `backend/shared/approval.py` với diff nhỏ**; không import toàn bộ router/runtime Demo 01. Chỉ tạo abstraction này khi có nhu cầu thật.

## 4. Flow cần thể hiện

```text
User → working_messages (copy from committed_history)
    → Claude #1 → tool_use(list_tasks) → Python SELECT → tool_result
    → Claude #2 → tool_use(create_task) → human Approve → Python INSERT → tool_result
    → Claude #3 → end_turn → validate final → committed_history = working_messages
                                  └─ cancel/fail/limit → không commit
```

Lưu ý flow trên là **một kịch bản khả thi**, không hardcode model chắc chắn gọi đúng thứ tự. Nếu model gọi ít/nhiều tool hơn, show actual trace.

## 5. Code trọng tâm

```python
working_messages = copy.deepcopy(committed_history)
```

```python
for turn in range(max_turns):
    response = await call_claude(working_messages, tools)
    if response.stop_reason == "end_turn":
        # validate complete output, then commit
        return result
    if response.stop_reason == "tool_use":
        # append exact assistant tool_use and matching user tool_result
        # then continue
        ...
```

```python
# Commit only after success; cancelled/failed run must not commit partial history.
```

## 6. UI

- Segmented `Normal | Max Turns | Tool Failure`.
- Prompt editable; `max_turns` setting nhỏ; Run, Cancel nếu backend hỗ trợ cancel thật, Approve nếu đang chờ write.
- Actual Result: final answer, table tasks đọc thật từ DB, `history_before/history_after` counts.
- Execution Events: mỗi `Claude request #n`, `stop_reason`, `tool_use`, `tool_result`, `approval`, `commit` hoặc `rollback`.
- Source: `agent_loop.py` & `task_store.py` với breakpoint trên call_claude, tool result, commit.

## 7. Safety / correctness

- `create_task` state-changing cần permission hoặc user explicit confirmation trước khi ghi. Fail closed.
- Dùng SQLite chuẩn với schema nhỏ, `demo_scope = manual_loop`.
- `Reset Data` chỉ clear scope này, hỏi xác nhận.
- **Rollback history ≠ rollback side effect**; UI phải nói rõ nếu task đã ghi trước khi loop fail.
- Không infinite loop, timeout có giới hạn, bound token/cost.
- Response phải đạt điều kiện dừng hợp lệ; `max_tokens`/unexpected stop_reason không được chấp nhận làm final.

## 8. Verify

- Normal có ít nhất một trường hợp thực tế đọc task và tạo task được sau approval, read-back xác nhận ID/status.
- Run lại: list_tasks phản ánh task đã có, tránh tạo trùng dựa trên chính sách.
- Max Turns trả lỗi giới hạn, không lẫn với success.
- Tool Failure được xử lý rõ, không commit history sai; UI show side effect warning khi liên quan.
- Nhiều lần run cùng session không mất history, cancel không để Future rò rỉ.

## 9. Kết quả cần đạt

1. Tự mô tả vòng lặp `Claude → tool_use → execute → tool_result → Claude` cho đến `end_turn`.
2. Hiểu vì sao cần `MAX_TURNS`, stop_reason validation và committed/working history.
3. Hiểu phân biệt rollback hội thoại và rollback side effects trong DB.

## 10. Prompt giao Claude

```text
Đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và plans/05-DEMO-04-MANUAL-AGENT-LOOP.md.
Chỉ implement Demo 04 trong folder riêng, với SQLite task thật và approvals khi ghi.
Làm một vòng loop tối giản: normal/max turns/tool error, có history commit safety.
Không tạo task app đầy đủ, không SDK, không MCP. Trace theo API/tool thật.
Verify run + readback + failure, cập nhật README, giải thích 4 code điểm, dừng.
Không commit/push.
```
