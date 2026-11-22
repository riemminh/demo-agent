# PLAN V3 — AI TASK MANAGER · FEATURE-FIRST WORKSPACE PLAYGROUND

> **Source of truth mới** thay `plan-v2.md` về mục đích, UI/UX, thứ tự ưu tiên, nội dung demo và Definition of Done. Những phần V2 không xung đột về bảo mật/cấu hình/kỹ thuật có thể tham khảo. `ui-preview-v2.html` **chỉ tham khảo layout/style**; tuyệt đối không copy mock result/trace vào app thật. Không dùng nghiệp vụ NovaDev, không tham chiếu `dev-support-agent`.
>
> Repo: `https://github.com/riemminh/demo-agent`; source GitHub đã review tại commit `7e4e2fd13e0e8f710e2e871fe8d7a14a5fd4fe24`. **Claude phải kiểm tra working tree hiện tại trước khi sửa**, vì code local có thể mới hơn GitHub.
>
> Stack: Python, FastAPI, Next.js App Router, TypeScript, **Ant Design (antd)**; Anthropic API thật trên backend; SQLite và filesystem thật khi từng feature cần; Agent SDK ở final.

## A. Product intent — bắt buộc

**Đây là WORKSPACE APPLICATION để chạy và giải thích từng cơ chế Agent, không phải một website học lý thuyết/quiz.** Mỗi menu mở một **demo app có thể tương tác**, rõ chức năng như trang **Agent Approval + Cancel Demo** cũ: có input, Start/Run, trạng thái, hành động, output và event log thật. Hiểu kiến thức bằng cách tương tác với tính năng, rồi đọc source code đi kèm.

**ĐẶC BIỆT KHÔNG:** Knowledge Checkpoint, trắc nghiệm, chấm điểm, Mark Studied, phần trăm Studied, trang nội dung chỉ gồm Concept/Raw JSON/Code/đường flow tĩnh, fake execution log, fake tool result, mock support ticket. Không làm 36 màn hình placeholder bấm Run ra dữ liệu hardcode.

**PHẢI GIỮ:** Mục **Kết quả cần đạt** ngắn, rõ cho từng tính năng và cuối module; diễn giải file-by-file, `input → backend code → actual result`, 2–4 breakpoint thật, success/failure scenarios. **Không đưa câu hỏi** vào UI hoặc báo cáo.

**Data & runtime:** Dữ liệu mẫu có thể seed trong SQLite/file sandbox; kết quả luôn từ thao tác thực trên đó. Claude thật khi bài học cần model; phép tính Python thật; MCP server/client thật; task/file write thật; SSE thật. Khi thiếu key chỉ hiện hướng dẫn cấu hình và `Live verification pending`, không fake model output. Controlled fault phải có nhãn `Injected failure` và lỗi thật từ code.

### Review repo hiện tại

| File | Đã làm đúng / nên giữ | Phải sửa |
|---|---|---|
| `backend/lessons/messages_api.py` | Gọi `AsyncAnthropic.messages.create()` thật, 1 lần, `max_retries=0`, trả usage/latency. | Không xây lại Agent/Queue cho Lesson 06. |
| `frontend/src/app/(playground)/lessons/messages-api/page.tsx` | Form, Request/Response, source, metrics thật. | **Demo + Actual Result phải ở trên**, Concept/Inspector phụ; bỏ quiz. |
| `frontend/src/components/KnowledgeCheckpoint.tsx` | Trắc nghiệm hoạt động. | **Ngừng render và loại bỏ khi không còn sử dụng.** |
| `frontend/src/app/(playground)/playground/page.tsx` | Có navigation đầy đủ. | Đổi từ Learning Roadmap sang **Workspace Home**, quick launch tính năng chạy được. |
| `frontend/src/lib/lessons.ts` | Nhãn Available/Coming Soon trung thực. | Menu theo tên tính năng, bỏ ưu tiên Studied. |
| `frontend/src/app/approval/page.tsx`, `backend/agent.py` | ApprovalBroker/Future/SSE/Cancel chạy. | `create_ticket_draft` support mock phải đổi sang tạo file trong sandbox **có read-back** ở lượt riêng. |
| `ui-preview-v2.html` | Layout/style concept. | Không copy dữ liệu mô phỏng/trace UI làm kết quả thực. |

## B. UI/UX — chức năng trước, giải thích sau

