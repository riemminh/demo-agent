# REFACTOR PLAN — Demo Agent: 8 Interactive Demos

> **Mục tiêu:** Chuyển `demo-agent` từ website liệt kê 36 lesson thành **8 demo tương tác**, mỗi demo có nhiều scenario để giải thích các kỹ thuật Claude Agent bằng code chạy thật.  
> **Repository:** https://github.com/riemminh/demo-agent  
> **Source đã đọc:** GitHub HEAD `95e360e59d293aa52472e692407ac8a10563c486`. **Trước khi chỉnh sửa phải review lại working tree tại máy**, không mặc định HEAD GitHub là phiên bản local.  
> **Thay thế:** Cách chia UI/navigation 36 lesson trong `plan-v2.md` và `plan-v3-feature-first.md`. Có thể giữ những yêu cầu kỹ thuật không xung đột (bảo mật, dữ liệu thật, kiểm chứng, Ant Design).  
> **Ngôn ngữ triển khai và giải thích:** Tiếng Việt.  
> **Nguyên tắc:** Simple → Correct → Maintainable → Optimize later.

---

## 1. Product intent — đọc phần này trước khi code

Đây **không phải** LMS/website quiz, cũng **không phải** 36 trang documentation. Đây là một **AI Agent Interactive Demo Workspace** để học và thuyết trình.

Mỗi menu đại diện cho **một chủ đề demo hoàn chỉnh**. Trong menu có những **scenario/mode** nhỏ (giống nút `Start Approval Agent` và `Start Long Running Agent` ở legacy). Người xem:

1. Chọn một scenario; nhập/chỉnh input nếu cần.
2. Bấm **Run / Approve / Reject / Cancel** hoặc nút liên quan.
3. Nhìn thấy **Actual Result** thay đổi thật, hoặc trạng thái thật.
4. Theo dõi **Execution Events** đúng thứ tự thời gian.
5. Xem **Source Code + điểm breakpoint** để hiểu chính xác function nào đã chạy.
6. Đọc **Kết quả cần đạt** — 2–4 ý đúc kết, không có quiz.

**Một demo có thể giải thích nhiều kiến thức có liên quan. Không cần một page cho từng thuật ngữ.**

Business domain xuyên suốt khi cần thao tác lưu dữ liệu: **Task Manager nhỏ dùng SQLite** (title, priority, status, deadline), kèm filesystem sandbox nếu cần. Không biến Task Manager thành một sản phẩm SaaS lớn. Những ví dụ dễ hiểu hơn (calculator, email, text transform) được phép dùng cho kiến thức nền tảng.

**Không được:** fake Claude response, giả tool result/trace, tạo 36 placeholder page, hàng loạt menu disabled, quiz/chấm điểm, app framework tự chế, tự ý commit/push/deploy, auto-run Claude khi mở page, hardcode API key frontend.

### 1.1. Hiện trạng thực tế của repo tại commit đã review

| Source hiện tại | Đánh giá | Xử lý |
|---|---|---|
| `backend/api.py`, `sessions.py`, `approvals.py` | Session + async Task + Queue + SSE + Future + Cancel đã có | **Giữ**, không viết lại trong đợt layout |
| `backend/agent.py` | Có kịch bản SSE/approval/long; approval còn `create_ticket_draft` giả lập | Giữ cơ chế; đổi nghiệp vụ sau thành write sandbox/SQLite thật ở một phase riêng |
| `backend/lessons/messages_api.py`, `playground_api.py` | Có `AsyncAnthropic.messages.create()` thật và REST response/usage/latency | **Giữ**, tái sử dụng trong Claude API Demo |
| `frontend/src/app/web.tsx` | UI SSE legacy | Chuyển thành **scenario SSE** của demo Runtime, bảo toàn logic |
| `frontend/src/app/approval/page.tsx` | UI Approval + Cancel legacy, có event log | Chuyển thành **scenarios Approval/Cancel** của demo Runtime; giữ hành vi trước khi polish |
| `frontend/src/app/(playground)/lessons/messages-api/*` | UI Task Description Generator dùng Claude thật, có result/copy/edit/metrics | Dùng làm **scenario One-shot** trong Claude API Demo; không rebuild |
| `frontend/src/components/PlaygroundShell.tsx` | Header + Sidebar Ant Design | **Giữ làm layout chung** |
| `frontend/src/lib/lessons.ts`, `LessonMenu.tsx` | Metadata 36 lesson + disabled | **Thay bằng 8 demo**, scenario không nằm thành 36 menu |
| `frontend/src/app/(playground)/layout.tsx` | Shell chỉ áp dụng cho một route group | Di chuyển/tái cấu trúc để mọi demo dùng chung shell |
| `frontend/src/app/page.tsx`, `frontend/src/app/approval/page.tsx` | Nằm ngoài shell | Chuyển/redirect sang cùng workspace mà vẫn hỗ trợ URL cũ |

