# AI Agent Demo Workspace — Claude Agent mechanics, chạy thật

Workspace gồm **8 demo tương tác** (mục tiêu Phase 1). Mỗi demo có vài scenario: chọn scenario, bấm Run, xem **Actual Result** → **Execution Events** → **Source & Debug** → **Kết quả cần đạt**. Không quiz, không lesson progress.

Source of truth: `plans/00-START-HERE.md` + `plans/01-SHARED-ARCHITECTURE-UI.md` + một plan cho mỗi demo (`plans/02-…` → `plans/09-…`). Mỗi lượt chỉ làm một plan rồi dừng để review.

Stack: Python + FastAPI (backend, port 9000) · Next.js 16 App Router (Turbopack) + TypeScript + Ant Design v6 (frontend, port 3001).

**Trạng thái hiện tại:** đủ **8/8 demo** có code chạy được. Demo 08 (Agent SDK) cần thêm prerequisite (Claude Code CLI) và lượt model của nó hiện bị giới hạn mạng — xem Known limitation.

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

Đo lại 2026-11-24: TLS post-quantum (`X25519MLKEM768`) bị reset ngay cả với body 50 B; ép nhóm cổ điển thì body ≤ 800 B qua, ≥ 1,5 KB vẫn reset; giảm TCP MSS xuống 536 không đổi kết quả → **không phải MTU**, mà là thiết bị mạng chủ động cắt upload lớn tới `api.anthropic.com`. CLI bundle 2.1.330 (Bun) luôn `ECONNRESET`. Demo 08 vì vậy đặt `CLAUDE_CODE_MAX_RETRIES=2` và `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`: run fail trong ~3 s với `error(kind=sdk_api_error)` thay vì retry tới timeout.

Hệ quả: demo nào gửi request lớn sẽ nhận `error(kind=connection_error)` — Demo 04 khi loop sang lượt thứ 3, và **Demo 08** vì Claude Code CLI luôn gửi system prompt lớn (CLI tự retry rồi báo `ECONNRESET`; cả HTTP/1.1 và HTTP/2 đều vậy). **Không phải bug của code** — chạy qua VPN/proxy hoặc mạng khác (ví dụ 4G hotspot) là hết. Backend tôn trọng `HTTPS_PROXY` của httpx nếu bạn có proxy.

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
│   ├── router.py · agent_loop.py · scenarios.py
│   ├── rules.py · skills.py · permissions.py · subagents.py
│   ├── tool_dispatch.py · tasks_tools.py · sandbox/
├── demos/demo_05_structured_output/
│   ├── router.py · schemas.py    # TaskDraft (Pydantic) dùng cho cả model và app
│   ├── validation.py             # tầng schema + tầng semantic, chạy offline
│   └── generation.py             # messages.parse(output_format=...) + repair 1 lần
├── demos/demo_06_workflows/
│   ├── router.py                 # POST /run, GET /caps
│   ├── patterns.py               # 5 async function: chaining/routing/parallel/orchestrator/evaluator
│   └── runner.py                 # Trace: đếm call, enforce budget, ghi start_ms/end_ms
├── demos/demo_07_mcp/
│   ├── mcp_server.py             # MCP server thật (stdio), 2 tool + 1 resource + 1 prompt
│   ├── mcp_client.py             # Client: spawn, initialize, tools/list, tools/call, resources, prompts
│   └── router.py                 # Bridge FastAPI -> client; seed/reset dữ liệu scope mcp
└── demos/demo_08_agent_sdk/
    ├── sdk_agent.py              # run_turn + run_query (dịch SDK message) + inspect_session
    ├── customization.py          # can_use_tool, hooks, skills, subagents, build_options
    ├── sdk_tools.py              # tool in-process qua create_sdk_mcp_server
    ├── environment.py            # báo prerequisites (SDK, CLI, key, cap)
    ├── router.py                 # sessions, runs (SSE), approvals, cancel, inspect, tasks
    └── sandbox/                  # cwd của agent: requirements.md + .claude/skills/task-planning/