```text
┌ Sidebar (antd Menu) ─────┬────────────────────────────────────────────────────────┐
│ Workspace Home           │  18 · Manual Agent — Create Tasks from Requirements     │
│ Runtime Foundation       │  requirements.md    [Run Agent] [Cancel] [Reset View]     │
│ Claude API               │  Status: Running / Waiting approval / Done               │
│ Tool Playground          │  ┌── ACTUAL RESULT: TASK BOARD (chính) ──────────────┐    │
│ Manual Agent             │  │ Tasks from SQLite GET, not hardcoded model text   │    │
│ Validation Studio        │  └───────────────────────────────────────────────────┘    │
│ Workflow Lab             │  Approval card only after backend approval_required      │
│ MCP Explorer             │  ┌── REALTIME EXECUTION TRACE ───────────────────────┐    │
│ SDK Task Agent           │  │ Model → tool_use → execute → tool_result → final    │    │
│                         │  └───────────────────────────────────────────────────┘    │
│                         │  [How it works] [Request/Response] [Source Code/Debug]  │
│                         │  KẾT QUẢ CẦN ĐẠT: cơ chế + output đã thấy              │
└─────────────────────────┴────────────────────────────────────────────────────────┘
```

**Thứ tự nội dung chính:** (1) feature name / mô tả 1 câu; (2) INPUT + nút ACTION; (3) ACTUAL RESULT lớn nhất; (4) status/trace/state; (5) code + raw I/O ở tabs thứ cấp; (6) Kết quả cần đạt. **Concept chỉ 2–4 câu trong Collapse phụ**, không cản trở người dùng chạy feature.

- Ant Design: `Layout`, `Sider`, `Menu`, `Card`, `Button`, `Form`, `Input`, `Tabs`, `Steps`, `Timeline`, `Statistic`, `Table`, `Alert`, `Modal`, `Popconfirm`, `Empty`, `Result`, `Descriptions`, `Tag`; `ConfigProvider` tập trung. Không framework UI thứ hai.
- **Actual Result là UI ứng dụng**: draft editor, task board, file explorer, validator errors, workflow compare, MCP tool table, SDK chat; không phải chỉ một khối JSON.
- **Trước khi Run:** trace trống, trạng thái idle; không show xanh SUCCESS giả. Sau Run, chỉ show raw events/metrics thực tế và `n/a` cho metric không có.
- Các action thực: Start, Approve, Reject, Cancel, Create/Update Task, List/Read File, Validate, Compare, Reset. Không render nút inert.
- `Reset View` chỉ clear run UI. `Reset Sandbox` xóa fixture chỉ sau xác nhận; không đụng file user ngoài sandbox. Sau ghi data, frontend GET read-back trước khi báo thành công.
- `Try Scenarios` là các **nút chạy trường hợp thật** (success/failure/reject/cancel), không phải câu hỏi kiểm tra.
- Mỗi run có run ID, status (`idle`, `running`, `waiting_approval`, `cancelling`, `succeeded`, `failed`, `cancelled`, `incomplete`) và event origin. Không tự xây fake `tool_use`, `hook`, `skill`, `subagent` nếu runtime không emit.
- Sidebar module + lesson: lesson chưa implement hiện Coming Soon **không có demo giả**. Dashboard `/playground` là Workspace Home: quick access tính năng available, trạng thái API, recent actual run nếu có; không phải thống kê Studied.

### Dữ liệu chung của Task Manager (bổ sung khi cần, KHÔNG ở Lesson 06)

`tasks(id, title, description, status todo|in_progress|done, priority low|medium|high, due_date, created_at, updated_at)` dùng sqlite3 có sẵn. Sandbox `workspace/` cho `.md/.txt`, chống path traversal/absolute path/symlink, file size bound, không đọc `.env`. CRUD/GET read-back thực, không lưu state thành công chỉ ở React. Mọi mutation qua Agent/MCP có policy & approval tại backend.

### Mẫu feature page điều khiển

- User nhìn vào input và nút Run là hiểu **tính năng làm gì** mà không cần đọc văn bản dạy học.
- Page thể hiện output có thể Copy, edit hoặc kiểm chứng trực tiếp; raw Claude API JSON/trace nằm ở Inspector.
- Source Code hiển thị **đúng Python/TSX đã chạy**, tên hàm và dòng breakpoint, không pseudo-code trộn lẫn với production code.
- Mỗi module là một **mini-application shell**; bài học trong module là tab hoặc route con có thực thi riêng, và có thể chia sẻ DB/files sandbox khi hợp lý.