**Chưa có implementation hoàn chỉnh** cho Tool Registry/Manual Loop/Structured Output/Workflow/MCP/SDK trong HEAD trên. Plan này mô tả mục tiêu, không xác nhận các tính năng ấy đã chạy. Chưa thực hiện smoke test live trong lượt review này.

---

## 2. Chỉ 8 menu — không còn 36 lesson trên sidebar

| # | Menu / route chính | Scenario ở **trong cùng một page** | Chức năng chính |
|---|---|---|---|
| 01 | **Agent Runtime** `/runtime` | SSE · Approval / Reject · Cancel | Quan sát lifecycle Task, Queue, Event, Future |
| 02 | **Claude API** `/claude-api` | One-shot · History · Streaming · API behavior | Gọi Claude thật, xem response và usage |
| 03 | **Tool Calling & Registry** `/tools` | Single Tool · Registry · Tool Error · Multiple Tools | Claude yêu cầu, Python thực thi |
| 04 | **Manual Agent Loop** `/manual-agent` | Normal · Max Turns · Tool Failure · Cancel/Rollback · Context | Tự viết loop, quản lý messages và stop condition |
| 05 | **Structured Output** `/structured-output` | Typed Output · Schema Validation · Semantic/Evidence · Repair | JSON có cấu trúc và validation thật |
| 06 | **Agent Workflows** `/workflows` | Chaining · Routing · Parallel · Orchestrator · Evaluator | So sánh năm patterns |
| 07 | **MCP** `/mcp` | Connect/Discover · Invoke · Resources/Prompts · Agent+MCP | MCP server/client/tool thực sự chạy |
| 08 | **Claude Agent SDK** `/agent-sdk` | Basic · Sessions/Streaming · Permissions/Hooks · Skills · Subagents · Final Task Agent | SDK thay Manual Loop, ghép thành Task Agent |

**Sidebar chỉ có 8 menu này** (cùng `Workspace Home`, nếu cần). Không thêm submenu 36 bài. Scenario trong page dùng `Segmented`, `Tabs` hoặc nhóm nút; chỉ triển khai một kiểu dễ nhất và nhất quán. Menu chưa có backend chạy thì có thể hiển thị trong **roadmap ngắn riêng**, nhưng **không hiện thành một mục disabled trong sidebar trình diễn**; khi hoàn thành mới thêm vào sidebar. Có thể giữ 8 mục với nhãn “Chưa triển khai” nếu người dùng muốn xem outline, nhưng mặc định sidebar demo chỉ liệt kê trang chạy được.

### 2.1. Đối chiếu 11 chủ đề CCDV-F

| Chủ đề phải thuyết trình | Demo giải thích trực tiếp |
|---|---|
| 1.1 Agent Architecture | 01 Runtime + 04 Manual Agent |
| 1.2 Agent Construction with Claude | 02 Claude API + 03 Tools + 04 Manual + 08 SDK |
| 1.3 Agent Patterns and Frameworks | 06 Workflows + 08 SDK |
| 8.1 Tool Implementation | 03 Tool Calling & Registry |
| 8.2 MCP Server Development | 07 MCP |
| 8.3 Agentic Customization | 08 SDK (hooks, permissions, skills, subagents) |
| 2.1 Understanding Requirements | User story ngắn + input/output/acceptance cho mỗi demo |
| 2.3 Claude API Mechanics | 02 Claude API |
| 2.4 Software Engineering Foundations | Giải thích separation of concerns, async, validation, error qua source từng demo |
| 2.5 Claude Application Design | Cấu trúc FastAPI + Next.js + state + data store xuyên suốt |
| 6.3 Output Handling — Structured Output & Validation | 05 Structured Output |

Domain 2.1/2.4/2.5 **không tạo ba menu riêng**: minh họa ngay khi đọc code/function của mỗi demo.

---

## 3. UI thống nhất — lấy Legacy Approval + Cancel làm chuẩn