frontend/src/
├── components/                   # WorkspaceLayout (Header+Sider+Content), DemoMenu, CodeBlock, LearningOutcome
├── lib/demos.ts                  # metadata 8 demo; chỉ demo có `route` lên sidebar
└── app/(workspace)/
    ├── layout.tsx                # AntdRegistry + Providers + WorkspaceLayout (persistent sidebar)
    ├── workspace/page.tsx        # Workspace Home + Roadmap
    └── demos/                    # mỗi demo một folder: page.tsx + api.ts + content.ts + component con
        ├── 01-runtime/ · 02-claude-api/ · 03-tools/
        ├── 04-manual-loop/ · 05-structured-output/ · 06-workflows/
        └── 07-mcp/ · 08-agent-sdk/
```

Quy tắc: `main.py` chỉ import router của demo **đã có code**; mỗi `demo_XX/` tự sở hữu API, logic và sample data của mình (`plans/00-START-HERE.md`, mục 3).

## Routes

| URL | Nội dung |
|---|---|
| http://localhost:3001/workspace | **Workspace Home**: trạng thái backend/Claude, demo chạy được, Roadmap 02–08 (chỉ text) |
| http://localhost:3001/demos/01-runtime | **01 · Agent Runtime**: scenario `SSE` · `Approval` · `Cancel` |
| http://localhost:3001/demos/02-claude-api | **02 · Claude API**: scenario `One-shot` · `History On/Off` · `Streaming` |
| http://localhost:3001/demos/03-tools | **03 · Tools & Registry**: scenario `Single Tool` · `Registry` · `Tool Error` |
| http://localhost:3001/demos/04-manual-loop | **04 · Manual Agent Loop**: scenario `Normal` · `Max Turns` · `Tool Failure` · `Loop + Structured` |
| http://localhost:3001/demos/05-structured-output | **05 · Structured Output**: `Generate` → `Validate` → `Repair` |
| http://localhost:3001/demos/06-workflows | **06 · Agent Workflows**: `Chaining` · `Routing` · `Parallel` · `Orchestrator` · `Evaluator` |
| http://localhost:3001/demos/07-mcp | **07 · MCP**: `Connect & Discover` · `Call Tool` · `Resources & Prompts` (không cần Claude key) |
| http://localhost:3001/demos/08-agent-sdk | **08 · Claude Agent SDK**: `Basic` · `Permissions & Hooks` · `Skills` · `Subagents` |
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
| POST | `/api/demos/04/sessions` · `/sessions/{id}/runs` (SSE, body `{prompt, max_turns: 1–6, structured_finish?}`) · `/sessions/{id}/approvals/{aid}` · `/sessions/{id}/cancel` | Loop có approval và cancel; `structured_finish=true` thì chỉ commit history khi câu trả lời cuối pass TaskDraft (Demo 05). |
| GET / DELETE | `/api/demos/04/tasks` (`?confirm=true` để xóa) | Đọc/xóa task trong SQLite, chỉ `demo_scope = manual_loop`. |
| POST | `/api/demos/05/generate` · `/validate` · `/repair` | `generate`/`repair` gọi Claude (native structured output); `validate` chỉ chạy Python. Response `{stage, status, raw, accepted, schema_errors[], semantic_errors[], metrics, events}`. |
| GET | `/api/demos/05/schema` | JSON Schema sinh từ Pydantic `TaskDraft`. |
| POST | `/api/demos/06/run` | Body `{scenario: chaining\|routing\|parallel\|orchestrator\|evaluator, input: 1–1000}`. Response `{status, answer, steps[] (kind llm/code, start_ms, end_ms, prompt, output, usage), metrics{api_calls, budget, latency_ms, tokens}, error}`. Vượt budget → **409** kèm trace. |
| GET | `/api/demos/06/caps` | `{budgets, max_workers, max_revisions}` — UI hiển thị, backend enforce. |
| POST | `/api/demos/07/discover` | Spawn MCP server (stdio) → initialize → `tools/list`. Response `{connected, session{server_name, protocol_version, capabilities}, tools[{name, description, input_schema}], events[]}`. |
| POST | `/api/demos/07/call-tool` | Body `{name: list_tasks\|get_task, task_id?}` → `tools/call`. Response thêm `result{is_error, text, structured}`, `schema`, `db_tasks` (đọc thẳng SQLite để đối chiếu). |
| POST | `/api/demos/07/resources-prompts` | Body `{goal}` → `resources/list` + `resources/read` + `prompts/list` + `prompts/get`. |
| POST / GET / DELETE | `/api/demos/07/seed` · `/tasks` · `/tasks?confirm=true` | Dữ liệu sandbox scope `mcp`; Seed là Python ghi trực tiếp (có nhãn **seed dữ liệu**), không phải tool của server. |
| GET | `/api/demos/08/env` | Prerequisites: `run_timeout_seconds` mặc định **180** (`SDK_RUN_TIMEOUT_SECONDS`), `approval_timeout_seconds` 120. |
| POST | `/api/demos/08/inspect` | Body `{scenario}` → spawn CLI + initialize, **không gọi model**: `{cli_version, pid, permission_mode, allowed_tools, skills, subagents_declared, subagents_registered, cwd, connect_ms}`. |
| POST | `/api/demos/08/sessions` · `/sessions/{id}/runs` (SSE, body `{scenario, prompt}`) · `/sessions/{id}/approvals/{aid}` · `/sessions/{id}/cancel` | Run agent qua SDK; event là SDK message thật. Run có cận trên 45s ở backend. |
| GET / DELETE | `/api/demos/08/tasks` (`?confirm=true` để xóa) | Task scope `agent_sdk`. |

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

## 04 · Manual Agent Loop — Loop cơ bản · Rules · Skills · Permissions · Subagents

Python giữ vòng lặp (`for turn in range(1, max_turns + 1)`), model quyết định `stop_reason`. `working_messages` là `deepcopy` của history đã commit; chỉ nhánh `end_turn` + có text mới gán lại vào `session.history`. Bốn scenario mới minh họa **cùng ý tưởng với Demo 08** nhưng tự triển khai bằng Messages API (không Agent SDK):

| Scenario | Python làm gì |
|---|---|
| Normal / Max Turns / Tool Failure / Structured | Loop + SQLite task như trước; `create_task` cần Approve |
| Rules Loading | `rules.py` đọc `sandbox/CLAUDE.md` + `.claude/rules/` → `system` của `messages.create` |
| Skills | `skills.py` discover metadata + tool `load_skill` → Progressive disclosure |
| Permissions | `permissions.py` `check_tool_permission` trước `execute` (read auto / write HITL / unknown deny) |
| Subagents | `delegate_task` → `subagent_loop.py` (context tách, không delegation đệ quy) |

```text
backend/demos/demo_04_manual_loop/
├── agent_loop.py · router.py · scenarios.py
├── rules.py · skills.py · permissions.py · subagents.py · subagent_loop.py
├── tool_dispatch.py · tool_schemas.py · sandbox/…
```

SQLite: `demo_scope = manual_loop`, `Reset data` có confirm. So sánh trực tiếp với Demo 08 `customization.py` (SDK `can_use_tool`, skills option, `AgentDefinition`).

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

## 07 · MCP — Connect & Discover · Call Tool · Resources & Prompts

MCP server **thật** (MCP Python SDK 2.x, `MCPServer`) chạy trong process riêng, nói JSON-RPC trên **stdio**. Client thật `initialize` rồi mới `tools/list` / `tools/call`. Khác Demo 03: ở đó tool là hàm Python trong cùng process; ở đây tool sống độc lập và chạy được với bất kỳ MCP client nào. **Không cần Claude key.**

```text
Browser → FastAPI bridge → MCP Client ──stdio──> MCP Server ──> SQLite (scope mcp, chỉ đọc)
                                     initialize · tools/list · tools/call
                                     resources/list · resources/read
                                     prompts/list · prompts/get
