# PLAN 02 — CLAUDE API

**URL:** `/demos/02-claude-api`  
**Domain:** 1.2 Agent Construction with Claude; 2.3 Claude API Mechanics.  
**Một câu:** Trước khi có Agent Loop, ứng dụng cần hiểu request, response và streaming thật của Claude.

## 1. Scope

Dùng Claude Messages API thật, API key từ `backend/.env`. **Không tool call, không Agent Loop, không SQLite**.

## 2. Ba scenario trong đúng một trang

| Scenario | Tương tác | Người xem quan sát |
|---|---|---|
| One-shot | Nhập prompt, `Send` | response text, `stop_reason`, usage, latency, raw request/response |
| History On/Off | Gửi câu 1: "Tôi học Python" rồi hỏi: "Tôi học gì?"; bật/tắt history | `messages` của request 2 có/không có history; model không có memory mặc định |
| Streaming | Nhập prompt, `Start Streaming` | text xuất hiện từng chunk, final message và usage khi kết thúc |

**Không ép Claude nói một output cố định:** chỉ cần đối chiếu input có lịch sử hay không; chú thích output model có thể thay đổi. Với `max_tokens` nhỏ, quan sát `max_tokens` stop reason nếu thực tế xảy ra; không hardcode.

## 3. File ownership

```text
backend/demos/demo_02_claude_api/
├── router.py         # POST one-shot, history, stream
└── messages.py       # call Claude + parse content/usage
frontend/src/app/(workspace)/demos/02-claude-api/
├── page.tsx          # Scenario, input, result, events, source
└── api.ts            # REST + fetch streaming
```

Được phép copy những đoạn tối giản của Messages API hiện tại nhưng **không kéo theo tám component nhỏ của lesson cũ**. Dùng `AsyncAnthropic` phù hợp với phiên bản dependency và model config thật.

## 4. Backend flow

```text
One-shot: UI → POST → messages.create → Message(content[], stop_reason, usage) → UI
History:  request #1 → save frontend demo history → request #2 with/without messages
Streaming: UI → POST SSE → messages.stream → text_delta → SSE → UI → final
```

- Backend logs trace (thời gian thực) nhưng không invent intermediate tool events.
- Khi streaming kết thúc, lấy final message để có `usage`, `stop_reason` đúng. Nếu browser đóng stream, không claim backend auto cancel; nếu muốn Cancel phải implement thật hoặc chưa hiển thị.
- `max_retries=0` cho One-shot để mỗi lần run không âm thầm tạo nhiều API request.
- Text ghép từ block `text`, không giả định `content` là một string.
- Xử lý thiếu key, lỗi model, timeout, lỗi upstream có trạng thái rõ ràng, không log key.

## 5. UI

**Segmented:** `One-shot | History | Streaming`.  
**Input:** prompt editable, có preset `Tạo task description` và `Viết email`; Advanced (collapsed) cho system/max_tokens.  
**Actual Result:** text thật, copy được; History mode có hai request để so sánh.  
**Execution Events:** request start/response received + SSE delta khi streaming, không dựng tool call giả.  
**Source & Debug:** request/response JSON, file/functions, 3 breakpoint.  
**Kết quả cần đạt:** 3 ý cuối trang.

## 6. Code cốt lõi

```python
message = await client.messages.create(model=model, max_tokens=512, messages=messages)
```

```python
text = "".join(block.text for block in message.content if block.type == "text")
```

```python
async with client.messages.stream(...) as stream:
    async for delta in stream.text_stream:
        emit({"type": "text_delta", "text": delta})
    final = await stream.get_final_message()
```

## 7. Verify

- Có API key: gửi one-shot thành công, token/stop reason lấy từ response thật.
- History OFF request 2 không chứa previous turns; ON có previous turns hợp lệ.
- Streaming text render trước final; event cuối có usage lấy từ final.
- Key thiếu: hướng dẫn cấu hình, UI không fake output.
- `max_tokens` nhỏ: phản ánh stop reason thực tế.
- Sidebar giữ nguyên qua URL direct/refresh.

## 8. Kết quả cần đạt

1. Tự phân biệt `system`, `messages`, roles, content blocks, stop_reason, usage.
2. Hiểu Messages API **stateless** và ứng dụng chịu trách nhiệm truyền history.
3. Phân biệt streaming Claude→Python với SSE Python→Browser.

## 9. Prompt giao Claude

```text
Đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và 03-DEMO-02-CLAUDE-API.md.
Chỉ implement Demo 02 theo shared layout đã có, dùng Claude API thật.
Ba mode One-shot, History On/Off, Streaming; hiển thị result/events/request thật.
Không tool call/SQLite/Manual Loop. Kèm 3 breakpoint và kết quả cần đạt.
Test, cập nhật README, báo live/offline verification, DỪNG. Không commit/push.
```