### 3.1. Wireframe mỗi trang

```text
┌─ Header: AI Agent Demo Workspace ─────────────────────────────────────────────┐
│ Backend: Online/Offline | Model: ... | No secrets                           │
├─ Sidebar (giữ nguyên) ─┬─ MAIN (chỉ phần này thay khi click menu) ───────────┤
│ Workspace Home         │  03 · Tool Calling & Registry                        │
│ 01 Agent Runtime       │  Claude gọi tool nhưng Python thực thi tool          │
│ 02 Claude API          │  [Single Tool] [Registry] [Tool Error] [Multiple]    │
│ 03 Tools               │  Input [.........................] [Run] [Reset]      │
│ 04 Manual Agent        │                                                      │
│ ...                    │  ┌ ACTUAL RESULT ─────────────────────────────────┐  │
│                        │  │ 250.000 VND / task được tạo / error thực tế     │  │
│                        │  └───────────────────────────────────────────────┘  │
│                        │  EXECUTION EVENTS                                  │
│                        │  1. API request                                    │
│                        │  2. tool_use                                       │
│                        │  3. Python executor                                │
│                        │  4. tool_result                                    │
│                        │  5. Claude final                                   │
│                        │  [Source Code] [Request/Response] [Debug]          │
│                        │  KẾT QUẢ CẦN ĐẠT: 2–4 gạch đầu dòng                 │
└────────────────────────┴──────────────────────────────────────────────────────┘
```

**Thứ tự bắt buộc:** `Scenario → Input/Actions → Actual Result → Events → Source/Debug → Kết quả cần đạt`.

- `Ant Design`: dùng `Layout`, `Menu`, `Segmented`, `Card`, `Button`, `Input`, `Tabs`, `Timeline`, `Alert`, `Descriptions`, `Tag` khi phù hợp; không thêm framework UI khác.
- Giữ light theme và typography dễ trình chiếu. Source code/JSON dùng monospace, hỗ trợ Copy.
- Trace không xuất hiện dưới dạng danh sách “SUCCESS” giả trước khi Run. Không tạo API Call/Tool Call nếu runtime không báo sự kiện đó.
- Một run chỉ hiển thị dữ liệu của run tương ứng; reset UI chỉ xóa kết quả trên màn hình, **không được âm thầm xóa dữ liệu SQLite/file**.
- Nút Approve/Reject chỉ có khi `approval_required` thật; Cancel thực sự gửi yêu cầu hủy backend Task/SDK tương ứng (không chỉ abort fetch).
- Nút Run bị khóa trong lúc đang chạy nếu cùng một session không hỗ trợ concurrent runs.
- Mỗi mode phải có câu mẫu/preset để người xem không cần nghĩ prompt khi live sharing, nhưng input được sửa.
- **Kết quả cần đạt** không phải quiz; ghi rõ: làm được gì, kiến thức hiểu được, phân biệt với demo trước.
- Không ép SSE vào demo one-shot REST; mỗi màn hình chỉ dùng transport thực sự cần thiết.

### 3.2. Routing + persistent sidebar (P0 bắt buộc)

Hiện `frontend/src/app/(playground)/layout.tsx` chỉ bao các page bên trong group, còn `/` và `/approval` nằm ngoài. Vì vậy điều hướng sang legacy page làm sidebar biến mất.

**Hướng triển khai ưu tiên:**

```text
frontend/src/app/
├── layout.tsx                         # html/body, metadata
├── page.tsx                           # redirect / -> /workspace (tương thích link cũ)
├── approval/page.tsx                  # redirect /approval -> /runtime?scenario=approval
└── (workspace)/
    ├── layout.tsx                     # AntdRegistry + Providers + shared PlaygroundShell
    ├── workspace/page.tsx             # Home, chỉ launch demo có thật
    ├── runtime/page.tsx               # SSE / Approval / Cancel
    ├── claude-api/page.tsx            # One-shot / History / Streaming...
    ├── tools/page.tsx
    ├── manual-agent/page.tsx
    ├── structured-output/page.tsx
    ├── workflows/page.tsx
    ├── mcp/page.tsx
    └── agent-sdk/page.tsx
```

> **Chỉ tạo page của demo đã implement**. Các path khác trong sơ đồ là đích triển khai, không tạo placeholder có nút giả. Có thể chuyển `(playground)` thành `(workspace)` hoặc giữ tên group hiện tại nếu tiết kiệm diff; quan trọng là **tất cả demo được render dưới cùng shared shell**.

