# AI Agent Demo Workspace — Claude Agent mechanics, chạy thật

Workspace gồm **8 demo tương tác** (mục tiêu Phase 1). Mỗi demo có vài scenario: chọn scenario, bấm Run, xem **Actual Result** → **Execution Events** → **Source & Debug** → **Kết quả cần đạt**. Không quiz, không lesson progress.

Source of truth: `plans/00-START-HERE.md` + `plans/01-SHARED-ARCHITECTURE-UI.md` + một plan cho mỗi demo (`plans/02-…` → `plans/09-…`). Mỗi lượt chỉ làm một plan rồi dừng để review.

Stack: Python + FastAPI (backend, port 9000) · Next.js 16 App Router (Turbopack) + TypeScript + Ant Design v6 (frontend, port 3001).

**Trạng thái hiện tại:** Demo **01 → 06** chạy được (Agent Runtime · Claude API · Tools & Registry · Manual Agent Loop · Structured Output · Agent Workflows). Demo 07–08 chỉ nằm ở Roadmap trên Workspace Home (không route, không lên sidebar).

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
  Chỉ là workaround môi trường, không đổi code.

### Known limitation của môi trường mạng (đã đo)

Mạng đang dùng để phát triển **reset mọi HTTPS request có body lớn hơn khoảng 1–1,5 KB khi đích là `api.anthropic.com`**. Bằng chứng:

| Thử nghiệm | Kết quả |
|---|---|
| body ~352 B và ~952 B → `api.anthropic.com` | OK |
| body ~1.6 KB trở lên → `api.anthropic.com` | `httpcore2.ReadError` → SDK bọc thành `APIConnectionError("Connection error.")` |
| `curl` body 6 KB → `api.anthropic.com` | fail (exit 56) |
| `curl` body 6 KB → một host khác (`postman-echo.com`) | HTTP 200 |
| HTTP/1.1 và HTTP/2 | fail như nhau → không phải vấn đề protocol |
| `ping -D` tới 1472 B | OK → không phải MTU blackhole thông thường |

Hệ quả: demo nào gửi request lớn (Demo 04 khi loop sang lượt thứ 3, prompt dài) sẽ nhận `error(kind=connection_error)`. **Không phải bug của code** — chạy qua VPN/proxy hoặc mạng khác (ví dụ 4G hotspot) là hết. Backend tôn trọng biến môi trường `HTTPS_PROXY` của httpx nếu bạn có proxy.

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
├── shared/                       # chỉ những gì ≥ 2 demo thật sự dùng chung
│   ├── claude.py                 # new_client(max_retries=0), answer_text, map lỗi API
│   ├── approval.py               # ApprovalBroker (asyncio.Future) — demo 01 + 04
│   ├── sessions.py               # Session + SessionStore (RAM) — demo 01 + 04
│   └── task_store.py             # sqlite3 tasks, tách theo demo_scope — từ demo 04
├── demos/demo_01_runtime/
│   ├── router.py                 # endpoint /api/demos/01/*
│   ├── runtime.py                # run_turn() (Task + Queue) + run_agent() ba scenario
│   └── approval_note.py          # file sandbox: build/write/read/delete
├── demos/demo_02_claude_api/
│   ├── router.py · messages.py   # messages.create + parse content/usage
│   └── streaming.py              # messages.stream -> event text_delta/final
├── demos/demo_03_tools/
│   ├── router.py · tools.py      # 3 hàm Python + TOOL_SCHEMAS gửi cho model
│   ├── registry.py               # TOOL_REGISTRY + execute(name, input) có validate
│   └── tool_calling.py           # một tool round: call #1 → execute → call #2
├── demos/demo_04_manual_loop/
│   ├── router.py                 # sessions, runs (SSE), approvals, cancel, tasks
│   ├── agent_loop.py             # loop + working/committed history + MAX_TURNS
│   └── tasks_tools.py            # list_tasks / create_task (cần approve) / get_task
├── demos/demo_05_structured_output/
│   ├── router.py · schemas.py    # TaskDraft (Pydantic) dùng cho cả model và app
│   ├── validation.py             # tầng schema + tầng semantic, chạy offline
│   └── generation.py             # messages.parse(output_format=...) + repair 1 lần
└── demos/demo_06_workflows/
    ├── router.py                 # POST /run, GET /caps
    ├── patterns.py               # 5 async function: chaining/routing/parallel/orchestrator/evaluator
    └── runner.py                 # Trace: đếm call, enforce budget, ghi start_ms/end_ms