## C. Module-specific Workspace Applications

### Module 1 — Runtime Foundation (01–05): **Runtime Lab**

**UI chính `/playground/runtime`:** các tab SSE, Sessions, Tasks, Approval, Cancel; điều khiển bên trái, Agent status/event log bên phải, cửa sổ kiểm chứng history/file. Giữ `/` và `/approval` legacy hoạt động.

| ID — Feature | Input/actions để người xem bấm | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **01 SSE Streaming** | Nhập text → Start Stream → Reset | Timed `emit → Queue → StreamingResponse` | Live text tăng dần, event log thực. Rớt mạng = incomplete | Hiểu producer/consumer và browser nhận SSE từng frame. |
| **02 Session Management** | Create Session A/B, Send, Switch | `SessionStore` + session-specific history | A/B hiển thị history khác nhau; sai ID 404; busy 409 | Phân biệt Session với Queue/Task tạo theo turn. |
| **03 Async Task Management** | Start Long Running; Run second request; Cancel | `asyncio.create_task`, cooperative `await`, Task state | Progress, busy check, cancel result | Phân biệt coroutine, Task, await và event loop. |
| **04 Human Approval** | Tên/nội dung `demo-notes.md`, Start → Approve/Reject | `ApprovalBroker` Future; chỉ sau Approve mới ghi **file sandbox thật** | File Explorer GET đọc lại nội dung; Reject không có file; expired approval 404 | Future, HTTP request độc lập, write có kiểm soát. |
| **05 Cancel Agent** | Start 20-step job → Cancel → Restart | `task.cancel()` → CancelledError → `run_finished` | Progress dừng, status cancelled, history không commit | Cancel request khác terminal; không nhầm rollback history với undo side effect. |

**Code đọc:** `backend/agent.py`, `api.py`, `approvals.py`, `sessions.py`, `frontend/src/app/web.tsx`, `frontend/src/app/approval/page.tsx`. Bài 04 hiện vẫn `create_ticket_draft` mock, phải đổi theo Phase B. Không dùng DB cho M1.

**Kết quả cần đạt Module 1:** Tự giải thích được `POST → create_task → emit → queue → SSE → UI`, ApprovalBroker và Cancel, với state/file có thể kiểm chứng trên UI.

### Module 2 — Claude API Mechanics (06–12): **Claude API Lab**

**UI chính `/playground/claude-api`:** prompt editor + Run/Clear và Output Preview lớn, toggle system/history/stream/options theo từng lesson, Metrics/Raw API Inspector dưới cùng. Model ID từ backend read-only.

| ID — Feature | Input/actions | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **06 One-shot Message** | Task title+requirements → Generate Description; preset phụ: Leave Email | **Đúng một** `AsyncAnthropic.messages.create` | Draft text có thể copy/edit; response/usage/stop_reason thật; missing key hiện setup | Biết API call một lần khác Agent Loop. |
| **07 Multi-turn Conversation** | Chat 2 lượt; Include History ON/OFF | Gửi messages array thực qua Claude | Chat so sánh có/không context; history hiển thị raw | Hiểu stateless API và app giữ messages. |
| **08 Claude Streaming** | Viết prompt dài; Start/Stop Stream | Actual Anthropic stream; đưa delta lên FE bằng SSE | Live generated text, TTFT thực, final/incomplete | Phân biệt Anthropic stream và browser SSE. |
| **09 Stop Reason** | Slider max_tokens, Run twice | Claude response stop_reason thực | `end_turn` vs `max_tokens` khi xảy ra; text bị cắt được cảnh báo | Hiểu incomplete output không dùng như final. |
| **10 Token Counting** | System+prompt+tools; Count/Send | `messages.count_tokens`, optional create | Counter preflight và usage sau send, không đoán số | Phân biệt input count, output usage và context budget. |
| **11 API Error & Retry** | Chọn timeout/429/500 fault injection có nhãn; Run | Bounded retry adapter + observed attempts | Attempt timeline, backoff đo thật; reject 401 không retry | Khi nào retry và giới hạn để tránh trùng action. |
| **12 Prompt Caching** | Chọn tài liệu dài thật, Run A/Run B | Hai request Claude cấu hình cache hợp lệ | Actual cache_creation/read usage hoặc unsupported | Xác minh caching bằng usage thật, không suy diễn từ latency. |