- URL theo Next.js App Router thay đổi bình thường; **Header + Sidebar không unmount**, chỉ Main Content đổi.
- Legacy URL phải redirect/open đúng demo tương ứng, hoặc giữ đường dẫn cũ nhưng nằm cùng shared layout. Tránh hai shell lồng nhau hoặc route conflict.
- Query `?scenario=sse|approval|cancel` chọn scenario; reload URL không làm chạy lại agent tự động.
- Giữ backend endpoint `/api/sessions/...` để không break logic cũ.
- Khi chuyển trang lúc run còn active: hiển thị cảnh báo hoặc xử lý lifecycle hợp lý; **đóng browser stream không có nghĩa backend Task đã cancel**.

---

## 4. Đặc tả đúng 8 demo

### 01 — Agent Runtime

**Các nút/scenario:** `Start SSE` · `Start Approval` · `Approve` · `Reject` · `Start Long Running` · `Cancel`.

**Người xem làm:** gửi message, nhìn live text và event log tăng dần; cho phép/từ chối một thao tác; hủy giữa lúc đang chờ.

**Backend:** giữ `SessionStore`, `asyncio.create_task`, `Queue`, `emit`, `queue.get`, `StreamingResponse`, `ApprovalBroker`, `Future`, `Task.cancel`. Ở đợt tiếp theo đổi `create_ticket_draft` mock thành tạo một task hoặc file **trong sandbox**, kiểm chứng bằng read-back. Vẫn giữ timed coroutine để minh họa cancellation; ghi nhãn rõ đó là controlled timing.

**Kết quả cần đạt:** giải thích được `POST → Task → emit → Queue → SSE → React`; vì sao phải `await Future` và `resolve` từ request khác; cancel tác động vào backend chứ không phải chỉ frontend.

**Kiểm chứng:** SSE events đến từng đợt; Approve có side effect thật; Reject không ghi; Cancel có terminal event; task/session không bị xóa lịch sử cũ. Đừng nói cancel hoàn tác các side effect đã commit.

### 02 — Claude API

**Các mode:** `One-shot` (đang có) · `History On/Off` · `Streaming` · `API Behavior` (max_tokens, usage, error; caching/retry để sau nếu cần).

**Người xem làm:** nhập yêu cầu tạo task description, xem draft thật; thử follow-up có/không có history; xem text được streaming dần; đặt `max_tokens` thấp để thấy stop reason.

**Backend:** giữ `messages.create` hiện tại; bổ sung endpoint/mode vừa đủ. Không tạo Agent Loop. Các field API, token, latency từ response thực tế; fault injection cho lỗi có nhãn rõ và không tạo rate limit giả như lỗi API tự nhiên.

**Kết quả cần đạt:** hiểu request/response, stateless API, streaming, `stop_reason`, usage, điểm khác giữa một API call và Agent.

**Kiểm chứng:** default One-shot không gọi tool, không ghi SQLite; kết quả live thật nếu key tồn tại; failure/missing-key hiển thị rõ.

### 03 — Tool Calling & Registry

**Các mode:** `Single Tool` · `Registry` · `Tool Error` · `Multiple Tools` (optional cuối phase, không bắt buộc ngay).

**Người xem làm:** nhập các số → Claude yêu cầu `calculate` → Python tính thật; dùng dropdown chọn tool/schema; thử unknown tool và input invalid; sau đó minh họa task SQLite nếu đã đến phase storage.

**Backend:** Python functions đơn giản; schema khai báo rõ; `TOOL_REGISTRY` dict, executor validate arguments, tool result liên kết bằng `tool_use_id`; khi có side effect phải được kiểm soát quyền. Cho phép force tool trong bài để chắc chắn thấy `tool_use`; ghi rõ mode force/auto.

**Kết quả cần đạt:** hiểu Claude chỉ **yêu cầu** gọi tool; application thực thi, chọn function theo registry, validate input, trả `tool_result` (kể cả lỗi) về Claude.

**Kiểm chứng:** calculator ra số từ Python; unknown tool không thực thi; SQLite task tạo thật sau approval (khi đã được implement); raw I/O và event khớp nhau.

### 04 — Manual Agent Loop

**Các mode:** `Normal` · `Max Turns` · `Tool Error` · `Cancel & History` · `Context` (có thể bổ sung sau).

