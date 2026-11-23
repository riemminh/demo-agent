# PLAN 03 — TOOL CALLING & REGISTRY

**URL:** `/demos/03-tools`  
**Domain:** 8.1 Tool Implementation; 1.2 Agent Construction with Claude.  
**Một câu:** Claude quyết định **yêu cầu gọi tool**, Python mới thực thi và trả kết quả về Claude.

## 1. Scope rõ ràng

Một **tool round**: gọi Claude lần 1 → nhận `tool_use` → thực thi tools → gửi `tool_result` → gọi Claude lần 2 để nhận final. **Chưa có loop nhiều iteration** (để Demo 04 dạy). Không cần DB/file.

## 2. Ba scenario

| Scenario | Prompt mẫu | Hành vi thực |
|---|---|---|
| Single Tool | "Tính tổng 120000 + 85000 + 45000" | Claude trả `tool_use(sum_numbers)`; Python tính `250000`; gửi result; Claude final |
| Registry | "Đếm số từ trong câu..." hoặc "Tính tổng..." | Registry chứa `sum_numbers`, `count_words`; Claude chọn tên, Python dispatch theo tên và input |
| Tool Error | "Chia 10 cho 0 bằng tool divide_numbers" | Python thực thi phép chia gây lỗi được kiểm soát; `is_error=true` trả cho Claude, Claude giải thích lỗi |

**Chú ý:** Single & Error có thể ép `tool_choice` theo phiên bản API hỗ trợ để minh họa protocol; Registry dùng `auto` để **quan sát quyết định thật**. Nếu Claude không gọi tool khi `auto`, hiển thị thực tế đó; không fake `tool_use`.

## 3. File ownership

```text
backend/demos/demo_03_tools/
├── router.py         # POST /run
├── tools.py          # sum_numbers, count_words, divide_numbers
├── registry.py       # TOOL_REGISTRY + execute(name, input)
└── tool_calling.py   # Claude request #1, execute, request #2
frontend/src/app/(workspace)/demos/03-tools/
├── page.tsx
└── api.ts
```

## 4. Code trọng tâm

```python
def sum_numbers(numbers: list[int]) -> int:
    return sum(numbers)
```

```python
TOOL_REGISTRY = {
    "sum_numbers": sum_numbers,
    "count_words": count_words,
    "divide_numbers": divide_numbers,
}
```

```python
function = TOOL_REGISTRY.get(tool_name)
if function is None:
    return {"is_error": True, "content": "Unknown tool"}
result = function(**validated_input)
```

```python
# Send original assistant content (including tool_use), followed by user tool_result
# with matching tool_use_id; only then call Claude again for final.
```

**Giải thích:** Tool schema là lời mô tả cho model; registry là code Python; hai thứ không giống nhau.

## 5. UI

- Chọn `Single Tool | Registry | Error` và prompt editable, bấm Run.
- Actual Result: số do Python tính / text Claude trả / error.
- Event Timeline: `messages.create(#1)` → `tool_use {id,name,input}` → registry lookup → Python result → `tool_result {tool_use_id,is_error}` → `messages.create(#2)` → final.
- `Source & Debug`: chỉ `tools.py`, `registry.py`, `tool_calling.py` và 2–4 breakpoints.
- Metrics chỉ hiển thị response usage và số API call thật (thường 2, có thể khác nếu model không tool call).

## 6. Quan trọng cho correctness

- Validate tool input bằng Pydantic hoặc kiểm tra kiểu tối thiểu; không nhận bất kỳ Python function tùy ý theo input model.
- Cấm eval/exec, không dynamic import từ tool name.
- `tool_use_id` phải match đúng block khi gửi tool_result; tool_result được đặt đúng vai trò/format của Anthropic SDK.
- Nếu nhiều tool_use blocks cùng trả trong lần #1, xử lý mọi block hoặc giới hạn có nhãn; không bỏ silently.
- Bắt tool exception, trả error như dữ liệu, không lộ traceback nhạy cảm trên UI.

## 7. Verify

- Single Tool tính đúng `250000`; event và request cho thấy Claude tool_use thật.
- Registry `sum_numbers` vs `count_words` dispatch đúng theo prompt/test; trường hợp không dùng tool cũng hiển thị đúng.
- Divide by zero tạo tool error thật, API không crash; Claude phản hồi sau tool_result.
- Raw body có tool schema, assistant tool_use và user tool_result; không lộ key.
- Demo 01, 02 còn chạy bình thường.

## 8. Kết quả cần đạt

1. Phân biệt **Claude chọn tool** với **Python thực thi tool**.
2. Hiểu `tool_use`, `tool_result`, `tool_use_id`, schema và registry.
3. Biết tool error khác với Claude API error và cách xử lý an toàn.

## 9. Prompt giao Claude

```text
Đọc plans/00-START-HERE.md + plans/01-SHARED-ARCHITECTURE-UI.md + plans/04-DEMO-03-TOOL-CALLING-REGISTRY.md, kiểm tra source.
Chỉ làm Demo 03: Single, Registry, Error trong cùng page, dùng Claude API thật.
Không Manual Agent Loop; tối đa một tool round, không SQLite.
Tool thực thi thật, trace từ call thực tế. Dùng 2–4 snippet code để giải thích.
Test live nếu có key; báo chưa verify nếu không. Dừng, không commit/push.
```
