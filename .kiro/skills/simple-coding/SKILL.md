---
name: simple-coding
description: Use when writing, modifying, or refactoring code, or when a source file exceeds 150 lines and needs to be split by feature. Applies the Simple → Correct → Maintainable → Optimize-when-needed workflow with minimal abstraction, preserved existing logic, production safety, and an explanation of why.
---
# simple-coding

Workflow viết và sửa code theo nguyên tắc **Simple → Correct → Maintainable → Optimize when needed**.

## Bước 1: Hiểu trước khi viết

- Đọc file liên quan và code gọi đến nó. Ghi nhận convention đang dùng: cách đặt tên, cấu trúc folder, cách xử lý lỗi, thư viện validation.
- Xác định phần *tối thiểu* cần sửa để đáp ứng yêu cầu.
- Yêu cầu mơ hồ hoặc có hệ quả lớn (đổi API, schema, xóa dữ liệu): hỏi người dùng trước.

## Bước 2: Viết bản đơn giản nhất chạy đúng

- Hàm thẳng, flow từ trên xuống, early return cho các nhánh lỗi.
- Dùng cấu trúc dữ liệu và thư viện chuẩn có sẵn trước khi tự viết.
- Trước khi tạo abstraction mới, tự hỏi:
  - Nó có được dùng ở ít nhất 2-3 chỗ không?
  - Nó có làm flow dễ đọc hơn so với viết inline không?
  - Nếu cả hai đều "không": viết inline.
- Không tạo: class chỉ có một method, wrapper chỉ gọi lại một hàm, `utils`/`helpers` chung chung, interface chỉ có một implementation, config cho thứ chưa bao giờ thay đổi.

## Bước 3: Bổ sung phần production

Kiểm tra từng mục, chỉ thêm cái thật sự áp dụng:

- [ ] Validate input tại ranh giới (request body, query, params, form, env, file).
- [ ] Lỗi có message rõ, có ngữ cảnh; không `catch` rồi bỏ qua.
- [ ] Không trả stack trace, secret, thông tin nội bộ ra client.
- [ ] Query DB dùng parameter, không nối chuỗi.
- [ ] Kiểm tra quyền (authn/authz) với endpoint hoặc thao tác nhạy cảm.
- [ ] Network call có timeout; xử lý trường hợp null/empty/not found.

## Bước 4: Giữ nguyên logic hiện có

- Diff chỉ chứa thay đổi cần cho yêu cầu. Không đổi tên, format lại, sắp xếp lại import hay refactor phần không liên quan.
- Giữ behavior cũ, kể cả chỗ trông "chưa đẹp", trừ khi đó là bug được yêu cầu sửa.
- Thấy vấn đề khác: ghi vào phần đề xuất ở cuối câu trả lời, không tự sửa.

## Bước 5: Kiểm tra giới hạn 150 dòng

Đếm dòng các file vừa tạo hoặc sửa (ví dụ `wc -l <file>`).

- File mới: phải ≤ 150 dòng ngay từ đầu.
- File đang sửa vượt 150 dòng do thay đổi của mình: tách phần mới thêm ra file riêng theo tính năng.
- File cũ đã vượt từ trước: báo người dùng, đề xuất cách tách, chỉ tách khi được đồng ý.
- Ngoại lệ: file generated, lock file, migration tự sinh, fixture lớn, `.md`, config do tool sinh.

### Cách tách theo tính năng

Nhóm code theo **tính năng nghiệp vụ** mà nó phục vụ. Một folder là một tính năng; file trong đó tách theo vai trò khi cần.

```
src/
  features/
    auth/
      auth.routes.ts        # khai báo route
      auth.service.ts       # logic nghiệp vụ
      auth.validation.ts    # schema validate input
      auth.types.ts
    invoice/
      invoice.routes.ts
      invoice.service.ts
      invoice-pdf.ts        # tách riêng vì phần render PDF dài
      invoice.validation.ts
  shared/                   # chỉ chứa thứ dùng chung bởi ≥ 2 feature
    db.ts
    errors.ts
```

Quy tắc đặt tên:

- Tên folder là tên tính năng: `auth`, `invoice`, `user-profile`. Không dùng `misc`, `common2`, `stuff`.
- Tên file bắt đầu bằng tên tính năng và cho biết vai trò: `invoice.service.ts`, `invoice-pdf.ts`.
- Theo convention có sẵn của project (kebab-case, snake_case, PascalCase cho component...). Nếu project đã tổ chức theo kiểu khác, theo kiểu đó, không áp cấu trúc mới.
- Một file service vẫn quá dài: tách theo use case con (`invoice-create.ts`, `invoice-refund.ts`), không tách ngẫu nhiên theo số dòng.
- Chỉ đưa vào `shared/` khi có ít nhất 2 tính năng thật sự dùng.

## Bước 6: Optimize khi cần

Chỉ tối ưu khi có bằng chứng: số đo chậm, query N+1 thấy rõ, dữ liệu lớn đã biết trước. Khi tối ưu, ghi comment ngắn lý do và giữ code đọc được.

## Bước 7: Giải thích cho người dùng

Sau khi đưa code, trả lời ngắn gọn:

1. **Đã sửa gì**: file nào, phần nào.
2. **Tại sao** chọn cách này, trade-off nếu có cách khác hợp lý.
3. **Flow**: input → các bước xử lý → output, và các nhánh lỗi.
4. **Đề xuất** (nếu có): vấn đề thấy được nhưng không tự sửa, file cần tách.

Giải thích để người dùng hiểu và tự duy trì code, không chỉ để copy.