```

| Scenario | Kết quả đã đo |
|---|---|
| Connect & Discover | `server_name=agent-demo-task-server`, `protocol_version=2026-07-28`, capabilities `tools/resources/prompts`; server công bố 2 tool kèm `input_schema` do SDK sinh từ type hint (`get_task` yêu cầu `task_id: integer`) |
| Call Tool | `list_tasks` trả `structured_content` **khớp đúng** 3 row đọc thẳng từ SQLite; `get_task(id)` trả task; `get_task(999999)` → `is_error=true` với message `TaskNotFound: …` |
| Resources & Prompts | `workspace://tasks/summary` (text/markdown) sinh từ DB thật (“Tổng: 3 task”); `plan_task` nhận `goal` và trả message có nhúng cả goal lẫn các task đang có |

An toàn và dọn dẹp: tham số server là hằng số trong `mcp_client.py` (UI không gửi command → không có command injection); tên tool được allowlist ở router và client chỉ gọi tool mà server công bố; mỗi operation nằm trong `async with Client(...)` nên subprocess được đóng sau request (đã đo: 3 lần connect liên tiếp không để lại process nào). Server chạy standalone được:

```bash
cd backend && uv run python -m demos.demo_07_mcp.mcp_server   # stdio: đừng print() ra stdout
```

