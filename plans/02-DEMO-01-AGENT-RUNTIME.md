# PLAN 01 — AGENT RUNTIME

**URL:** `/demos/01-runtime`  
**Domain:** 1.1 Agent Architecture; 2.4 Software Engineering Foundations; 2.5 Claude Application Design.  
**Một câu:** Backend chạy coroutine và gửi event tới UI; có thể chờ con người hoặc bị cancel.

## 1. Vì sao có demo này?

Đây là demo **cơ chế runtime web**, chưa cần Claude API. Giống Legacy Approval + Cancel mà người học đã hiểu. Giữ chức năng chạy được, nhưng **đổi support ticket mock thành một file sandbox thật** (nếu người dùng Approve) để thấy side effect.

## 2. Ba scenario duy nhất

| Scenario | Người dùng bấm | Kết quả thực tế |
|---|---|---|
| A. SSE | `Start SSE` | UI nhận `run_started → text_delta... → final → run_finished` tăng dần, không chờ đến cuối |
| B. Approval | `Start Approval → Approve / Reject` | `approval_required` hiện nút; Approve tạo `backend/data/workspace/approval-note.md` thật, Reject không tạo; đọc lại file để chứng minh |
| C. Cancel | `Start Long Running → Cancel Agent` | Nhận `error(kind=cancelled)`, không `final`, tiến độ dừng; history không commit run mới |

**Không giả lập:** `Queue`, `Future`, `Task.cancel()`, SSE và file creation.  
**Được mô phỏng có nhãn:** sleep trong long-running scenario để dễ quan sát điểm `await` (không nói đó là Claude đang suy nghĩ).

## 3. File ownership

```text
backend/demos/demo_01_runtime/
├── router.py          # /sessions, /runs, /approvals, /cancel, /file
├── runtime.py         # run_agent(), emit() từng event, tạo file sau approval
├── sessions.py        # Session + SessionStore (RAM)
└── approvals.py       # ApprovalBroker, Future, resolve()
frontend/src/app/(workspace)/demos/01-runtime/
├── page.tsx           # Scenario + control + result + events + source
└── api.ts             # fetch SSE, approve, cancel, read-back
```

Không xây chung Tool Registry/Agent SDK trong demo này. Giữ logic demo cũ khi migrate, không copy nguyên file frontend 300 dòng nếu có thể dễ đọc hơn.

## 4. Backend flow

```text
POST create session → POST run → create_task(run_turn)
                                  ├─ emit → Queue.put_nowait
StreamingResponse: await Queue.get → SSE → browser reader.read → setState
                                  ├─ Approver.request → Future → await
POST approval → Broker.resolve → Future.set_result → write file → emit result
POST cancel   → session.task.cancel() → CancelledError → error + run_finished
```

- Endpoint thuộc `/api/demos/01`.
- `run_finished` luôn báo kết thúc stream trong những tình huống được xử lý bình thường; kiểm tra race task cancel trước khi bắt đầu, không để request chờ vô hạn.
- Không dùng nhiều Uvicorn worker khi SessionStore/Future còn nằm trong RAM.
- File create phải được validate path cố định, **không nhận đường dẫn tuỳ ý từ browser**. Reset file riêng có confirm.
- Nhận quyết định approval từ HTTP request riêng với SSE. Timeout broker fail-closed.

## 5. UI — nhìn là biết cách chạy

**Header:** `01 · Agent Runtime — SSE / Approval / Cancel`  
**Scenario:** segmented `SSE | Approval | Cancel`  
**Actions:** `Start`, `Approve/Reject` (chỉ khi có approval_required), `Cancel Agent` (chỉ khi đang chạy), `Reset View`.  
**Actual Result:** Live text; final/error; với approval có trạng thái file read-back và nút xem file.  
**Execution Events:** event từng bước + timestamp browser nhận.  
**Source & Debug:** collapse mở ra file/function/đoạn code.  
**Kết quả cần đạt:** đặt cuối page.

## 6. 4 đoạn code để thuyết trình

```python
session.task = asyncio.create_task(run_turn(...))  # không await trong endpoint
```

```python
def emit(event):
    queue.put_nowait(event)
```

```python
event = await queue.get()             # backend consumer
yield f"data: {json.dumps(event)}\n\n"  # SSE
```

```python
approved = await asyncio.wait_for(future, timeout=120)
# HTTP approve gọi future.set_result(True)
# Cancel dùng session.task.cancel()
```

> Đây là snippet để giải thích, không phải code hoàn chỉnh.

## 7. Happy/Failure cases cần kiểm chứng

- SSE nhận text từng đợt trước final.
- Approve: file tồn tại và nội dung đúng, gọi read-back endpoint.
- Reject/timeout: file không được tạo.
- Cancel khi đang sleep và khi đang chờ approval: không deadlock, có event terminal; không commit history run mới.
- Double-click Start trong một session: 409 hoặc UI chặn; không tạo hai run.
- Refresh trực tiếp URL vẫn có sidebar và UI hoạt động.

## 8. Kết quả cần đạt

1. Tự giải thích `create_task` khác `await run_turn()` và mỗi run có Queue riêng.
2. Theo được flow `emit → Queue → SSE → reader.read → React`.
3. Hiểu `Future` chờ user, và `Task.cancel()` hủy backend Task chứ không chỉ đóng fetch.

## 9. Definition of Done và giới hạn

- Giữ đúng hành vi cơ bản Legacy, có file sandbox thật thay mock support.
- Không cần Claude key.
- Source code để debug tối đa bốn điểm chính.
- Test bằng browser + backend; cập nhật README; dừng sau Demo 01.

## 10. Prompt giao Claude

```text
Hãy đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và plans/02-DEMO-01-AGENT-RUNTIME.md.
Kiểm tra working tree. Trên nhánh rebuild an toàn, tạo shell chung và implement đúng Demo 01.
Giữ SSE/approval/cancel logic dễ hiểu như Legacy, đổi ticket giả thành file sandbox sau approval.
Mọi event thật, hiển thị file read-back. Không đụng Demo 02–08.
Simple → Correct; typecheck/build/smoke; giải thích 4 đoạn code rồi dừng.
Không commit/push/deploy.
```
