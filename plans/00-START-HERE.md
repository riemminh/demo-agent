# PHASE 1 — AI Agent Demo Workspace | START HERE

> **Mục đích:** xây lại `demo-agent` cho buổi sharing Team 1 bằng đúng **8 demo độc lập**. Mỗi demo là **một feature chạy được**, không phải một bài lý thuyết hoặc quiz.
>
> **Nguyên tắc:** **Simple → Correct** (rồi mới Maintainable → Optimize later).

## 0. Phạm vi và nguồn tham chiếu

- Repository đích: `https://github.com/riemminh/demo-agent`.
- Đã đối chiếu cây file công khai tại commit `595db4e031582ad9e3b695ca545be42d7341fcca` (23/11/2026). Thực tế lúc Claude bắt đầu phải **kiểm tra working tree/HEAD mới nhất** vì code có thể đã thay đổi.
- Code hiện có: runtime SSE/Approval/Cancel, Messages API One-shot, Next.js App Router và Ant Design. Những demo 03–08 **chưa có implementation** trong commit đã kiểm tra.
- Đây là **rebuild kiến trúc và tổ chức code**, không yêu cầu copy `dev-support-agent`, không sử dụng nghiệp vụ NovaDev.
- **Không xóa dữ liệu, source hoặc history Git trước khi kiểm tra**. Nên triển khai trên nhánh mới `rebuild/8-interactive-demos`; migration dần, xóa code cũ chỉ sau khi tính năng mới được kiểm chứng và có diff rõ ràng.
- File `plans/02-DEMO-01-AGENT-RUNTIME.md ... plans/09-DEMO-08-CLAUDE-AGENT-SDK.md` là đặc tả **duy nhất cho demo tương ứng**; chỉ mở một plan mỗi lượt. Không chạy hết tám plan trong một lần.

## 1. Sản phẩm cần có sau Phase 1

| # | Một demo | Một câu học được | Các chế độ chạy |
|---|---|---|---|
| 01 | Agent Runtime | Agent backend chạy, stream event, chờ approval và bị cancel như thế nào? | SSE, Approve/Reject, Cancel |
| 02 | Claude API | Một hoặc nhiều request Messages API được gửi/nhận ra sao? | One-shot, History On/Off, Streaming |
| 03 | Tools & Registry | Model đề nghị tool, ứng dụng dispatch và trả tool_result như thế nào? | Single Tool, Registry, Error |
| 04 | Manual Agent Loop | Vì sao có nhiều lần gọi Claude, khi nào dừng và quản lý history ra sao? | Normal, Max Turns, Failure/Rollback |
| 05 | Structured Output | Schema đúng chưa đủ; kiểm tra semantic rồi mới nhận kết quả thế nào? | Generate, Validate, Repair |
| 06 | Agent Workflows | Fixed workflow và dynamic workflow khác nhau như thế nào? | Chaining, Routing, Parallel, Orchestrator, Evaluator |
| 07 | MCP | MCP client khám phá và gọi tool của server ra sao? | Discover, Call Tool, Resource/Prompt |
| 08 | Claude Agent SDK | SDK quản lý Agent Loop thế nào và app vẫn kiểm soát permissions? | Basic, Permissions/Hooks, Skills, Subagents |

**Không có demo thứ 9**: requirements, design, debugging và code organization được đưa vào mô tả ngắn của từng demo. SDK demo là phần kết thúc; không build một hệ thống Task Manager thương mại.

## 2. UI chung (giữ hướng hiện tại)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ AI Agent Demo Workspace                    Backend | Model | Environment     │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ Workspace Home        │  03 — Tools & Registry                               │
│ 01 — Agent Runtime    │  Một câu: Model yêu cầu tool; Python chạy tool       │
│ 02 — Claude API       │  ┌────────────────────────────────────────────────┐  │
│ 03 — Tools & Registry │  │ Scenario: [Single] [Registry] [Error]          │  │
│ 04 — Manual Loop      │  │ Input: [....................................]  │  │
│ 05 — Structured       │  │ [Run] [Reset]                                  │  │
│ 06 — Workflows        │  └────────────────────────────────────────────────┘  │
│ 07 — MCP              │  ┌────────────────────────────────────────────────┐  │
│ 08 — Agent SDK        │  │ Actual Result — kết quả thật                   │  │
│                       │  └────────────────────────────────────────────────┘  │
│                       │  Execution Events — từng bước có thật               │
│                       │  Source & Debug — 2–4 đoạn code trọng tâm           │
│                       │  Kết quả cần đạt — 1–3 ý                            │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