## 08 · Claude Agent SDK — Basic · Permissions & Hooks · Skills · Subagents

Dùng **claude-agent-sdk 0.2.187** thật; SDK chạy agent loop thông qua **Claude Code CLI**. Khác Demo 04: ở đó vòng lặp là code mình viết; ở đây mình chỉ cấp `ClaudeAgentOptions`, nhận SDK message và giữ quyền quyết định. Không bọc thêm loop nào lên SDK.

**Prerequisites:** Node.js + Claude Code CLI trong PATH (đã kiểm: `claude` 2.1.330) và `ANTHROPIC_API_KEY` trong `backend/.env` (SDK nhận qua `options.env`; CLI không cần `/login`). `GET /env` báo thiếu thứ gì.

Bốn điểm ứng dụng vẫn kiểm soát:

| Điểm | Cơ chế | Đã kiểm chứng |
|---|---|---|
| Permissions | `can_use_tool` cho tool ghi; tool đọc auto qua `allowed_tools` | `create_task` **không** nằm trong `allowed_tools` (SDK shadow callback nếu có). Tool đọc trong allowlist; `create_task` → Approve/Reject qua `can_use_tool`; Reject → Deny, không ghi SQLite |
| Hooks | `HookMatcher` cho `UserPromptSubmit`, `PreToolUse`, `include_hook_events=True` | hook `UserPromptSubmit` **được SDK gọi thật** ở +2.8s với payload thật (`prompt`, `session_id`) |
| Skills | `sandbox/.claude/skills/task-planning/SKILL.md` + `options.skills` + tool `Skill` | Inspect cho thấy `skills=['task-planning']` và tool `Skill` được bật. Việc skill có kích hoạt hay không **chỉ kết luận được khi có lượt model** → chưa claim |
| Subagents | hai `AgentDefinition` + tool `Task` | CLI **đăng ký đúng 2 subagent** (`requirements-analyst`, `task-planner`); scenario khác thì danh sách rỗng. Delegation thật cần lượt model → chưa claim |

Tool của agent là **MCP in-process** (`create_sdk_mcp_server`), khác Demo 07 vốn spawn server riêng: `list_tasks` (đọc) và `create_task` (ghi, phải qua approval). Cận trên do app đặt: `max_turns=4`, `max_budget_usd=0.10`, timeout run 45s, `cwd` là sandbox của demo, và `setting_sources=[]` để **không nạp skill/plugin cá nhân** của máy đang chạy (lần đầu chưa set thì CLI nạp cả `skill-creator` và plugin Postman của máy).

Nút **Inspect SDK session** spawn CLI + initialize mà không gọi model (2–20s): đây là đường duy nhất xem được cấu hình thật khi mạng chặn lượt model.

## Implementation status (thực tế) — Phase 1 checklist