**Code đọc:** giữ `backend/lessons/messages_api.py`; thêm module nhỏ theo lesson khi cần. UI Lesson 06 hiện đã có backend thật nhưng cần đổi theo Phase A.

**Kết quả cần đạt Module 2:** Người dùng chạy Claude thật với dữ liệu mình nhập, xem được output và request/response, hiểu history, streaming, stop reasons, token/caching/retry mà chưa dùng Agent framework.

### Module 3 — Tool Implementation (13–17): **Task Tool Playground**

**UI chính `/playground/tools`:** selector Tool, arguments Form/JSON, `Execute Direct` hoặc `Ask Claude`, output panel theo tool (numeric, Task Board, File Content), trace từng `tool_use_id`. Task DB được tạo **lần đầu khi có CRUD task thật**, không đợi Final.

| ID — Feature | Input/actions | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **13 Single Tool Calling** | Nhập các khoản tiền → `Run` | Claude `tool_use` → Python `sum` → Claude follow-up | Tổng tính bởi Python, model answer; invalid amounts | Model chọn tool, Python thực thi. |
| **14 Schema & Registry** | Chọn Tool; sửa JSON; Execute | Pydantic schema + registry dispatch | Tool result thật; unknown tool/invalid args trả lỗi | Hiểu schema, input validation, dispatch. |
| **15 Multiple & Parallel Tools** | Chọn 2–3 file thật, Sequential/Parallel | Multiple tool_use, `asyncio.gather` | File summaries, timing từng tool thật, partial failure | Tool IDs, result matching, parallelism. |
| **16 Tool Error Recovery** | Test missing file, wrong args, exception | Execution error `is_error=true` | Hiện lỗi rõ, không render success; model repair nếu được yêu cầu | Lỗi tool khác lỗi Agent; recover có giới hạn. |
| **17 Tool Policy & Approval** | List/Read/Create/Update Task → Approve/Reject | Read-only bypass approval, mutation waits backend broker | SQLite Task Board refresh sau approval, không thay đổi khi Reject | Policy, human approval, side-effect verification. |

**Kết quả cần đạt Module 3:** Tự tạo tool Python có schema, dispatch, permission; chứng minh thành công bằng calculator, file hoặc SQLite thực.

### Module 4 — Manual Agent Architecture (18–20): **Manual Agent Runner**

**UI chính `/playground/manual-agent`:** input yêu cầu + file requirements, Run/Cancel/Approve, phía trên **Task Board thật**, bên dưới Iterations/Stop Reason, Working vs Committed History, Context Usage.

| ID — Feature | Input/actions | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **18 Basic Agent Loop** | Chọn `requirements.md` → `Plan Tasks` → Approve | Bounded Claude Messages loop; `read_file → create_task` | Trace từng iteration và SQLite tasks read-back sau approval | Nắm Agent loop `tool_use → tool_result → next model call`. |
| **19 Agent State/Rollback** | Chọn Run Success/Injected Failure/Cancel | Copy working history, commit chỉ sau valid final | Diff working/committed, DB receipts tách riêng | Không nhầm history rollback với undo database. |
| **20 Context Management** | Chọn nhiều docs; Count/Run/Compact | Actual count_tokens, optional compaction supported | Trước/sau context tokens, log chỉ khi compact xảy ra | Hiểu history, token budget và giới hạn compaction. |

**Kết quả cần đạt Module 4:** Tự xây được Agent Loop hữu hạn có tools, SSE, approval, history và context; biết điểm nào model quyết định, điểm nào code quyết định.

### Module 5 — Structured Output & Validation (21–23): **Task Validation Studio**

**UI chính `/playground/validation`:** textarea yêu cầu → Extract with Claude → **Task Form và JSON editor** cùng hiển thị; Validate, Approve Save; bảng Validation Rules hiển thị Pass/Fail/Skipped từ code. Trước approval chưa insert SQLite.

| ID — Feature | Input/actions | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **21 Native Structured Output** | “Tạo task Login API, priority high…” → Extract | Claude schema-constrained TaskDraft | Form TaskDraft được điền bởi model thật, chưa persist | Phân biệt typed output với nhờ prompt trả JSON. |
| **22 Schema & Semantic** | Sửa TaskDraft JSON, Validate; preset invalid | Pydantic + custom business checks | Field errors cụ thể; negative estimate/invalid enum | Phân biệt cấu trúc hợp lệ và nghiệp vụ hợp lệ. |
| **23 Evidence & Repair** | Chọn task ID có thật/không thật; Repair; Save | SQLite existence check, bounded model repair, approval | Before/after draft, checked evidence, GET task sau save | JSON đúng schema chưa bảo đảm nguồn/bằng chứng đúng. |

