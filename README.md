# Claude Agent Playground — AI Task Manager track

Giáo trình code thật theo `plan-v2.md` (source of truth). `ui-preview-v2.html` chỉ là prototype bố cục.
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
- Không có key thì mọi thứ offline vẫn chạy; Lesson 06 hiện hướng dẫn cấu hình và không gọi Claude.
- Thêm dependency: `uv add <package>`.

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

| URL | Nội dung | Trạng thái |
|---|---|---|
| http://localhost:3001/ | Demo SSE legacy (Lesson 01) | Available — giữ nguyên, có thêm link Playground |
| http://localhost:3001/approval | Demo Approval + Cancel legacy (Lesson 04/05) | Available — giữ nguyên, chưa reconcile theo Plan V2 |
| http://localhost:3001/playground | Dashboard: 8 module, 36 lesson, status, số Studied, Kết quả cần đạt của module | Mới |
| http://localhost:3001/lessons/messages-api | Lesson 06 — Basic Messages API | Available, **Live verification pending** |
| http://localhost:9000/docs | OpenAPI | |

## Backend API

| HTTP | Endpoint | Body / Response |
|---|---|---|
| GET | `/api/health` | `{ok, llm_configured, missing_env[], model, max_tokens_cap, timeout_seconds}`. Không gọi Claude, không trả key. |
| POST | `/api/lessons/messages-api` | Body `{prompt: str 1–4000, system?: str ≤2000, max_tokens?: int 1–LLM_MAX_TOKENS}`. Response `{status, request, response, answer, request_id, metrics{api_calls, latency_ms, input_tokens, output_tokens}, error{kind, message, upstream_status}}`. |
| GET | `/api/lessons/messages-api/source` | `{path, code}` của `backend/lessons/messages_api.py` (path cố định). |
| POST | `/api/sessions`, `/api/sessions/{id}/messages`, `/approvals/{id}`, `/cancel` | Legacy SSE/Approval/Cancel, không đổi. |

HTTP status của Lesson 06: `200` thành công · `422` input sai (prompt rỗng, max_tokens vượt trần) · `503` thiếu `ANTHROPIC_API_KEY`/`LLM_MODEL` (không gọi Claude, `api_calls = 0`) · `502` Anthropic trả 4xx/5xx hoặc không kết nối được · `504` timeout.

## Lesson 06 — Basic Messages API

Flow: Form (`page.tsx` `runDemo()`) → `POST /api/lessons/messages-api` → `playground_api.py` `post_messages_api()` (Pydantic validate) → `lessons/messages_api.py` `run_messages_api()` → `client.messages.create(**request_body)` (1 HTTP request, `max_retries=0`) → JSON → UI tabs Request / Response / Execution Trace / Actual Result / Source Code + Metrics.

Breakpoints (dòng thật, UI tab Source Code tự tính lại từ comment `BREAKPOINT n`):

| # | Vị trí | Quan sát |
|---|---|---|
| BP1 | `backend/lessons/messages_api.py:45` `request_body = {...}` | body gửi Claude (không có key) |
| BP2 | `backend/lessons/messages_api.py:63` `await client.messages.create(...)` | Step Over = request HTTP thật; lỗi nhảy vào `except` |
| BP3 | `backend/lessons/messages_api.py:78` `answer = ...` | `message.content`, `message.stop_reason`, `message.usage` |
| Route | `backend/playground_api.py` `post_messages_api()` | body đã validate, chọn HTTP status |
| FE | `frontend/src/app/(playground)/lessons/messages-api/page.tsx` `runDemo()` → `await fetch(...)` | DevTools Sources + Network |

Kỳ vọng quan sát được: một lần Run tạo đúng 1 request (`api_calls = 1`); Response có `content` là list block `text`, `stop_reason` (`end_turn` hoặc `max_tokens` nếu đặt trần thấp), `usage`; Metrics hiển thị token và latency đo thật, `n/a` khi chưa có số đo.

## Exact "on event" locations (legacy SSE demo)

- **Agent producer**: `agent.py` calls `emit({...})`.
- **Runner wiring**: `api.py`'s `emit` executes `queue.put_nowait(event)`.
- **Backend consumer**: `api.py`'s `event = await queue.get()` waits for events.
- **SSE network bridge**: `api.py`'s `yield 'data: ...\\n\\n'` pushes frames to browser.
- **Frontend consumer**: `web.tsx` uses `await reader.read()` to read chunks, splits complete SSE frames, then invokes `onEvent(event)`.
- **React renderer**: `web.tsx`'s `handleEvent()` updates state and re-renders UI.

`Session`/`SessionStore` nằm ở `backend/sessions.py`; `api.py` giữ route, `run_turn` và SSE.
Demo legacy tạo session trong RAM của process Python và một `asyncio.Queue` mỗi message; không có persistence hay authentication.

## Implementation status (thực tế)

| ID | Lesson | Status | Ghi chú |
|---|---|---|---|
| 01 | Agent SSE Streaming | Available | Legacy `/`, smoke test pass. Chưa có timestamp/nhãn Offline theo V2. |
| 02, 03 | Session, Async Task | Coming Soon | Cơ chế có trong `api.py` nhưng chưa có lesson page. |
| 04 | Approval | Available | Legacy `/approval`: tool giả lập ticket draft, **chưa ghi file thật** theo V2. |
| 05 | Cancel | Available | Legacy `/approval` (Long Running + Cancel). |
| 06 | Basic Messages API | Available | Offline + error path verified; **live call chưa verify** (chưa có key). |
| 07–36, Final | | Coming Soon | Chưa implement; sidebar disabled, không có route. |

Sidebar có ô tìm lesson theo ID/tên. Cuối mỗi lesson có `[Previous] [Mark studied] [Next]`; lesson chưa implement thì nút bị disabled.
**Studied** là trạng thái học do người học tự đánh dấu, lưu ở `localStorage` (`playground.studied`, `frontend/src/lib/studied.ts`). Nó tách hẳn khỏi implementation status ở `frontend/src/lib/lessons.ts`.

“Completed” chỉ dùng khi đã implement theo Plan V2 và verify (live với lesson Live).