**Người xem làm:** yêu cầu kiểm tra task hiện có và tạo task còn thiếu; quan sát nhiều vòng `messages.create → stop_reason → tool_use → tool_result → messages.append`; thử dừng vì giới hạn hoặc lỗi.

**Backend:** một vòng lặp manual dễ đọc, `MAX_TURNS`, `working_history` và `committed_history`, tool executor từ demo 03, approval từ demo 01. Không làm thành generic agent framework.

**Kết quả cần đạt:** giải thích rõ mỗi iteration, ai quyết định gọi tool, khi nào loop dừng, tại sao không commit history nửa vời khi cancel/error. Phân biệt rollback history với rollback dữ liệu đã ghi.

**Kiểm chứng:** loop thường hoàn thành; max-turn bị dừng có thông báo; tool error được đưa vào tool result; cancel không commit conversation không hoàn chỉnh.

### 05 — Structured Output

**Các mode:** `Generate Task JSON` · `Schema Validation` · `Business Validation` · `Evidence/Repair`.

**Người xem làm:** nhập mô tả công việc, Claude sinh object `TaskDraft`; thử JSON sai enum, thiếu field, estimate âm, task/source ID không tồn tại; xem lỗi field và sửa, thử repair có giới hạn.

**Backend:** native structured output nếu model/API hỗ trợ, Pydantic, validation logic độc lập; test fixture offline có nhãn; không ghi DB cho object chưa pass validation.

**Kết quả cần đạt:** phân biệt schema hợp lệ với dữ liệu hợp nghiệp vụ, biết khi nào yêu cầu model sửa và giới hạn retry.

**Kiểm chứng:** data hợp lệ qua; invalid fail thật; repair attempt count thật; dữ liệu fail không tạo task.

### 06 — Agent Workflows

**Các mode:** `Prompt Chaining` · `Routing` · `Parallelization` · `Orchestrator–Workers` · `Evaluator–Optimizer`.

**Người xem làm:** chọn một mode, Run; UI thể hiện các bước/nhánh thực thi, đầu ra mỗi bước, số model calls, tổng thời gian.

**Use case đơn giản:** Chaining: viết email → review → polish; Routing: phân loại Translate/Calculate/Task; Parallel: tóm tắt hai file độc lập; Orchestrator: chia yêu cầu website thành các bước; Evaluator: dịch → nhận xét → cải thiện. Không cần cố ép năm patterns vào một pipeline.

**Kết quả cần đạt:** phân biệt workflow do developer định nghĩa trước với Agent/Orchestrator cho model quyết định; biết trade-off về latency, cost và khả năng kiểm soát.

**Kiểm chứng:** bước thực tế khớp pattern; parallel chứng minh chạy đồng thời bằng log timing; model decisions không bị hardcode; không giả workflow trace.

### 07 — MCP

**Các mode:** `Connect & List Tools` · `Call Tool` · `Resources & Prompts` · `Claude + MCP` (cuối phase).

**Người xem làm:** kết nối MCP server local, xem danh sách tools và schema, chọn tool để thực thi thật, đọc result; sau đó so sánh cách Agent gọi cùng tool qua MCP.

**Backend:** MCP Server/Client thật; bắt đầu với **stdio** (ít moving parts), sau đó mới có Streamable HTTP nếu cần demo transport. Tool có thể là calculator hoặc `list_tasks`; write phải qua policy/approval server-side.

**Kết quả cần đạt:** phân biệt Host, Client, Server, Tool/Resource/Prompt, MCP tool call và local Python function call.

**Kiểm chứng:** list_tools/call_tool thật; output đọc từ server, không phải array cứng; disconnect/invalid tool báo lỗi.

### 08 — Claude Agent SDK

**Các mode:** `Basic SDK Agent` · `Session & Streaming` · `Hooks/Permissions` · `Skills` · `Subagents` · `Final Task Agent`.

**Người xem làm:** nhập yêu cầu, Agent xử lý với SDK, có thể gọi tool, chờ approval, xem tool/hook/child agent event nếu thực sự xảy ra. Final scenario xử lý một yêu cầu Task Manager có read/list/create/update và DB read-back.

**Backend:** dùng SDK phù hợp version được verify; không tự tái tạo Manual Loop bên trong SDK. SDK runtime quản lý loop; application vẫn quản lý web session, event translation, permissions, persistence, boundaries.

**Kết quả cần đạt:** hiểu phần nào SDK đảm trách và phần nào developer vẫn phải kiểm soát; dùng hooks, permissions, skills, subagents đúng vai trò; biết giới hạn khi chưa có event thực tế.