**Kết quả cần đạt Module 5:** Biết bảo vệ application khỏi output sai kiểu, vô lý hoặc bịa nguồn; kết quả chưa validated không được tạo task thật.

### Module 6 — Agent Patterns & Workflows (24–28): **Task Workflow Lab**

**UI chính `/playground/workflows`:** chọn Pattern, nhập yêu cầu Task Manager, Run; sơ đồ các stage tự cập nhật từ event thực, so sánh output trước/sau, API calls, elapsed time và token; **Actual Result luôn là task draft/plan có ích**. Không hiển thị một sơ đồ success tĩnh để thay thế backend.

| ID — Feature | Input/actions | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **24 Prompt Chaining** | Nhập task thô → `Normalize → Acceptance Criteria → Estimate` | 3 model calls tuần tự, code gate giữa steps | Task draft cuối và output từng stage; gate thất bại thì dừng | Workflow cố định do developer kiểm soát. |
| **25 Routing** | Nhập “Tạo task”, “Tìm task”, “Đổi status”; Run | Claude classify intent, code gọi handler đúng | Hiển thị nhánh được chọn + state Task Board, write cần approve | Model chọn nhánh, code thực thi. |
| **26 Parallelization** | Chọn 3 tài liệu; Sequential/Parallel; optional Voting | Model calls concurrent bằng gather, aggregation | Tóm tắt 3 file thật, timing/usage đo thật, partial failure | Sectioning/voting và concurrency/cost. |
| **27 Orchestrator–Workers** | Upload project brief → Plan/Run Workers | LLM planner sinh subtask động, workers thực thi | Planner output, worker count/results thực, merged plan | Model phân chia nhiệm vụ động khác parallel cố định. |
| **28 Evaluator–Optimizer** | Tạo task plan → Evaluate → Improve | Generator + evaluator + bounded loop | Plan cũ / rubric feedback / plan cải thiện, rounds thực | Biết tổ chức vòng lặp cải thiện có giới hạn. |

**Kết quả cần đạt Module 6:** Phân biệt Agent vs fixed workflow, biết dùng đúng pattern cho Task Manager và giải thích bằng số calls/step và output thật.

### Module 7 — MCP Development (29–31): **MCP Workspace Explorer**

**UI chính `/playground/mcp`:** Connect/Disconnect, transport stdio/Streamable HTTP, tab Tools/Resources/Prompts, chọn từng item rồi Invoke/Read/Render; kết quả thực và schema trả về. MCP server dùng **cùng sandbox SQLite/files** của Task Manager.

| ID — Feature | Input/actions | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **29 MCP Server & Client** | Connect; List Tools; invoke list_tasks | FastMCP server & actual MCP client | Tool list và records SQLite thực; disconnected error | Phân biệt Host, Client, Server, discovery và invocation. |
| **30 Primitives & Transport** | Choose stdio/HTTP; list Resources/Prompts; read/render | MCP transport, resource URI & prompt invocation | Nội dung resource/prompt thực, lỗi URI không hợp lệ | Tools/Resources/Prompts khác nhau, transport khác nhau. |
| **31 Claude + MCP** | Toggle Local Tool/MCP Tool; Ask “show tasks” | Claude tool call routed qua backend local hoặc MCP client | Hai trace khác nhau, dữ liệu đọc từ cùng DB | MCP là chuẩn tích hợp, không phải một model mới. |

**Kết quả cần đạt Module 7:** Chứng minh MCP server độc lập Claude; Agent gọi MCP thật, mọi write vẫn bị policy/approval server-side kiểm soát.

### Module 8 — Claude Agent SDK & Customization (32–36): **SDK Task Agent Console**

**UI chính `/playground/sdk`:** Task Manager chat, Task Board, Files, Run/Cancel, Approval card, Session state, SDK raw messages, hooks/skills/subagents tree. Tất cả event phải từ SDK runtime thật.

