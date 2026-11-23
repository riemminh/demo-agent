# PLAN 07 — MCP SERVER & CLIENT

**URL:** `/demos/07-mcp`  
**Domain:** 8.2 MCP Server Development; 8.1 Tool Implementation.  
**Một câu:** MCP là protocol để client khám phá và gọi tool từ server độc lập.

## 1. Scope

Build một **MCP Server thật** và một **MCP Client thật**, chưa cần Claude khi học Connect/Discover/Call Tool. Để đơn giản, dùng **stdio** là transport chính; giải thích Streamable HTTP bằng flow/so sánh, chưa cần vận hành hai transport nếu không bắt buộc cho sharing. Không tạo WebSocket proxy riêng.

## 2. Ba scenario

| Scenario | Bấm trên UI | Kết quả thật |
|---|---|---|
| Connect & Discover | `Connect → List Tools` | Client initialize session, server trả tool names/schema |
| Call Tool | Chọn `list_tasks` hoặc `get_task`, Run | Client gọi `call_tool` → server đọc SQLite demo scope và trả kết quả thật |
| Resources & Prompts | List/read resource, get prompt | Server công bố `workspace://...` và template task planning, client lấy về được |

Demo tool `list_tasks` sử dụng SQLite tạo từ Demo 04, nhưng scope riêng `mcp`. Có nút seed sample task bằng Python **có nhãn seed dữ liệu**, đọc từ DB thật. Không fake tool response.

## 3. File ownership

```text
backend/demos/demo_07_mcp/
├── router.py         # Bridge FastAPI UI → MCP Client (run operations)
├── mcp_server.py     # FastMCP server, tools/resources/prompts
└── mcp_client.py     # Connect stdio, initialize, list_tools, call_tool
frontend/src/app/(workspace)/demos/07-mcp/
├── page.tsx
└── api.ts
```

**Quan trọng:** dùng MCP Python SDK chính thức tương thích runtime, kiểm tra API thực tế trước khi code. `mcp_server.py` runnable independent from FastAPI (ví dụ `uv run python -m demos.demo_07_mcp.mcp_server`). Đừng để subprocess in log ra stdout khi dùng stdio (protocol cần stdout sạch).

## 4. Core flow

```text
Browser → FastAPI router → MCP Client
                            ↓ initialize
                       stdio transport
                            ↓
                         MCP Server
                     ┌ tools/list
                     ├ tools/call → SQLite task store (read)
                     ├ resources/list/read
                     └ prompts/list/get
```

- MCP Client chấp nhận tool argument schema do server công bố, không tự tạo danh sách tool giả.
- Không tự xây JSON-RPC parser nếu SDK đã cung cấp.
- Không để UI tự nhập đường dẫn chương trình MCP server tùy ý (command injection). Bridge gọi **server cố định**.
- Session/subprocess cleanup dùng context managers; không rò rỉ process nếu user retry/refresh.

## 5. UI

- Segmented `Discover | Call Tool | Resources & Prompts`.
- `Server status` chỉ là Connected nếu **MCP session initialize thật** thành công.
- Actual Result: list tools/schema hoặc result từ SQLite/resource/prompt.
- Execution Events: spawn/connect → initialize → list/call → result/error.
- Source/Debug: `mcp_server.py` + `mcp_client.py`, breakpoint ở list_tools/call_tool.
- Kết quả cần đạt cuối trang.

## 6. Verify

- Server chạy standalone, client connect stdio và list_tools thật.
- Call Tool trả task records thực tế; reset/seed chỉ scope `mcp`.
- Resource/prompt trả dữ liệu thực do server tạo, không tĩnh từ frontend.
- Server shutdown/kết thúc request không để child process rò rỉ.
- Không key Anthropic vẫn hoàn thành cả ba scenario.

## 7. Kết quả cần đạt

1. Phân biệt **MCP Server, MCP Client và MCP Host**.
2. Hiểu discovery/call_tool, tools/resources/prompts, stdio transport.
3. Hiểu MCP tool có thể hoạt động độc lập với Claude, khác local Python registry ở Demo 03.

## 8. Prompt giao Claude

```text
Đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và plans/08-DEMO-07-MCP-SERVER-CLIENT.md.
Làm MCP server + client THẬT theo SDK chính thức, stdio là transport chính.
Demo Connect/Discover, Call Tool, Resources/Prompts trong một page AntD.
Bridge FastAPI chỉ gọi server cố định; không fake protocol/tool output.
Test standalone MCP client/server và browser; dừng, không commit/push.
```