| # | Demo | Status | Ghi chú |
|---|---|---|---|
| 01 | Agent Runtime | Xong + SSE disconnect | Backend hủy task khi client ngắt (`request.is_disconnected`); frontend `AbortSignal` + báo stream thiếu `run_finished`. Smoke API trước refactor vẫn pass. |
| 02 | Claude API | Xong — **live cần re-verify sau diff** | Non-stream/stream chỉ `succeeded` khi `stop_reason=end_turn` và có text; streaming báo `incomplete_response` nếu không. |
| 03 | Tools & Registry | Xong — **live cần re-verify** | Tool round chỉ `succeeded` khi lần gọi #2 `end_turn` + text; ép tool mà không `tool_use` → `failed`. |
| 04 | Manual Agent Loop | Xong — **live cần re-verify** | Thêm scenario **Loop + Structured** (`structured_finish`): commit history chỉ khi `structured_validate` accepted; scenario `permissions` Demo 08 dùng cùng prompt Login. |
| 05 | Structured Output | Xong — **validate offline pass** | Generate/repair `failed` nếu `stop_reason` lệch, `parsed_output` null, `estimated_hours` không hữu hạn, hoặc semantic fail. |
| 06 | Agent Workflows | Xong — **logic offline pass** | Routing: nhãn phải khớp đúng một trong `draft_task`/`summarize`/`translate` (không substring). Evaluator: dòng đầu phải là `ACCEPT` chính xác. |
| 07 | MCP | Xong — **verified** (không cần key) | Không đổi logic lõi ở lượt này. |
| 08 | Claude Agent SDK | Xong — **Inspect PASS**; lượt model **LIVE PENDING** | Allowlist: tool đọc trong `allowed_tools`, `create_task` **ngoài** list để `can_use_tool` chạy. Run timeout 45s / approval 120s hiện trên UI. Inspect 4 scenario OK (CLI 2.1.330, 2 subagent). **LIVE PENDING** (2026-11-24): run `basic` nhận `system(api_retry)×n` rồi `error(timeout)` sau 45s — giới hạn mạng README. |

**Kiểm chứng vòng này (máy dev):** `npm run typecheck` + `npm run build` PASS. Demo 08 Inspect + env PASS. Demo 03/08 lượt model: **FAIL** (`connection_error` / `api_retry`, không fake PASS).

### P0–P2 checklist (tóm tắt)

| Ưu tiên | Hạng mục | Kết quả |
|---|---|---|
| P0 | Demo 08 SDK 4 scenario | Inspect/hook/permission code sẵn sàng; **lượt model chưa verify** (mạng) |
| P0 | Demo 08 permission allowlist + approval | Đã sửa shadow `can_use_tool`; cần live Approve/Reject khi mạng ổn |
| P0 | Demo 03 stop_reason | Đã implement |
| P1 | SSE disconnect/cancel 01/04/08 | Đã implement |
| P1 | Timeout 45s / 120s đồng bộ UI | Đã implement |
| P1 | Demo 04 structured scenario | Đã thêm |
| P1 | Demo 02/05/06 response validation | Đã implement |
| P2 | Demo 04 ↔ 08 cùng prompt Login | Đã đồng bộ prompt `permissions` |
| P2 | Build/typecheck/smoke | Build/typecheck PASS; smoke một phần (xem `.tmp/smoke_phase1.py`) |

Dependency thêm: `mcp==2.3.0` và `claude-agent-sdk==0.2.187`. Lưu ý MCP SDK 2.x đã đổi `FastMCP` → `MCPServer` và dùng field snake_case (`input_schema`, `is_error`, `structured_content`), khác tài liệu v1.

Refactor kèm theo ở lượt này: `ApprovalBroker` và `Session/SessionStore` được trích từ `demos/demo_01_runtime/` ra `backend/shared/` (demo 01 + 04 cùng dùng); thêm `shared/claude.py` cho phần hạ tầng gọi API. Demo 01 đã chạy lại smoke test (15/15 pass) sau refactor; Demo 02 giữ `messages.py` tự chứa vì nó là demo dạy chính cách gọi API.

Đã bỏ ở lượt rebuild Demo 01: `backend/api.py`, `agent.py`, `sessions.py`, `approvals.py` ở gốc (chuyển vào `demos/demo_01_runtime/`), `backend/playground_api.py` + `backend/lessons/` và page `app/(workspace)/claude-api/` của bản Claude API cũ (viết lại trong `demos/demo_02_claude_api/`), `PlaygroundShell` (đổi tên `WorkspaceLayout`), các redirect URL legacy `/playground`, `/approval`, `/lessons/messages-api`.