| ID — Feature | Input/actions | Backend chạy thật | Actual Result & failure scenario | Kết quả cần đạt |
|---|---|---|---|---|
| **32 Basic Agent SDK** | “Show tasks” → Run | SDK query + read-only task tool | SDK messages và Task list thật | SDK thay manual loop nhưng không tự cấp quyền write. |
| **33 SDK Session/Streaming** | Chat 2 lượt → Resume → Interrupt | ClaudeSDKClient query/receive_response/resume | Actual session ID, streamed content; interrupt state | Hiểu SDK session khác FastAPI SessionStore. |
| **34 Hooks/Permissions** | Run read/write, toggle policy, Approve/Reject | PreToolUse/PostToolUse, can_use_tool actual callback | Event hook/permission có thật; denied write không thay DB | Hooks/permissions vs tool calls. |
| **35 Skills** | Chọn `task-planning` skill; Run; Compare | SKILL.md thật được SDK discover/use khi model quyết định | Show `configured` khác `invoked`; không bịa skill event | Skill là instructions/procedure, không phải executor. |
| **36 Subagents** | Yêu cầu lập kế hoạch từ nhiều docs; Run | SDK subagent definition, real delegation events | Parent-child trace và worker report thật; nếu không delegate ghi rõ | Context isolation, delegation, tools/permissions của worker. |

**Kết quả cần đạt Module 8:** Tự xây SDK Agent Task Manager có tools, sessions, hooks, approval, skills và subagents, và giải thích phần nào SDK đảm nhận so với code do developer kiểm soát.

### Module 9 — Engineering (xuyên suốt)

Giải thích requirements, separation of concerns, type-safety, timeout/error, observability, least privilege, token budget, data persistence, proper cancellation theo từng tính năng. **Không dựng module UI học lý thuyết riêng nếu không có feature thực để demo.**

## D. Four end-to-end reference demos — acceptance flow

### D1. Approval (must replace mock support in later phase)

```text
User: [File demo-notes.md] [Text Hello Agent] [Start Approval]
Backend: emit run_started → tool_call(create_file) → approval_required
Frontend: Approval card appears from actual SSE event
User Approve: POST approvals/<id> → Future.set_result(True)
Backend: write restricted file → GET read-back matches content → tool_result → final
Frontend: File Explorer shows demo-notes.md and actual content
User Reject: NO file created. Timeout: NO file created. Cancel: NO unapproved write.
```

`backend/agent.py` currently has `create_ticket_draft` mock: replace **only approval business scenario** after Pass A, retain SSE and Cancel logic. `Reset` không âm thầm delete unrelated files.

### D2. Messages API — visible feature first

```text
┌ 06 · Generate Task Description (Claude API, 1 request) ┐
│ Task title        [Build Login UI                      ] │
│ Requirements      [Email/password login + validation  ] │
│ [Generate Draft] [Preset: Leave Email] [Reset]           │
├ ACTUAL GENERATED DRAFT ─────────────────────────────────┤
│ [editable or copyable text returned by Claude]          │
│ [Copy] · Stop reason · Model · tokens · latency           │
├ Optional Inspect ───────────────────────────────────────┤
│ [Request JSON] [Response JSON] [Trace] [Source & Debug] │
└ KẾT QUẢ CẦN ĐẠT ────────────────────────────────────────┘
```

Bài này chưa có database, Agent Loop, Task Board. Nếu người dùng chọn preset Email xin nghỉ phép, output là email thật do Claude sinh với Copy button. Nếu thiếu key, chỉ show hướng dẫn cấu hình, không có email mẫu giả mạo thành công.

### D3. Manual Agent makes real tasks

```text
requirements.md file thật → agent tool_use(read_file) → read text thật
→ agent đề xuất create_task → Approval → SQLite INSERT
→ GET /api/tasks → UI Task Board hiện ID/priority/status mới
→ browser refresh vẫn thấy records.
```

Nếu Agent không gọi tool như mong muốn, show actual output và stop reason, không dựng một trace mặc định. Nếu DB đã ghi nhưng sau đó model lỗi, lịch sử có thể rollback, còn record không tự biến mất.

### D4. Parallel Documents

User chọn 3 file tồn tại → `Run Sequential` và `Run Parallel`: cả hai thật sự gọi model và tạo summary từng file. UI so sánh output và latency đo thực tế; không đảm bảo parallel luôn nhanh hơn. Nếu 1 branch lỗi, hiện partial failure và exact branch error.

## E. Incremental implementation plan (không đập bỏ code đúng)

### Pass A — FIX PRODUCT UX FIRST (LƯỢT ĐẦU CHO CLAUDE)

