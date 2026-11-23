# ARCHITECTURE & UI CONTRACT — DÙNG CHO CẢ 8 DEMO

## A. Một app, một sidebar, tám module độc lập

- Frontend: Next.js App Router, TypeScript, Ant Design.
- Root layout (`app/layout.tsx`) chứa HTML shell; `(workspace)/layout.tsx` wrap AntD registry/config và `WorkspaceLayout`. Mọi route `/demos/*` ở cùng route group.
- Header: App title + backend online/offline + Claude model nếu configured; không lộ key.
- Sidebar: `Workspace Home` và demo đã implement. Link client-side để layout không unmount. Không cần Zustand/Redux.
- Main: chỉ render nội dung của selected demo; route có URL riêng có thể refresh và deep link. No iframe, no `window.location` full reload, no raw legacy page ngoài layout.

## B. Một trang demo tối giản

```text
03 — Tools & Registry                [Live Claude / Offline]    [Run state]
Một câu giới thiệu: Tool Calling là gì?
[Single Tool | Registry | Error]
[Input editable ..........................................]  [Run] [Reset]

Actual Result
  Claude answer / tool output / record đã đọc lại / error ...

Execution Events (real)
  1. User click Run
  2. Claude request → tool_use (tool name, arguments)
  3. Python execute function
  4. Send tool_result to Claude
  5. Final response

[Source & Debug ▾]
  file.py → function → 2–4 snippets → breakpoint → what to inspect
  [Request JSON] [Response JSON] nếu liên quan

Kết quả cần đạt
  1–3 ý để người xem tự giải thích lại cơ chế
```

### Hiển thị dữ liệu

- `Actual Result` hiển thị **kết quả backend trả**; nếu làm side effect phải read-back file/DB.
- `Execution Events` xuất phát từ runtime/backend hoặc các thời điểm browser thực đo và phân biệt rõ. Không dựng sự kiện `Claude called tool` khi backend chưa nhận được `tool_use`.
- `Raw JSON` thuộc debug và có thể collapse, mặc định đóng. `Latency`, `Tokens` chỉ hiển thị nếu đo/nhận được.
- `Cancel` chỉ hiện ở demo có long-running operation và **backend thực sự hủy**. Browser abort không đồng nghĩa task cancel.
- `Reset` phân biệt rõ **reset UI state** và **reset dữ liệu demo**; reset database có xác nhận.

## C. Backend minimal contracts

`backend/main.py`:

```python
from fastapi import FastAPI
from demos.demo_01_runtime.router import router as runtime_router

app = FastAPI()
app.include_router(runtime_router, prefix="/api/demos/01")
# Thêm router demo mới SAU KHI demo đó có code thật.
```

- Python `router.py`: khai báo endpoint, validate request, gọi logic demo.
- Python `runtime.py`, `messages.py`, `tool_calling.py`, `agent_loop.py`, v.v.: **không import FastAPI**; thuần logic.
- Event shape demo 01/04 (nếu SSE): `{type: string, ...payload}`. Dùng `run_finished` làm terminal event; error event khác final.
- Demo 02/03/05/06/07 ưu tiên REST và trả một `events` array theo **execution thực tế**; chỉ thêm SSE khi bài đó yêu cầu streaming.
- Không tạo general EventBus/PluginManager/abstract Tool class.

## D. Config & Secret

`backend/.env` (gitignored):

```dotenv
ANTHROPIC_API_KEY=...
LLM_MODEL=<model-id-hợp-lệ>
```

- Chỉ backend đọc key. Frontend gọi backend riêng, không trực tiếp Anthropic API.
- Từng demo có limit request, timeout, input length; không auto retry gây tăng chi phí nếu lesson không nghiên cứu retry.
- SDK/MCP library và version phải kiểm tra docs/runtime tương thích **tại lúc implementation**, không copy API signature từ bản ví dụ cũ.

## E. Task sandbox khi cần (từ Demo 04)

- Dùng Python `sqlite3` tiêu chuẩn, không ORM.
- `tasks(id INTEGER PRIMARY KEY, title TEXT, priority TEXT, status TEXT, demo_scope TEXT)`; thêm field chỉ khi use case thật sự đòi hỏi.
- Một DB `backend/data/tasks.sqlite3` bị ignore; scope như `manual_loop`, `mcp`, `agent_sdk` để các demo không đụng nhau.
- API đọc task phải phản ánh dữ liệu thực; reset chỉ xóa theo `demo_scope`, có xác nhận.
- Đường dẫn file demo (nếu có) chỉ trong `backend/data/workspace/` với path validation, không cho traversal hoặc đụng `.env`.
- Mọi hành động ghi có approval rõ ràng hoặc user explicit confirmation; tránh tự thực hiện khi người xem không biết.

## F. Speaker-friendly code

- Mỗi demo 1 file logic chính, 1 router; thêm tối đa vài file phụ nếu thật sự cần.
- Bảng source code: `Entry → Function → Khi nào chạy → Expected state`.
- Cho người xem nhìn thấy **5 điểm**: input, API/function, decision point, result, conclusion.
- Không dành phần lớn thời gian cho `page.tsx`/CSS; tập trung Python và cách flow nối với FE.

## G. Scope control

**KHÔNG**: 36 lesson, quiz, knowledge checkpoint dạng trắc nghiệm, dashboard học tập, NovaDev support, task manager sản phẩm thương mại, login, RBAC, Docker, Redis, Celery, PostgreSQL, vector DB, multi-tenant, telemetry platform, e2e suite lớn. Chỉ thêm khi có yêu cầu riêng.

## H. Review để chuyển demo

Sau khi hoàn thành NN, Claude báo:

1. Demo chạy được theo URL nào, chọn scenario nào, bấm gì và thấy gì.
2. File Python nào thực thi code, breakpoint nào.
3. Kết quả đã kiểm chứng bằng cách nào; nếu offline/live chưa verify, ghi rõ.
4. File thay đổi mới/xóa/migrate và lý do.
5. 1–3 ý **Kết quả cần đạt** để người dùng nói khi sharing.
6. Dừng, **không làm demo tiếp theo**.