**Kiểm chứng:** demo SDK live, SDK result/usage từ runtime; skill/subagent **chỉ ghi là invoked khi có bằng chứng thật**; final task thực sự được đọc lại từ SQLite; không tạo workflow fake.

---

## 5. Kiến trúc tối thiểu — không overengineering

### Frontend dự kiến (xây tăng dần)

```text
frontend/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # redirect legacy URL
│   ├── approval/page.tsx           # redirect legacy URL
│   └── (workspace)/
│       ├── layout.tsx             # Shell cố định
│       ├── workspace/page.tsx
│       ├── runtime/page.tsx
│       ├── claude-api/page.tsx
│       ├── tools/page.tsx          # tạo khi demo 03 sẵn sàng
│       ├── manual-agent/page.tsx   # tạo khi demo 04 sẵn sàng
│       ├── structured-output/page.tsx
│       ├── workflows/page.tsx
│       ├── mcp/page.tsx
│       └── agent-sdk/page.tsx
├── components/
│   ├── PlaygroundShell.tsx
│   ├── DemoMenu.tsx
│   ├── CodeBlock.tsx
│   └── LearningOutcome.tsx
└── lib/
    ├── api.ts
    └── demos.ts                    # metadata chỉ của 8 demo
```

Không cần tạo generic `DemoEngine`, `ScenarioFactory`, `EventBus`, Zustand/Redux, thư viện diagram hoặc custom routing.

### Backend dự kiến (giữ các file cũ)

```text
backend/
├── api.py                          # existing sessions/SSE/approval/cancel
├── agent.py                        # existing runtime scenarios
├── sessions.py
├── approvals.py
├── playground_api.py               # existing Messages API routes
├── config.py
├── lessons/messages_api.py         # giữ code live hiện có
└── demos/                          # chỉ tạo file theo demo đang làm
    ├── tools.py
    ├── manual_agent.py
    ├── structured_output.py
    ├── workflows.py
    ├── mcp_server.py
    ├── mcp_client.py
    └── sdk_agent.py
```

SQLite repository và sandbox file helper chỉ bổ sung khi chức năng cần; không viết generic layer trước. Giữ `.env` local (`ANTHROPIC_API_KEY`, `LLM_MODEL`), không đưa secret vào API response/logs. Tool filesystem chỉ được truy cập sandbox được chỉ định và kiểm tra path traversal/symlink.

### Event + Result contract tối thiểu

- **REST đơn giản** (Messages API, deterministic validation): `request → response`, không ép SSE.
- **SSE** (streaming, Agent loop, approval, SDK): `run_started`, `text_delta`, `tool_call`, `tool_result`, `approval_required`, `approval_decision`, `error`, `final`, `run_finished` khi áp dụng; không phát event giả chỉ để khớp sơ đồ.
- Mỗi scenario định nghĩa input/response cụ thể, giữ những trường cũ đang dùng; chỉ thêm `run_id`, `timestamp`, metrics khi có dữ liệu thật và nhu cầu thực.
- Tách ba thứ: **LLM-generated answer**, **tool execution receipt**, **verified persistent state**. Không lấy lời model nói “đã tạo task” làm bằng chứng SQLite đã được ghi.

---

## 6. Refactor theo thứ tự — giao Claude từng phase, không làm 8 demo cùng lúc

### Phase A — **Navigation & Shell (ưu tiên #1)**

**Phạm vi:** sửa FRONTEND routing, sidebar, shared layout; không thay agent/backend behavior.

1. Inspect local working tree/diff; lưu lại route và behavior hiện có.
2. Chuyển `PlaygroundShell`, `AntdRegistry`, `Providers` thành layout chung cho tất cả demo.
3. Chuyển SSE/Approval UI dưới `/runtime` với 3 mode: SSE, Approval, Cancel; giữ code fetch/reader/broker hiện có, không rewrite async logic không cần thiết.
4. Chuyển Messages API UI hiện tại dưới `/claude-api` với mode One-shot; giữ `DraftResult`, Metrics, Inspector.
5. `/` và `/approval` hỗ trợ URL cũ bằng redirect; không render UI cũ ngoài shell.
6. Thay `LessonMenu` + 36 `lessons.ts` entries bằng menu **8 demo tối đa**, chỉ hiện demo đã implement; các demo còn lại ở Roadmap nhỏ.
7. Kết quả cần đạt ở cuối mỗi page, bỏ quiz/Studied/36 lesson progress và Prev/Next theo lesson ID.
8. Sửa link trong README và header. Không tạo page rỗng/bấm không chạy.