frontend/src/
├── components/                   # WorkspaceLayout (Header+Sider+Content), DemoMenu, CodeBlock, LearningOutcome
├── lib/demos.ts                  # metadata 8 demo; chỉ demo có `route` lên sidebar
└── app/(workspace)/
    ├── layout.tsx                # AntdRegistry + Providers + WorkspaceLayout (persistent sidebar)
    ├── workspace/page.tsx        # Workspace Home + Roadmap
    └── demos/                    # mỗi demo một folder: page.tsx + api.ts + content.ts + component con
        ├── 01-runtime/ · 02-claude-api/ · 03-tools/
        └── 04-manual-loop/ · 05-structured-output/ · 06-workflows/
```

Quy tắc: `main.py` chỉ import router của demo **đã có code**; mỗi `demo_XX/` tự sở hữu API, logic và sample data của mình (`plans/00-START-HERE.md`, mục 3).

## Routes

| URL | Nội dung |
|---|---|
| http://localhost:3001/workspace | **Workspace Home**: trạng thái backend/Claude, demo chạy được, Roadmap 02–08 (chỉ text) |
| http://localhost:3001/demos/01-runtime | **01 · Agent Runtime**: scenario `SSE` · `Approval` · `Cancel` |
| http://localhost:3001/demos/02-claude-api | **02 · Claude API**: scenario `One-shot` · `History On/Off` · `Streaming` |
| http://localhost:3001/demos/03-tools | **03 · Tools & Registry**: scenario `Single Tool` · `Registry` · `Tool Error` |
| http://localhost:3001/demos/04-manual-loop | **04 · Manual Agent Loop**: scenario `Normal` · `Max Turns` · `Tool Failure` |
| http://localhost:3001/demos/05-structured-output | **05 · Structured Output**: `Generate` → `Validate` → `Repair` |
| http://localhost:3001/demos/06-workflows | **06 · Agent Workflows**: `Chaining` · `Routing` · `Parallel` · `Orchestrator` · `Evaluator` |
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

| POST | `/api/demos/03/run` | Body `{scenario: single\|registry\|error, prompt: 1–2000, max_tokens?}`. Response `{status, events[], requests[], responses[], answer, tool_calls[], metrics, error}`. |
| GET | `/api/demos/03/tools` | `{tools: [...]}` — schema đang gửi cho model. |
| POST | `/api/demos/04/sessions` · `/sessions/{id}/runs` (SSE, body `{prompt, max_turns: 1–6}`) · `/sessions/{id}/approvals/{aid}` · `/sessions/{id}/cancel` | Loop có approval và cancel; `GET /sessions/{id}` trả `{history_messages, busy}`. |
| GET / DELETE | `/api/demos/04/tasks` (`?confirm=true` để xóa) | Đọc/xóa task trong SQLite, chỉ `demo_scope = manual_loop`. |
| POST | `/api/demos/05/generate` · `/validate` · `/repair` | `generate`/`repair` gọi Claude (native structured output); `validate` chỉ chạy Python. Response `{stage, status, raw, accepted, schema_errors[], semantic_errors[], metrics, events}`. |
| GET | `/api/demos/05/schema` | JSON Schema sinh từ Pydantic `TaskDraft`. |
| POST | `/api/demos/06/run` | Body `{scenario: chaining\|routing\|parallel\|orchestrator\|evaluator, input: 1–1000}`. Response `{status, answer, steps[] (kind llm/code, start_ms, end_ms, prompt, output, usage), metrics{api_calls, budget, latency_ms, tokens}, error}`. Vượt budget → **409** kèm trace. |
| GET | `/api/demos/06/caps` | `{budgets, max_workers, max_revisions}` — UI hiển thị, backend enforce. |

HTTP status chung cho các demo gọi Claude: `200` thành công · `422` input sai (prompt rỗng, `max_tokens` vượt trần, turn cuối không phải user, `max_turns` ngoài 1–6) · `503` thiếu `ANTHROPIC_API_KEY`/`LLM_MODEL` (không gọi Claude, `api_calls = 0`) · `502` Anthropic trả 4xx/5xx hoặc không kết nối được · `504` timeout · `409` session đang chạy · `400` thiếu `confirm` khi xóa dữ liệu. Endpoint stream luôn trả `200` rồi báo lỗi bằng event `error`, vì response đã bắt đầu stream.

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

## 03 · Tools & Registry — Single Tool · Registry · Tool Error

Một **tool round** đầy đủ: Claude #1 trả block `tool_use`, Python tra `TOOL_REGISTRY` và chạy hàm thật, gửi `tool_result` (kèm `tool_use_id` khớp), rồi Claude #2 mới cho câu trả lời cuối. Chưa có loop nhiều lượt — đó là Demo 04.

| Scenario | tools gửi model | tool_choice | Kết quả đã đo |
|---|---|---|---|
| Single Tool | `sum_numbers` | ép `{"type":"tool","name":"sum_numbers"}` | model trả `input={"numbers":[120000,85000,45000]}`, Python tính `250000.0`, answer “Tổng … là **250.000**” |
| Registry | cả 3 tool | `auto` (quyết định thật của model) | “đếm số từ…” → `count_words` (7 từ); “tính tổng…” → `sum_numbers`. Model không gọi tool thì UI báo `no_tool_use`, không dựng tool giả |
| Tool Error | `divide_numbers` | ép | `ZeroDivisionError: division by zero` → `tool_result(is_error=true)` → Claude giải thích lỗi; HTTP vẫn 200 |

An toàn: không `eval`/`exec`, không dynamic import; tool lạ → `Unknown tool`; input validate bằng Pydantic (`{"numbers": "abc"}` → lỗi validation); lỗi tool chỉ trả tên lỗi + message, không trả traceback.

## 04 · Manual Agent Loop — Normal · Max Turns · Tool Failure

Python giữ vòng lặp (`for turn in range(1, max_turns + 1)`), model quyết định `stop_reason`. `working_messages` là `deepcopy` của history đã commit; chỉ nhánh `end_turn` + có text mới gán lại vào `session.history`. Tool `create_task` ghi SQLite nên phải được Approve trước (fail closed).

| Scenario | Kết quả đã đo |
|---|---|
| Normal | `create_task` → `approval_required` → Approve → INSERT thật → `end_turn` → `history_committed`; `turns_used=2`, `messages_in_request` = `[1, 3]`; task đọc lại từ DB: `{id:1, title:"Login", priority:"high", status:"todo"}` |
| Run lại cùng session | `history_before=4` (nhớ hội thoại trước), không tạo task trùng |
| Max Turns = 1 | `tool_use` ở lượt 1 → hết lượt → `max_turns_reached`, **không** có `final`, `history_messages` vẫn 0 |
| Tool Failure | `get_task(999999)` → `tool_result(is_error=true, "TaskNotFound…")` → model giải thích → `run_finished` |
| Reject | `tool_result` ghi “Người dùng không phê duyệt…”, DB vẫn trống |
| Cancel khi đang chờ approval | `error(kind=cancelled)` → `run_finished`, history không commit, DB không có task mới |
| Fail giữa loop (mạng cắt lượt 3) | history **không** commit nhưng `created_ids=[1]` vẫn còn trong DB → UI cảnh báo “rollback history ≠ rollback side effect” |

SQLite: `backend/data/tasks.sqlite3` (gitignored), bảng `tasks(id, title, priority, status, demo_scope)`, parameterized query, `Reset data` chỉ xóa `demo_scope = manual_loop` và có confirm.

## 05 · Structured Output — Generate · Validate · Repair

`client.messages.parse(output_format=TaskDraft)`: SDK sinh JSON Schema từ Pydantic và gửi trong `output_config.format` — ràng buộc schema thật, không phải “nhờ prompt trả JSON”. Cùng một model `TaskDraft` dùng cho cả model và cho việc validate, nên hai bên không lệch nhau.

| Bước | Gọi Claude? | Kết quả đã đo |
|---|---|---|
| Generate | có (1 request) | “Làm login UI ưu tiên cao, khoảng 4 giờ” → `{"title":"Làm login UI","priority":"high","estimated_hours":4.0}`, accepted |
| Validate — lỗi schema | không | `priority:"urgent"` → `priority: Input should be 'low', 'medium' or 'high'`; thiếu field → `Field required`; `"bốn giờ"` → lỗi kiểu. Fail tầng 1 thì **không** chạy tầng 2 |
| Validate — lỗi nghiệp vụ | không | `estimated_hours=-4` qua schema nhưng fail semantic; `title="TODO"` fail; `priority=high` + 40 giờ fail rule “high ≤ 16 giờ” |
| Repair | có (1 request) | `-4` → `4.0`, validate lại rồi mới `accepted`; repair chỉ chạy một lần khi bấm, và có thể vẫn fail |

Rule nghiệp vụ nằm ở `validation.py`: `0 < estimated_hours ≤ 80`, `priority=high` thì `≤ 16`, `title ≥ 5` ký tự và không phải placeholder. Demo này **không** ghi DB.

## 06 · Agent Workflows — Chaining · Routing · Parallel · Orchestrator · Evaluator

Năm pattern chỉ bằng Python + Claude API, không framework. Thông điệp của demo: **code giữ cấu trúc** (thứ tự, nhánh, song song, cap), **model lo nội dung** và những quyết định được hỏi tường minh. Mỗi step trong trace ghi `kind` (`llm` = một request thật, `code` = quyết định của Python) kèm `start_ms`/`end_ms` do backend đo.

| Pattern | Budget | Kết quả đã đo |
|---|---|---|
| Chaining | 2 call | `draft` → `code:pipe` → `improve`; `start_ms` của call 2 = `end_ms` của call 1 (tuần tự), output bước 1 nằm trong prompt bước 2 |
| Routing | 2 call | “Dịch câu này…” → classifier trả `translate` → `handler:translate`; “Tóm tắt…” → `summarize`. Nhãn ngoài danh sách → fallback, **không** gọi handler (kiểm bằng stub) |
| Parallel | 2 call | `asyncio.gather()`: hai call overlap ~1476 ms, latency 1608 ms so với tổng thời gian hai call 3085 ms |
| Orchestrator | 3 call | planner đề xuất 7–8 subtask, `code:cap` chỉ chạy 2 (`MAX_WORKERS=2`), rồi `code:combine` gộp kết quả |
| Evaluator | 4 call | `generate` → `evaluate #1` → verdict thật; ACCEPT thì dừng, REVISE thì dùng đúng một lần `revise`. Hết lượt mà vẫn REVISE thì trả bản cuối **kèm feedback chưa xử lý**, không giả vờ đã accept |