### Luật UI bắt buộc

1. Next.js App Router + TypeScript + **Ant Design**; Header/Sidebar nằm ở layout chung, chỉ main content thay đổi khi điều hướng.
2. Sidebar chỉ hiển thị demo **thực sự đã implement và chạy được**; các mục khác nằm ở phần Roadmap text của Workspace Home. Khi xong mỗi demo mới bật menu. Cuối Phase 1 sidebar có đủ 8.
3. Mỗi page chỉ có: **Scenario + Input + Run** → **Actual Result** → **Execution Events** → **Source & Debug** → **Kết quả cần đạt**. Raw Request/Response để trong `Collapse` hoặc `Tabs` Debug khi thực sự cần.
4. Không quiz, không lesson progress, không login, không biểu đồ KPI trang trí, không form dài, không duplicate UI framework.
5. Error/Empty/Loading dùng Ant Design `Alert`, `Empty`, `Spin`, `Tag`, `Button`; disable Run đang in-flight. Không hiển thị trace/answer/tokens giả.
6. **Actual Result thật**: kết quả tính từ backend/Claude, file hoặc SQLite đã đọc lại. Nếu demo chủ ý mô phỏng thời gian, ghi rõ `Simulation` (không phải Claude result).
7. Có 1–2 nút thử tình huống thất bại để người xem hiểu khác biệt; Reset chỉ xóa **dữ liệu của chính demo** khi đã xác nhận, không đụng dữ liệu các demo khác.
8. Giữ tên file rõ ràng, tránh `util.py`, `service.py`, `helpers.ts` chung chung nếu chưa thực sự cần.

## 3. Cấu trúc folder và quyền sở hữu code

```text
demo-agent/
├── README.md
├── plans/
│   ├── 00-START-HERE.md
│   ├── 01-SHARED-ARCHITECTURE-UI.md
│   ├── 02-DEMO-01-AGENT-RUNTIME.md
│   ├── ...
│   └── 09-DEMO-08-CLAUDE-AGENT-SDK.md
├── backend/
│   ├── main.py                        # Chỉ tạo app, CORS, include_router
│   ├── config.py                      # ANTHROPIC_API_KEY, LLM_MODEL, limits
│   ├── pyproject.toml
│   ├── shared/
│   │   ├── task_store.py              # Chỉ thêm từ Demo 04 khi SQLite cần
│   │   └── approval.py                # Có thể trích ra khi từ 2 demo cùng dùng
│   ├── data/                           # ignored: SQLite / runtime file sandbox
│   └── demos/
│       ├── demo_01_runtime/
│       │   ├── router.py
│       │   ├── runtime.py
│       │   ├── sessions.py
│       │   └── approvals.py
│       ├── demo_02_claude_api/
│       │   ├── router.py
│       │   └── messages.py
│       ├── demo_03_tools/
│       │   ├── router.py
│       │   ├── tools.py
│       │   ├── registry.py
│       │   └── tool_calling.py
│       ├── demo_04_manual_loop/
│       │   ├── router.py
│       │   └── agent_loop.py
│       ├── demo_05_structured_output/
│       │   ├── router.py
│       │   ├── schemas.py
│       │   └── validation.py
│       ├── demo_06_workflows/
│       │   ├── router.py
│       │   └── patterns.py
│       ├── demo_07_mcp/
│       │   ├── router.py
│       │   ├── mcp_server.py
│       │   └── mcp_client.py
│       └── demo_08_agent_sdk/
│           ├── router.py
│           ├── sdk_agent.py
│           └── customization.py
└── frontend/
    └── src/
        ├── components/
        │   ├── WorkspaceLayout.tsx     # Header + Sider + Content (antd)
        │   └── DemoMenu.tsx
        ├── lib/
        │   └── demos.ts               # Chỉ metadata và route đã implement
        └── app/
            ├── layout.tsx
            └── (workspace)/
                ├── layout.tsx         # Persistent sidebar
                ├── workspace/page.tsx
                └── demos/
                    ├── 01-runtime/page.tsx
                    ├── 02-claude-api/page.tsx
                    ├── 03-tools/page.tsx
                    ├── 04-manual-loop/page.tsx
                    ├── 05-structured-output/page.tsx
                    ├── 06-workflows/page.tsx
                    ├── 07-mcp/page.tsx
                    └── 08-agent-sdk/page.tsx
```