**Gate A:** vào `/workspace` → `Runtime` (SSE, Approve, Reject, Cancel) → `Claude API` (Generate Draft) → trở lại Home; Header+Sidebar không biến mất; reload các URL hoạt động; endpoints cũ chạy; typecheck/build pass. Không tự gọi Claude khi page load.

### Phase B — **Runtime thực tế (ưu tiên #2)**

Giữ cơ chế ApprovalBroker; đổi support mock ticket thành thao tác **tạo task SQLite** hoặc file sandbox dễ read-back. Bổ sung UI hiển thị dữ liệu trước/sau, Approve có artifact thật, Reject không tạo, Cancel có terminal event. Giữ cả mode long-run để minh họa cancellation, không cần viết thêm một feature Cancel riêng.

**Gate B:** thực thi được 3 tình huống Approval/Reject/Cancel; kết quả được GET/read-back từ backend, không suy đoán từ event `final`; không xóa dữ liệu ngoài demo sandbox.

### Phase C — **Tools (ưu tiên #3)**

Implement demo 03: single tool `calculate`, registry dict, invalid input/error; hiển thị Claude tool_use, Python execution, tool_result, final; bổ sung task SQLite sau khi cần write. **Chỉ thêm 1 page + module backend tối giản**.

**Gate C:** có một tool được Claude chọn/bắt buộc chọn và Python thực thi thật; error case không tạo side effect; giữ Tool Registry readable.

### Phase D — **Manual Loop (ưu tiên #4)**

Implement demo 04, tái sử dụng calculator/task tool thay vì copy toàn bộ business logic. Thêm normal/max turns/tool error/cancel; history commit chỉ khi thành công. Context có thể là một mode nâng cao triển khai sau.

### Phase E — **Structured Output (ưu tiên #5)**

Implement demo 05: TaskDraft schema, native structured output + validation pipeline; optional bounded repair. Không tự ghi DB trên validation fail.

### Phase F — **Agent Workflows (ưu tiên #6)**

Implement demo 06 với năm mode; ưu tiên Chaining/Routing/Parallel trước; Orchestrator/Evaluator sau nếu chi phí hoặc độ phức tạp chưa phù hợp.

### Phase G — **MCP (ưu tiên #7)**

Implement demo 07: client/server stdio + read tool trước; thêm resources/prompts và integration Claude sau. HTTP transport chỉ nếu cần trình bày so sánh transport.

### Phase H — **SDK + Final scenario (ưu tiên #8)**

Implement demo 08: SDK Agent tối giản → session/stream → permissions/hooks → skill/subagent; ghép scenario Task Manager cuối cùng, không tạo một app UI thứ chín. Đọc lại SQLite/file làm Actual Result.

**Mỗi phase làm xong phải dừng để người dùng review.** Không implement đồng loạt 8 demo.

---

## 7. Definition of Done cho từng Demo

- [ ] Một menu chính → một demo page; scenario chuyển trong page, không mất Header/Sidebar.
- [ ] Có thể nói 1 câu rõ ràng: **Demo này giải thích cơ chế gì?**
- [ ] Input/preset + action thật + status thật; không có nút vô tác dụng.
- [ ] Actual Result lớn, lấy từ backend/model/tool/storage thật; failure/reject/cancel có kết quả đúng.
- [ ] Event log theo runtime; request/response/source chỉ ở vùng debug phụ, nhưng truy cập được.
- [ ] 2–4 breakpoint chính xác (tên file, function, dòng hoặc marker có thật).
- [ ] **Kết quả cần đạt** ngắn, không quiz/trắc nghiệm/chấm điểm.
- [ ] Không fake token, latency, tool_use, skill, subagent hoặc persistence.
- [ ] Loading/error/empty/cancel trạng thái đúng; không tự gọi model khi mount.
- [ ] API key chỉ ở backend. Không commit `.env` hoặc xuất raw secret vào UI.
- [ ] Backend smoke test phù hợp, TypeScript type-check, frontend build; live API verify có giới hạn khi key sẵn có, ghi rõ phần chưa verify.
- [ ] README có route, lệnh chạy, flow, ví dụ success/failure và breakpoint.
- [ ] Không thay đổi logic không liên quan, không commit/push/deploy khi chưa được yêu cầu.

