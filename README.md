# AI Agent Demo Workspace — Claude Agent mechanics, chạy thật

Workspace gồm **8 demo tương tác** (mục tiêu cuối), mỗi demo có vài scenario: chọn scenario, bấm Run, xem Actual Result, Execution Events, Source Code ở breakpoint, rồi đọc Kết quả cần đạt. Source of truth: `refactor-plan-8-demos.md` (thay cách chia 36 lesson của `plan-v2.md` / `plan-v3-feature-first.md`). Hiện đã xong **Phase A — Navigation & Shared Layout**.
Stack: Python + FastAPI (backend, port 9000) · Next.js 16 App Router (Turbopack) + TypeScript + Ant Design v6 (frontend, port 3001).

## Setup

### Backend

Cần [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
cp .env.example .env   # nếu đã có backend/.env.example; nếu chưa, tạo .env theo mẫu dưới
# backend/.env (không commit) gồm:
#   ANTHROPIC_API_KEY=<key của bạn>
#   LLM_MODEL=<model ID, xem https://docs.claude.com/en/docs/about-claude/models>
#   LLM_MAX_TOKENS=1024        # trần max_tokens UI được gửi (tùy chọn)
#   LLM_TIMEOUT_SECONDS=30     # timeout gọi Claude (tùy chọn)
uv run uvicorn api:app --reload --port 9000
```

- `config.py` gọi `load_dotenv(backend/.env)` tường minh; uvicorn không tự đọc `.env`.
- Sửa `.env` xong phải **restart** backend (`--reload` chỉ theo dõi file `.py`).
- Không có key thì Agent Runtime vẫn chạy; Claude API hiện hướng dẫn cấu hình và không gọi Claude.
- Thêm dependency: `uv add <package>`.
- **Lỗi `connection_error` dù curl ra được `api.anthropic.com`?** OpenSSL mới của Python gửi key share post-quantum (`X25519MLKEM768`); một số mạng/proxy reset handshake này. Chạy backend với OpenSSL config chỉ dùng group cổ điển:
  ```bash
  # file .cnf: openssl_conf → ssl_conf → system_default: Groups = X25519:P-256:P-384
  OPENSSL_CONF=/path/to/openssl-classic-groups.cnf uv run uvicorn api:app --reload --port 9000
  ```
  Chỉ là workaround môi trường, không đổi code.

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3001
npm run typecheck    # tsc --noEmit (Next 16 đã bỏ `next lint`; project chưa dùng ESLint)
npm run build
```

Backend URL mặc định `http://localhost:9000`. Đổi bằng `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://...`.

## Routes

Mọi page nằm trong route group `frontend/src/app/(workspace)/` nên dùng chung một layout (`layout.tsx` → `PlaygroundShell`): chuyển menu chỉ đổi Main Content, Header + Sidebar không unmount.

| URL | Nội dung | Trạng thái |
|---|---|---|
| http://localhost:3001/workspace | **Workspace Home**: trạng thái backend/Claude, demo chạy được, Roadmap 03–08 (chỉ text, không có nút) | Phase A |
| http://localhost:3001/runtime | **01 · Agent Runtime**: scenario `SSE` · `Approval / Reject` · `Cancel` (`?scenario=sse\|approval\|cancel`) | Phase A, smoke test pass |
| http://localhost:3001/claude-api | **02 · Claude API**: scenario One-shot (Generate Task Description / Leave Email) | Phase A; live đã verify ở lượt trước, lượt này không gọi lại |
| http://localhost:9000/docs | OpenAPI | |

URL cũ được redirect (HTTP 307, `frontend/next.config.ts` → `redirects()`):

| URL cũ | Đích |
|---|---|
| `/` | `/workspace` |
| `/playground` | `/workspace` |
| `/approval` | `/runtime?scenario=approval` |
| `/lessons/messages-api` | `/claude-api` |

Sidebar chỉ có Workspace Home + demo đã implement (`frontend/src/lib/demos.ts`, `implemented: true`). Demo 03–08 chưa có route; mở `/tools`... trả 404.

## Backend API

| HTTP | Endpoint | Body / Response |
|---|---|---|
| GET | `/api/health` | `{ok, llm_configured, missing_env[], model, max_tokens_cap, timeout_seconds}`. Không gọi Claude, không trả key. |
| POST | `/api/claude-api/one-shot` | Body `{prompt: str 1–4000, system?: str ≤2000, max_tokens?: int 1–LLM_MAX_TOKENS}`. Response `{status, request, response, answer, request_id, metrics{api_calls, latency_ms, input_tokens, output_tokens}, error{kind, message, upstream_status}}`. |
| GET | `/api/claude-api/one-shot/source` | `{path, code}` của `backend/lessons/messages_api.py` (path cố định). |
| POST | `/api/sessions`, `/api/sessions/{id}/messages` (body `{text, scenario: sse\|approval\|long}`, SSE), `/approvals/{id}` (body `{approved}`), `/cancel` | Dùng bởi demo 01 · Agent Runtime, không đổi. |

HTTP status của Claude API (One-shot): `200` thành công · `422` input sai (prompt rỗng, max_tokens vượt trần) · `503` thiếu `ANTHROPIC_API_KEY`/`LLM_MODEL` (không gọi Claude, `api_calls = 0`) · `502` Anthropic trả 4xx/5xx hoặc không kết nối được · `504` timeout.

## 02 · Claude API — One-shot: Generate Task Description

Màn hình: **Input** (preset `Task Description` | `Leave Email`, 2 ô nhập, Tùy chọn nâng cao: system/max_tokens/model) bên trái → **Generated Draft** (Actual Result) bên phải (text thật từ Claude, sửa trực tiếp, `Copy`, `Restore`, status `idle/running/succeeded/failed`) → Metrics → **Execution Events** (trace của lần Run) → **Source Code & Debug** (Request JSON / Response JSON / Source & Debug) → How it works (Collapse) → Kết quả cần đạt. Không có quiz.

Flow: `claude-api/demo-form.tsx` `submit()` ghép prompt bằng `PRESETS[key].buildPrompt` (`content.ts`) → `page.tsx` `runDemo()` → `POST /api/claude-api/one-shot` → `playground_api.py` `post_messages_api()` (Pydantic validate) → `lessons/messages_api.py` `run_messages_api()` → `client.messages.create(**request_body)` (1 HTTP request, `max_retries=0`, `thinking: disabled`) → JSON → Draft = ghép các block `text`.

`thinking: {"type": "disabled"}`: với model đang cấu hình, extended thinking bật mặc định và thinking token tính vào `max_tokens`; đã quan sát một response 512 token chỉ có block `thinking`, không có text. Tắt đi để draft luôn là text.

Breakpoints (dòng thật, UI tab Source Code tự tính lại từ comment `BREAKPOINT n`):

| # | Vị trí | Quan sát |
|---|---|---|
| BP1 | `backend/lessons/messages_api.py:45` `request_body = {...}` | body gửi Claude (không có key) |
| BP2 | `backend/lessons/messages_api.py:66` `await client.messages.create(...)` | Step Over = request HTTP thật; lỗi nhảy vào `except` |
| BP3 | `backend/lessons/messages_api.py:81` `answer = ...` | `message.content`, `message.stop_reason`, `message.usage` |
| Route | `backend/playground_api.py` `post_messages_api()` | body đã validate, chọn HTTP status |
| FE | `frontend/src/app/(workspace)/claude-api/demo-form.tsx:39` `onRun({ prompt: ... })` | prompt thật được ghép từ 2 ô input |
| FE | `frontend/src/app/(workspace)/claude-api/page.tsx:62` `await fetch(...)` | DevTools Sources + Network |

Kỳ vọng quan sát được: một lần Run tạo đúng 1 request (`api_calls = 1`); Response có `content` là list block `text`, `stop_reason` (`end_turn` hoặc `max_tokens` nếu đặt trần thấp), `usage`; Metrics hiển thị token và latency đo thật, `n/a` khi chưa có số đo.

## 01 · Agent Runtime — SSE · Approval / Reject · Cancel

Agent trong `backend/agent.py` là **kịch bản có kiểm soát** (không gọi Claude, timing bằng `asyncio.sleep`); cơ chế Task/Queue/SSE/Future/Cancel là thật. Mở trang chỉ `POST /api/sessions`, không tự chạy agent, kể cả khi reload URL.

| Scenario | Bấm | Kết quả mong đợi (event thật) |
|---|---|---|
| SSE | Start SSE | `run_started → tool_call → tool_result → text_delta ×4 → final → run_finished`, đến từng đợt trong ~3 s |
| Approval / Reject | Start Approval → Approve hoặc Reject | `approval_required` → nút Approve/Reject hiện ra → `approval_decision → permission(allow\|deny) → tool_result → final → run_finished` |
| Approval → Cancel | Start Approval → Cancel Agent khi đang chờ | `approval_required → error(kind=cancelled) → run_finished` |
| Cancel | Start Long Running → Cancel Agent | `progress ×n → error(kind=cancelled) → run_finished`, không có `final`, history không đổi |

Giới hạn hiện tại: tool `create_ticket_draft` vẫn **mô phỏng**, Approve chưa ghi dữ liệu thật (Phase B đổi sang task SQLite/file sandbox có read-back). Rời trang lúc đang chạy chỉ đóng stream; Task backend vẫn chạy tới khi xong hoặc bị Cancel (approval đang chờ tự reject sau 120 s).

Flow: `runtime-demo.tsx` `start()` → `runtime-api.ts` `streamMessage()` → `POST /api/sessions/{id}/messages` → `api.py` `send_message()` tạo `asyncio.create_task(run_turn(...))` → `agent.py` `run_agent()` gọi `emit()` → `queue.put_nowait()` → `stream()` `await queue.get()` → `yield "data: ...\n\n"` → browser `reader.read()` → `onEvent` → `handleEvent()` cập nhật React state. Approve/Reject: `decide()` → `POST /approvals/{id}` → `ApprovalBroker.resolve()` → `future.set_result()`. Cancel: `cancel()` → `POST /cancel` → `session.task.cancel()`.

Breakpoints (Ctrl+F đúng đoạn code; UI hiện cùng danh sách):

| # | Vị trí | Quan sát |
|---|---|---|
| BP1 | `backend/api.py:88` `session.task = asyncio.create_task(` (và `:94` `event = await queue.get()`) | handler trả StreamingResponse ngay, Agent chạy trong Task |
| BP2 | `backend/approvals.py:35` `approved = await asyncio.wait_for(future, ...)` | Agent dừng tới khi `/approvals` resolve Future |
| BP3 | `backend/api.py:122` `session.task.cancel()` | `run_turn()` vào nhánh `except asyncio.CancelledError`, không commit history |
| BP4 | `frontend/src/app/(workspace)/runtime/runtime-api.ts:48` `await reader.read()` | chunk SSE → tách khung → `onEvent` |

`Session`/`SessionStore` nằm ở `backend/sessions.py`; session sống trong RAM của process Python, một `asyncio.Queue` mỗi message; không có persistence hay authentication.

## Implementation status (thực tế)

| # | Demo | Status | Ghi chú |
|---|---|---|---|
| 01 | Agent Runtime | Phase A xong | SSE / Approve / Reject / Cancel smoke test pass (curl + Chrome headless). Tool approval còn mô phỏng → Phase B. |
| 02 | Claude API | Phase A xong (One-shot) | Live verified ở lượt trước (model `claude-haiku-5-5`); Phase A chỉ chuyển route/layout, không gọi lại Claude. History / Streaming / API Behavior chưa triển khai. |
| 03–08 | Tools, Manual Loop, Structured Output, Workflows, MCP, Agent SDK | Chưa triển khai | Chỉ có trong Roadmap ở Workspace Home; không có route, không lên sidebar. |

Đã bỏ: navigation 36 lesson, menu disabled, ô tìm lesson, Previous/Next theo lesson ID, quiz/Studied/progress.
