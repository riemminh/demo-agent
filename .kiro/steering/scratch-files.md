# Scratch files

- File tạm (script, screenshot, output thử nghiệm) luôn ghi vào `./.tmp/` trong workspace, không ghi vào `/tmp` hay ngoài workspace. Thư mục này đã nằm trong `.gitignore`.
- Lý do: permission chỉ tự cho phép đọc/ghi trong workspace (`./**`); ghi ra ngoài sẽ phải hỏi duyệt.
- Không chạy song song lệnh shell với tool ghi file mà lệnh đó cần. Ghi file xong rồi mới chạy lệnh.
