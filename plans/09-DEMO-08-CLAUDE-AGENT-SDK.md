# PLAN 08 — CLAUDE AGENT SDK + FINAL DEMO

**URL:** `/demos/08-agent-sdk`  
**Domain:** 1.2 Agent Construction with Claude; 1.3 Frameworks; 8.3 Agentic Customization.  
**Một câu:** Agent SDK quản lý execution loop; application vẫn quyết định tools, permissions, UI và kết quả an toàn.

## 1. Scope

Demo cuối Team 1. Sử dụng **Claude Agent SDK thật** theo phiên bản tương thích hiện tại, không giả lập SDK message types. Build **một page** với bốn scenario; cùng local Task Manager SQLite và MCP tool đã có. Không cần dựng production Task Manager mới.

## 2. Bốn scenario trong một page

| Scenario | Tương tác | Quan sát thực tế |
|---|---|---|
| Basic SDK Agent | "Kiểm tra task đang có" → Run | SDK xử lý query, tool calls và result; timeline lấy từ SDK messages thật |
| Permissions & Hooks | "Tạo task Login" → Run → Approve/Reject | Callback/hook liên quan được gọi thật, user quyết định, deny không ghi DB |
| Skills | Chạy cùng yêu cầu có/không skill Task Planning | Xem skill được cấu hình/được gọi hoặc loaded như SDK thực sự báo; kết quả có thể khác, không claim skill kích hoạt nếu không có bằng chứng |
| Subagents | "Phân tích requirements và lập kế hoạch" | Main agent giao nhiệm vụ cho agent con, trace hiển thị delegation thật khi xảy ra; giới hạn số subagents/cost |

Tình huống cuối có thể nối lại thành một flow nhỏ: đọc file `requirements.md` trong sandbox → plan 2–3 tasks → xin approval → ghi task SQLite → read-back. Chỉ làm sau khi bốn mode cơ bản đã kiểm chứng.

## 3. File ownership

```text
backend/demos/demo_08_agent_sdk/
├── router.py            # POST query; optional SSE, approve/cancel
├── sdk_agent.py         # ClaudeSDKClient, options, receive_response
└── customization.py     # permission callbacks, hooks, skill/subagent config
frontend/src/app/(workspace)/demos/08-agent-sdk/
├── page.tsx
└── api.ts
# Skill có tên rõ và trong folder SDK docs/discovery theo chuẩn SDK đang dùng.
```

**Không hardcode path skill cũ** nếu SDK hiện hành sử dụng cơ chế discovery khác. Đọc docs/package installed khi triển khai; chọn cách chính thức, ghi rõ environment prerequisites (CLI/runtime/model/provider). Khai báo tool source là MCP local hoặc server từ Demo 07, không tự invent tool event.

## 4. Flow

```text
Frontend → FastAPI router → SDK Client
                   ├─ query(question)
                   ├─ receive SDK messages (real)
                   ├─ SDK tool execution / MCP tools
                   ├─ permission callback → ApprovalBroker → browser Approve/Reject
                   ├─ hooks, skills, subagents (scenario specific)
                   └─ result → UI + task DB read-back
```

- SDK quản lý vòng lặp riêng; **không lồng thêm Manual Agent Loop** của Demo 04 lên SDK.
- Backend vẫn đảm bảo timeout, permission, sandbox, write approval, session lifecycle; dùng SDK APIs thực tế.
- Permission deny phải thực sự chặn tool, không chỉ ẩn button.
- Hooks không tự động thay thế `can_use_tool` permission logic; phân biệt hook quan sát/chặn theo API cho phép.
- Subagent delegation không được show như đã xảy ra chỉ vì prompt nhắc "delegate".

## 5. UI

- Segmented: `Basic | Permissions | Skills | Subagents`.
- Input: preset editable, Run/Cancel nếu hủy backend SDK run thật, Approve/Reject khi event permission chờ.
- Actual Result: Claude final + task board scope `agent_sdk` đọc DB (nếu có write).
- Execution Events: SDK messages translated to plain events có source, tool info, completion, error.
- Source & Debug: `sdk_agent.py`, `customization.py`, MCP call and approval callback, 2–4 breakpoint.
- Kết quả cần đạt cuối page.

## 6. Verify

- Basic SDK gọi model/tool thực, có end-of-run result.
- Permission Approve tạo task SQLite, Reject không tạo; Task Board read-back.
- Hooks được SDK gọi thật, trace có metadata thật; nếu không gọi, show `not triggered`.
- Skills có tài liệu tương thích và hành vi kiểm chứng được; nếu SDK không cung cấp event explicit thì không tự suy diễn kích hoạt.
- Subagent thực sự được invoke (qua trace thích hợp) mới báo success, có cap.
- Không dùng response hardcoded; môi trường không đáp ứng thì báo prerequisite/LIVE PENDING.

## 7. Kết quả cần đạt

1. Giải thích được **Manual Loop ở Demo 04 khác SDK runtime ở Demo 08**.
2. Nắm permission/hook/skill/subagent: vai trò, điểm tích hợp và hạn chế.
3. Trình diễn một Task Agent nhỏ dùng tool thật, approval thật, result có thể kiểm chứng.

## 8. Prompt giao Claude

```text
Đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và plans/09-DEMO-08-CLAUDE-AGENT-SDK.md.
Chỉ làm Demo 08 bằng Claude Agent SDK thật, đọc version/docs đang cài trước khi code.
Bốn scenario Basic/Permissions/Skills/Subagents trên cùng page. SDK message thật.
Reuse MCP/task_store/approval đã verify, giữ giới hạn cost và sandbox.
Không tự tạo Manual Loop khác, không giả event/tool run, không product hóa Task Manager.
Test và đánh dấu unavailable/prerequisites nếu môi trường thiếu; giải thích 4 breakpoint,
Kết quả cần đạt; dừng, không commit/push.
```