Budget là giới hạn thật: `Trace.call()` raise `BudgetExceeded` trước khi gọi API (đã kiểm với `budget=0`), router trả 409 và vẫn kèm trace để thấy nó dừng ở bước nào. Demo này không ghi DB, `max_tokens` mỗi call là 220.

## Implementation status (thực tế)

| # | Demo | Status | Ghi chú |
|---|---|---|---|
| 01 | Agent Runtime | Xong | Smoke test API pass: SSE tăng dần, Approve ghi file thật, Reject không ghi, Cancel lúc sleep và lúc chờ approval, double start → 409, cancel ngay sau start không treo stream, `DELETE /file` thiếu confirm → 400. Frontend: `npm run build` + `typecheck` pass, `/demos/01-runtime` render 200. |
| 02 | Claude API | Xong — **live verified** | 21/21 check pass với model `claude-haiku-5-5` thật: one-shot `stop_reason=end_turn` (34 in / 115 out tokens), History OFF 1 turn vs ON 3 turn (input_tokens 23 → 105, câu trả lời đổi hẳn), streaming nhiều `text_delta` trước `final` và text ghép khớp `final.answer`, `max_tokens=16` → `stop_reason=max_tokens`, 4 case validate → 422. Frontend build/typecheck pass, `/demos/02-claude-api` render 200. |
| 03 | Tools & Registry | Xong — **live verified** | 23/23 check pass: 3 scenario với Claude thật + unit check registry (tool lạ, input sai kiểu, thiếu field, happy path) + 3 case validate 422. |
| 04 | Manual Agent Loop | Xong — **live verified** | 25/25 check pass: approve → INSERT thật, reject, cancel, max_turns, tool failure, run lại giữ history, và case fail-giữa-loop chứng minh history không commit nhưng task đã ghi vẫn còn. Loop 3+ lượt bị giới hạn mạng (xem Known limitation). |
| 05 | Structured Output | Xong — **live verified** | 26/26 check pass: native structured output, 4 loại lỗi schema, 3 loại lỗi semantic, repair 1 lần (−4 → 4.0), 3 case validate 422. |
| 06 | Agent Workflows | Xong — **live verified** | 26/26 check pass: 5 pattern với Claude thật (chaining tuần tự, parallel overlap đo được, routing branch theo nhãn thật, orchestrator cap 2 worker, evaluator verdict thật) + 2 check offline chứng minh budget raise và routing fallback + 2 case 422. |
| 07–08 | MCP, Agent SDK | Chưa triển khai | Chỉ ở Roadmap trên Workspace Home. |

Refactor kèm theo ở lượt này: `ApprovalBroker` và `Session/SessionStore` được trích từ `demos/demo_01_runtime/` ra `backend/shared/` (demo 01 + 04 cùng dùng); thêm `shared/claude.py` cho phần hạ tầng gọi API. Demo 01 đã chạy lại smoke test (15/15 pass) sau refactor; Demo 02 giữ `messages.py` tự chứa vì nó là demo dạy chính cách gọi API.

Đã bỏ ở lượt rebuild Demo 01: `backend/api.py`, `agent.py`, `sessions.py`, `approvals.py` ở gốc (chuyển vào `demos/demo_01_runtime/`), `backend/playground_api.py` + `backend/lessons/` và page `app/(workspace)/claude-api/` của bản Claude API cũ (viết lại trong `demos/demo_02_claude_api/`), `PlaygroundShell` (đổi tên `WorkspaceLayout`), các redirect URL legacy `/playground`, `/approval`, `/lessons/messages-api`.
