# PLAN 05 — STRUCTURED OUTPUT & VALIDATION

**URL:** `/demos/05-structured-output`  
**Domain:** 6.3 Output Handling — Structured Output & Validation.  
**Một câu:** Output có cấu trúc hợp lệ chưa chắc đúng logic; phải validate trước khi dùng.

## 1. Scope

Chuyển một yêu cầu tự nhiên thành **TaskDraft JSON** có schema đơn giản. Không ghi SQLite trong demo này để tập trung đúng vấn đề validation.

## 2. Ba scenario

| Scenario | Người dùng thao tác | Kết quả |
|---|---|---|
| Generate | Nhập "Làm login UI ưu tiên cao, 4 giờ" rồi Generate | Claude tạo object theo schema thật (dùng API structured-output được hỗ trợ bởi model) |
| Validate | Sửa JSON: `estimated_hours=-4` hoặc enum priority sai rồi bấm Validate | Pydantic/schema hoặc semantic validation trả lỗi chi tiết, không nhận data |
| Repair | Từ object fail, bấm Repair một lần | Gọi Claude thật một lần với feedback, validate lại và cho thấy trước/sau |

`Validate` chạy offline local Python, không cần gọi Claude. `Repair` chỉ gọi khi người dùng bấm, giới hạn một lần và báo cost/usage thật. Không tự động claim repair luôn thành công.

## 3. File ownership

```text
backend/demos/demo_05_structured_output/
├── router.py         # POST generate, validate, repair
├── schemas.py        # TaskDraft: title, priority, estimated_hours
└── validation.py     # schema + semantic validation; repair request
frontend/src/app/(workspace)/demos/05-structured-output/
├── page.tsx
└── api.ts
```

## 4. Data & code

```python
class TaskDraft(BaseModel):
    title: str
    priority: Literal["low", "medium", "high"]
    estimated_hours: float
```

```python
def validate_semantics(task: TaskDraft) -> None:
    if task.estimated_hours <= 0:
        raise ValueError("estimated_hours must be positive")
```

- Dùng native structured output theo API/SDK & model hiện tại nếu supported; verify signature lúc triển khai. Không giả một JSON prompt thường là native schema enforcement.
- Input JSON sửa tay được validate bằng cùng Pydantic model; semantic check tách riêng để phân biệt hai loại lỗi.
- Repair prompt chỉ nhận object fail + lỗi, không bịa một object thành công nếu API fail.

## 5. UI

`Generate | Validate | Repair` là ba nút/chế độ cùng một page.  
**Input:** natural language prompt và textarea JSON editable sau generate.  
**Actual Result:** object có cấu trúc / lỗi field / object sau repair.  
**Execution Events:** Claude generate → parse → schema → semantic → accept/reject; repair call nếu bấm.  
**Source:** 3 breakpoint tại parse, schema, semantic.  
**Kết quả cần đạt:** 3 ý ngắn cuối.

## 6. Verify

- Generate dùng API thật, schema đúng khi model/API hỗ trợ; nếu không hỗ trợ báo rõ, không fake native structured output.
- JSON sai enum hoặc type bị Pydantic reject.
- `estimated_hours = -4` pass kiểu số nhưng fail semantic.
- Repair có call/usage thật và có thể trả fail; không có vòng lặp vô hạn.
- No DB write side effects.

## 7. Kết quả cần đạt

1. Phân biệt text, JSON và native structured output có ràng buộc schema.
2. Hiểu validation kiểu dữ liệu khác semantic/business validation.
3. Biết cách repair có giới hạn và chỉ đưa output hợp lệ vào ứng dụng.

## 8. Prompt giao Claude

```text
Đọc plans/00-START-HERE.md, plans/01-SHARED-ARCHITECTURE-UI.md và plans/06-DEMO-05-STRUCTURED-OUTPUT.md.
Chỉ build một trang Demo 05 với Generate/Validate/Repair và TaskDraft đơn giản.
Native schema theo SDK thực tế, Pydantic + semantic validation Python thật.
Không SQLite, không quiz, không overengineer, không claim repair chắc thành công.
Test cases đúng/sai/repair, cập nhật README, giải thích code, dừng. Không commit/push.
```
