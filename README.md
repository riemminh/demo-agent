# AI Agent Demo Workspace — Claude Agent mechanics, chạy thật

Workspace gồm **8 demo tương tác** (mục tiêu Phase 1). Mỗi demo có vài scenario: chọn scenario, bấm Run, xem **Actual Result** → **Execution Events** → **Source & Debug** → **Kết quả cần đạt**. Không quiz, không lesson progress.

Source of truth: `plans/00-START-HERE.md` + `plans/01-SHARED-ARCHITECTURE-UI.md` + một plan cho mỗi demo (`plans/02-…` → `plans/09-…`). Mỗi lượt chỉ làm một plan rồi dừng để review.

Stack: Python + FastAPI (backend, port 9000) · Next.js 16 App Router (Turbopack) + TypeScript + Ant Design v6 (frontend, port 3001).

**Trạng thái hiện tại:** **Demo 01 — Agent Runtime** và **Demo 02 — Claude API** chạy được. Demo 03–08 chỉ nằm ở Roadmap trên Workspace Home (không route, không lên sidebar).

## Setup

### Backend

Cần [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
cp .env.example .env      # Demo 01 KHÔNG cần key; từ Demo 02 mới cần
uv run uvicorn main:app --reload --port 9000
```

- Entry point là `backend/main.py` (`main:app`), không còn `api:app`.
- `config.py` gọi `load_dotenv(backend/.env)` tường minh; uvicorn không tự đọc `.env`. Sửa `.env` xong phải **restart** (`--reload` chỉ theo dõi file `.py`).
- Session/Future của Demo 01 nằm trong RAM process, nên chạy **một** worker.
- Thêm dependency: `uv add <package>`.
- **Lỗi `connection_error` dù `curl https://api.anthropic.com` vẫn ra?** OpenSSL của Python (4.1.0 trên máy này) gửi key share post-quantum `X25519MLKEM768`; một số mạng/proxy reset handshake đó. Chạy backend với một OpenSSL config chỉ dùng group cổ điển:
  ```bash
  # file .cnf: openssl_conf → ssl_conf → system_default: Groups = X25519:P-256:P-384
  OPENSSL_CONF=/path/to/openssl-classic-groups.cnf uv run uvicorn main:app --reload --port 9000
  ```
  Chỉ là workaround môi trường, không đổi code. Đã dùng đúng cách này khi live-verify Demo 02.

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3001
npm run typecheck    # tsc --noEmit (project chưa dùng ESLint)
npm run build
```

Backend URL mặc định `http://localhost:9000`; đổi bằng `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://...`.

## Cấu trúc

```text
backend/
├── main.py                       # app + CORS + /api/health + include_router
├── config.py                     # ANTHROPIC_API_KEY, LLM_MODEL, limits
├── data/                         # gitignored: sandbox runtime (file demo ghi ra)
├── demos/demo_01_runtime/
│   ├── router.py                 # endpoint /api/demos/01/*
│   ├── runtime.py                # run_turn() (Task + Queue) + run_agent() ba scenario
│   ├── approval_note.py          # file sandbox: build/write/read/delete
│   ├── sessions.py               # Session + SessionStore (RAM)
│   └── approvals.py              # ApprovalBroker (asyncio.Future)
└── demos/demo_02_claude_api/
    ├── router.py                 # endpoint /api/demos/02/*
    ├── messages.py               # build_request + messages.create + parse content/usage
    └── streaming.py              # messages.stream -> event text_delta/final
frontend/src/
├── components/                   # WorkspaceLayout (Header+Sider+Content), DemoMenu, CodeBlock, LearningOutcome
├── lib/demos.ts                  # metadata 8 demo; chỉ demo có `route` lên sidebar
└── app/(workspace)/
    ├── layout.tsx                # AntdRegistry + Providers + WorkspaceLayout (persistent sidebar)
    ├── workspace/page.tsx        # Workspace Home + Roadmap
    ├── demos/01-runtime/         # page.tsx, use-run.ts, api.ts, content.ts + 4 component con
    └── demos/02-claude-api/      # page.tsx, use-claude.ts, api.ts, content.ts + 5 component con
```

Quy tắc: `main.py` chỉ import router của demo **đã có code**; mỗi `demo_XX/` tự sở hữu API, logic và sample data của mình (`plans/00-START-HERE.md`, mục 3).

## Routes

| URL | Nội dung |
|---|---|
| http://localhost:3001/workspace | **Workspace Home**: trạng thái backend/Claude, demo chạy được, Roadmap 02–08 (chỉ text) |
| http://localhost:3001/demos/01-runtime | **01 · Agent Runtime**: scenario `SSE` · `Approval` · `Cancel` |
| http://localhost:3001/demos/02-claude-api | **02 · Claude API**: scenario `One-shot` · `History On/Off` · `Streaming` |
| http://localhost:9000/docs | OpenAPI |

`/` redirect 307 về `/workspace` (`frontend/next.config.ts`). Sidebar chỉ có Workspace Home + demo đã implement (`frontend/src/lib/demos.ts`: demo có `route`).

## Backend API

| HTTP | Endpoint | Body / Response |
|---|---|---|
| GET | `/api/health` | `{ok, llm_configured, missing_env[], model, max_tokens_cap, timeout_seconds}`. Không gọi Claude, không trả key. |
| POST | `/api/demos/01/sessions` | `{id}` — session trong RAM. |
| GET | `/api/demos/01/sessions/{id}` | `{id, history, busy}`. |
| POST | `/api/demos/01/sessions/{id}/runs` | Body `{text: 1–500 ký tự, scenario: sse\|approval\|long}` → SSE `data: {type, ...}`. Session đang chạy: **409**. |
| POST | `/api/demos/01/sessions/{id}/approvals/{approval_id}` | Body `{approved: bool}` → `{resolved: true}`; approval không còn chờ: **404**. |
| POST | `/api/demos/01/sessions/{id}/cancel` | `{cancelled: bool}` — gọi `Task.cancel()` ở backend. |
| GET | `/api/demos/01/file` | Đọc lại file sandbox từ disk: `{path, exists, content, size_bytes, modified_at}`. |
| DELETE | `/api/demos/01/file?confirm=true` | Xóa file sandbox của riêng demo 01; thiếu `confirm`: **400**. |
| POST | `/api/demos/02/messages` | Body `{messages: [{role: user\|assistant, content: 1–4000}] (1–10 turn, turn cuối phải là user), system?: ≤2000, max_tokens?: 1–LLM_MAX_TOKENS}`. Response `{status, request, response, answer, request_id, metrics{api_calls, latency_ms, input_tokens, output_tokens}, error{kind, message, upstream_status}}`. |
| POST | `/api/demos/02/messages/stream` | Cùng body → SSE: `request_sent → text_delta ×n → final → run_finished` (lỗi thì `error` trước `run_finished`). |

HTTP status của Demo 02: `200` thành công · `422` input sai (prompt rỗng, `max_tokens` vượt trần, turn cuối không phải user) · `503` thiếu `ANTHROPIC_API_KEY`/`LLM_MODEL` (không gọi Claude, `api_calls = 0`) · `502` Anthropic trả 4xx/5xx hoặc không kết nối được · `504` timeout. Endpoint stream luôn trả `200` rồi báo lỗi bằng event `error`, vì response đã bắt đầu stream.

## 01 · Agent Runtime — SSE · Approval · Cancel

Agent trong `demos/demo_01_runtime/runtime.py` là **kịch bản có kiểm soát**: không gọi Claude, thời gian mô phỏng bằng `asyncio.sleep`. Cơ chế Task / Queue / SSE / Future / Cancel và file ghi ra là **thật**. Mở trang chỉ `POST /sessions`, không tự chạy agent.

| Scenario | Bấm | Kết quả mong đợi (event thật) |
|---|---|---|
| SSE | Start SSE | `run_started → tool_call → tool_result → text_delta ×4 → final → run_finished`, đến từng đợt trong ~3 s |
| Approval → Approve | Start Approval → Approve | `approval_required → approval_decision → permission(allow) → tool_result → final`; backend ghi `backend/data/workspace/approval-note.md`, card File sandbox đọc lại từ disk (exists, size, nội dung) |
| Approval → Reject | Start Approval → Reject | `permission(deny)` + `tool_result(is_error)`; read-back cho thấy file **không** được tạo. Không trả lời trong 120 s thì broker fail closed (reject) |
| Approval → Cancel | Start Approval → Cancel Agent khi đang chờ | `approval_required → error(kind=cancelled) → run_finished` |
| Cancel | Start Long Running → Cancel Agent | `progress ×n → error(kind=cancelled) → run_finished`, không có `final`, `history` vẫn rỗng |

Flow: `page.tsx` `start()` → `use-run.ts` → `api.ts` `startRun()` → `POST /api/demos/01/sessions/{id}/runs` → `router.py` `start_run()` gọi `asyncio.create_task(run_turn(...))` → `runtime.py` `run_agent()` gọi `emit()` → `queue.put_nowait()` → `stream()` `await queue.get()` → `yield "data: ...\n\n"` → browser `reader.read()` → `handleEvent()` cập nhật React state. Approve/Reject: `decide()` → `POST /approvals/{id}` → `ApprovalBroker.resolve()` → `future.set_result()` → agent chạy tiếp và ghi file. Cancel: `POST /cancel` → `session.task.cancel()`.

Breakpoints (Ctrl+F đúng đoạn code; UI hiện cùng danh sách ở Source & Debug):

| # | Vị trí | Quan sát |
|---|---|---|
| BP1 | `demo_01_runtime/router.py` `task = asyncio.create_task(run_turn(...))` (và `await asyncio.wait_for(queue.get(), ...)`) | handler trả StreamingResponse ngay, agent chạy trong Task riêng |
| BP2 | `demo_01_runtime/runtime.py` `queue.put_nowait(event)` | producer: mỗi event vào Queue của đúng run đó |
| BP3 | `demo_01_runtime/approvals.py` `approved = await asyncio.wait_for(future, ...)` | agent dừng tới khi `/approvals` resolve Future, hoặc timeout 120 s |
| BP4 | `demo_01_runtime/router.py` `session.task.cancel()` | `run_turn()` vào `except asyncio.CancelledError`, không commit history |
| BP5 | `demos/01-runtime/api.ts` `await reader.read()` | chunk SSE → tách khung `data:` → `onEvent` |

Giới hạn: không persistence, không auth; rời trang lúc đang chạy chỉ đóng stream ở browser, Task backend vẫn chạy tới khi xong hoặc bị Cancel. File sandbox dùng **path cố định** (`backend/data/workspace/approval-note.md`), browser không gửi path nào vào backend.

## 02 · Claude API — One-shot · History On/Off · Streaming

Gọi **Claude Messages API thật** bằng key ở `backend/.env`; không tool call, không Agent Loop, không SQLite. Mỗi lần Send là đúng **một** HTTP request (`max_retries=0`). `thinking: {"type": "disabled"}` vì model đang cấu hình bật extended thinking mặc định và thinking token ăn vào `max_tokens`, có thể làm response không còn block `text`.

| Scenario | Bấm | Kết quả mong đợi |
|---|---|---|
| One-shot | chọn preset → `Send` | answer text thật + `stop_reason`, `input/output_tokens`, latency đo thật; Request/Response JSON trong Source & Debug |
| History On/Off | Send câu 1 ("Tôi đang học Python") → Send câu 2 ("Tôi vừa nói mình đang học gì?") với công tắc history ON và OFF | OFF: `messages[]` chỉ 1 turn, Claude nói không biết. ON: `messages[]` 3 turn, Claude trả lời đúng, `input_tokens` tăng (đo thật: 105 vs 23) |
| Streaming | `Start Streaming` | text hiện dần theo từng `text_delta`; `final` mang `usage` + `stop_reason`; text ghép từ delta khớp `final.answer` |

Đặt `max_tokens = 16` trong Advanced để thấy `stop_reason = max_tokens` thật (không hardcode). Output của model có thể khác nhau mỗi lần; cái cần so sánh là **input** (`messages[]`) và các field của response.

Flow: `page.tsx` `send()` ghép `messages[]` → `use-claude.ts` → `api.ts` `sendMessages()` / `streamMessages()` → `router.py` validate (Pydantic + trần `LLM_MAX_TOKENS`) → `messages.py` `build_request()` → `client.messages.create()` → `answer_text()` ghép block `text`. Streaming: `streaming.py` `stream_events()` lặp `stream.text_stream` rồi `get_final_message()` → `router.py` đóng khung `data: {...}` → browser `reader.read()`.

Breakpoints: `messages.py` `build_request()` (body thật, không có key) · `messages.py` `await client.messages.create(...)` (điểm duy nhất gọi API) · `messages.py` `answer_text()` (`content` là list block; xem `stop_reason`, `usage`) · `streaming.py` `async for text in stream.text_stream` (tầng Claude→Python, khác tầng Python→browser).

Giới hạn: tối đa 10 turn/request, `content` ≤ 4000 ký tự, `system` ≤ 2000, `max_tokens` ≤ `LLM_MAX_TOKENS`. Chưa có Cancel cho streaming: browser đóng stream **không** đồng nghĩa backend hủy request, nên UI không hiển thị nút Cancel.

## Implementation status (thực tế)

| # | Demo | Status | Ghi chú |
|---|---|---|---|
| 01 | Agent Runtime | Xong | Smoke test API pass: SSE tăng dần, Approve ghi file thật, Reject không ghi, Cancel lúc sleep và lúc chờ approval, double start → 409, cancel ngay sau start không treo stream, `DELETE /file` thiếu confirm → 400. Frontend: `npm run build` + `typecheck` pass, `/demos/01-runtime` render 200. |
| 02 | Claude API | Xong — **live verified** | 21/21 check pass với model `claude-haiku-5-5` thật: one-shot `stop_reason=end_turn` (34 in / 115 out tokens), History OFF 1 turn vs ON 3 turn (input_tokens 23 → 105, câu trả lời đổi hẳn), streaming nhiều `text_delta` trước `final` và text ghép khớp `final.answer`, `max_tokens=16` → `stop_reason=max_tokens`, 4 case validate → 422. Frontend build/typecheck pass, `/demos/02-claude-api` render 200. |
| 03–08 | Tools & Registry, Manual Loop, Structured Output, Workflows, MCP, Agent SDK | Chưa triển khai | Chỉ ở Roadmap trên Workspace Home. |

Đã bỏ ở lượt rebuild Demo 01: `backend/api.py`, `agent.py`, `sessions.py`, `approvals.py` ở gốc (chuyển vào `demos/demo_01_runtime/`), `backend/playground_api.py` + `backend/lessons/` và page `app/(workspace)/claude-api/` của bản Claude API cũ (viết lại trong `demos/demo_02_claude_api/`), `PlaygroundShell` (đổi tên `WorkspaceLayout`), các redirect URL legacy `/playground`, `/approval`, `/lessons/messages-api`.