### Checklist demo thuyết trình

Cho mỗi demo, người trình bày làm theo: **(1) Giới thiệu 1 câu → (2) Run → (3) Quan sát Result → (4) Mở Events → (5) Mở code ở breakpoint → (6) Đúc kết.**

Ví dụ trình tự dễ hiểu: Runtime → Claude API → Tool Calling → Manual Loop → Structured Output → Workflows → MCP → SDK/Final. Không cần trình bày tất cả scenario nếu thời gian hạn chế.

---

## 8. Prompt giao Claude — chỉ thực hiện Phase A trước

> Copy nguyên đoạn dưới đây khi bắt đầu refactor.

```text
Hãy đọc toàn bộ refactor-plan-8-demos.md tại root repository demo-agent và review working tree hiện tại.

Plan này thay thế cách tổ chức 36 lesson trong plan-v2.md / plan-v3-feature-first.md về UI, navigation và phạm vi demo. Mục tiêu là đúng 8 demo tương tác, mỗi demo có những scenario nhỏ như legacy Agent Approval + Cancel, không phải 36 page học lý thuyết.

TRONG LƯỢT NÀY CHỈ LÀM PHASE A — Navigation & Shared Layout:

1. Giữ toàn bộ logic backend Session, Task, Queue, SSE, Future, ApprovalBroker, Cancel và Anthropic Messages API đang chạy.
2. Dùng Next.js App Router shared layout + Ant Design cho toàn bộ Workspace. Chuyển trang chỉ thay Main Content, không mất Header/Sidebar.
3. Gom SSE, Approval và Cancel vào 1 trang /runtime có các scenario; giữ fetch SSE và approval endpoints hiện tại.
4. Chuyển One-shot Generate Task Description hiện có vào /claude-api, không viết lại messages.create hoặc thêm Agent Loop.
5. Sidebar tối giản: 8 demo là mục tiêu cuối, trước mắt chỉ hiện demo đã implement. Các demo chưa có nằm ở Roadmap, không hiện hàng loạt mục disabled.
6. Giữ link / và /approval bằng redirect hợp lý; refresh URL và back/forward hoạt động.
7. UI mỗi demo theo thứ tự: Scenario/Input/Run → Actual Result → Execution Events → Source/Debug → Kết quả cần đạt. Không quiz, không Studied, không progress 36 lessons.
8. Không triển khai Tool Calling, Manual Loop, Structured Output, Workflows, MCP hay SDK trong Phase A. Không tự thêm framework hoặc refactor backend không liên quan.
9. Kiểm tra TypeScript type-check, frontend build và smoke test backend/legacy flows; cập nhật README và trạng thái implementation thực tế. Chỉ gọi Claude live khi đã có cấu hình và người dùng chủ động kiểm tra.
10. Không tự commit, push hoặc deploy. Dừng sau Phase A để tôi review.

Sau đó báo bằng tiếng Việt: source files changed; routing cũ/mới; vì sao sidebar không còn mất; luồng chạy SSE/Approval/Claude API; các bước đã verify và chưa verify; 2–4 breakpoint quan trọng.
```

---

## 9. Quyết định để không bị phình scope nữa

- **Đúng 8 demo chính**, không tạo lại 36 lesson dưới dạng submenu.
- **Approval + Cancel là một phần của Runtime**, không viết page riêng cho từng kỹ thuật.
- **Tool Call + Registry + Errors là một demo**, không chia mỗi cái một page.
- **Manual Loop chứa history/rollback/max-turn**, không tách thêm app.
- **Five Agent Patterns nằm trong một Workflow Lab**, không tạo 5 page.
- **SDK + final Task Manager là một console demo**, không cần ứng dụng hoàn toàn riêng.
- Chỉ thêm abstraction chung khi ít nhất hai demo đang cần cùng một code và sự chia sẻ đó làm code dễ hiểu hơn.
- Một feature chưa có code thật thì không hiển thị nút chạy. Mỗi phase kết thúc bằng một tính năng đã xác minh, không phải một bộ khung UI mở rộng.

**Kết quả cuối cùng mong muốn:** Người xem có thể mở 8 demo, bấm thử, quan sát backend thực thi, đọc được code và giải thích chính xác kiến thức đã học — giống mức độ rõ ràng của Legacy Approval + Cancel, nhưng thống nhất trong một Workspace.