**Lưu ý:** Những folder của demo chưa làm **không cần được tạo trước**. Mỗi demo có thể thêm `demo.tsx`, `api.ts`, `types.ts` ngay trong folder của nó khi page thực sự cần; **đừng tách file nhỏ chỉ để đạt mẫu cấu trúc**. Python các folder demo cần `__init__.py` nếu sử dụng package imports.

### Quy tắc phụ thuộc

- `main.py` chỉ import router các demo đã có; demo chưa làm không được import.
- `demo_XX/` tự sở hữu API, logic và sample data của mình; không import business logic từ demo khác.
- Chỉ đưa utility vào `backend/shared/` **sau khi ít nhất hai demo thực sự cần cùng hành vi**, ưu tiên việc đơn giản hơn.
- Từ Demo 04, 07 và 08 có thể tái sử dụng `shared/task_store.py` (sqlite3), nhưng mỗi demo ghi dữ liệu dưới `demo_scope` riêng; Reset không xóa scope khác.
- Không dùng `sqlite3` cho mọi demo: 01–03 không cần SQLite; 05–06 chỉ cần gọi Claude và xử lý output.
- Có thể tham khảo luồng event của Demo 01 nhưng đừng tạo một global agent framework cho cả project.

## 4. Thứ tự thực hiện

**Mỗi lượt Claude chỉ được làm đúng một plan; sau đó chờ review.**

1. `plans/02-DEMO-01-AGENT-RUNTIME.md` — đồng thời chuẩn bị shell/layout tối thiểu.
2. `plans/03-DEMO-02-CLAUDE-API.md` — Messages API + streaming.
3. `plans/04-DEMO-03-TOOL-CALLING-REGISTRY.md` — One tool round + Registry.
4. `plans/05-DEMO-04-MANUAL-AGENT-LOOP.md` — Agent Loop + SQLite task thật.
5. `plans/06-DEMO-05-STRUCTURED-OUTPUT.md` — Typed output + validation.
6. `plans/07-DEMO-06-AGENT-WORKFLOWS.md` — Five patterns trong một page.
7. `plans/08-DEMO-07-MCP-SERVER-CLIENT.md` — MCP server + client thật.
8. `plans/09-DEMO-08-CLAUDE-AGENT-SDK.md` — SDK + hooks + skills + subagents.

**Definition of Done chung**: UI chạy được, happy + failure path, kết quả backend có thể kiểm chứng, execution events từ thực thi thật, 2–4 đoạn code/breakpoint quan trọng, Kết quả cần đạt, link được từ sidebar nếu đã có code, không regression demo trước, TypeScript typecheck/build, Python import/start/smoke tests phù hợp. Cập nhật README đúng trạng thái. Không claim live verified nếu chưa gọi Claude/MCP/SDK thật.

## 5. Lời nhắc cho Claude trước mỗi plan

```text
Hãy đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và plans/<số>-DEMO-<tên>.md.
Kiểm tra working tree/HEAD. Chỉ implementation demo NN trong lượt này.
Giữ sidebar và các demo đã chạy. Code theo Simple → Correct.
Tập trung Input → Run → Actual Result → Events → Source → Kết quả cần đạt.
Không quiz, không business support giả, không thêm framework, không làm các demo khác.
Không tự commit/push/deploy. Kiểm tra Definition of Done, cập nhật README,
giải thích file-by-file + flow + breakpoint rồi DỪNG để tôi review.
```

## 6. Phase 2 (chưa thực hiện)

Sau khi hoàn thành **cả tám demo**, người dùng sẽ cung cấp PowerPoint template. Lúc đó mới thiết kế slides, diagram, presenter script, speaker notes từ **source đã verify**; không thiết kế slide trước để tránh sai với code cuối cùng.