1. `git status` + review source local, giữ untracked/uncommitted changes; không mặc định HEAD.
2. Bỏ `KnowledgeCheckpoint` trong Lesson 06 và không dựng thêm quiz/câu hỏi. Bỏ `Studied` khỏi các phần UI đang tập trung quá nhiều vào học/score; giữ **Kết quả cần đạt**.
3. Đổi `/playground` thành Workspace Home, có quick launch rõ các demo khả dụng. Coming Soon trung thực, không fake route.
4. Reorder Lesson 06: editable inputs + **Generated Draft preview chính** + Copy; dưới đó mới có metrics/Inspector/Code, Concept gọn trong Collapse. Preset mặc định Task Description, giữ Leave Email preset. **Tái sử dụng backend `run_messages_api()` đang gọi Claude thật**, không thêm DB/Agent Loop ở lượt này.
5. Giữ Next.js TypeScript, antd, existing routes `/`, `/approval`, port 3001/9000; không tự thêm framework/ORM. Check typecheck/build, các route cũ, offline smoke; live verify chỉ khi có key. Cập nhật README và trạng thái thực. DỪNG, chờ review.

### Pass B — APPROVAL REALLY DOES WORK

1. Migrate demo `/approval` từ `create_ticket_draft` giả sang safe `create_file` (fixed allowlisted path).
2. Approve → file thật xuất hiện; Reject/Cancel → file không được ghi; GET read-back và UI File Explorer; file permission chỉ backend thực hiện.
3. Verify timer/timeout/cancel/stale approval. DỪNG, chờ review.

### Pass C — ONE FEATURE PER LESSON

M2 07–12 → M3 13–17 (calculator/file/SQLite) → M4 18–20 → M5 21–23 → M6 24–28 → M7 29–31 → M8 32–36 → Final. **Không làm tất cả 36 page cùng lúc.** Nút/route lesson chưa implement vẫn Coming Soon.

## F. Definition of Done cho một lesson Workspace App

- [ ] Người xem **nhìn ngay nút và kết quả** biết chức năng demo, không cần đọc Concept.
- [ ] `Run` thật sự gọi backend function/Claude/Tool/SDK tùy lesson; không có JS fake output.
- [ ] Actual Result là **UI nghiệp vụ** (draft text, number, task board, file, validation errors, workflow output) và không chỉ Raw JSON/trace.
- [ ] Trace/metrics/tokens/latency đúng run thật; `—` nếu unavailable; controlled fault có nhãn.
- [ ] Có các trường hợp **Success/Failure** chạy được, hoặc hướng dẫn cách tạo fault hợp lệ, không phải quiz.
- [ ] Source Code là file Python/TSX thật đang được thực thi; có vị trí breakpoint và giải thích input → execution → output.
- [ ] **Kết quả cần đạt** 2–4 điều có thể đối chiếu ngay với demo, không câu hỏi.
- [ ] Approval/Cancel đúng run; không tự giả final hoặc rollback file/DB; mutation được GET read-back, persisting after browser refresh.
- [ ] Cấu hình API key chỉ backend, không lộ secrets, sandbox path an toàn; no auto API call on mount.
- [ ] TypeScript typecheck, build/smoke, old SSE + Approval routes còn chạy. README nói rõ live verified/unverified. Không auto commit/push/deploy.

## G. Final Demo — AI TASK MANAGER WORKSPACE APPLICATION (sau khi học đủ)

`/workspace`: Agent SDK chat + Task Board SQLite + File Explorer + Reports + Approval + Cancel + Trace/SDK event tree. User upload requirement document, Agent đọc, phân tích và tạo Task Draft, chờ approval trước khi write, read-back Task Board, tạo Markdown plan nếu được approve; hỏi lượt tiếp theo để cập nhật status. Skill/subagent/hook chỉ hiện khi SDK thực sự phát sự kiện.

**Lưu ý:** final không phải lần đầu có UI Task Manager. Các module Tools/Manual Agent/Validation/Workflows/MCP/SDK đều đã có từng mini application thật trước đó.

## H. Sau mỗi lần implementation phải báo cáo

Route/feature, files changed, input → code → output, 2–4 breakpoint, run success/failure thực tế, kết quả read-back, phần chưa verify, **Kết quả cần đạt**. Không đặt câu hỏi trắc nghiệm. Dừng để user review rồi mới làm feature tiếp.
