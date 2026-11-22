# Prompt giao Claude — sửa định hướng UI & nội dung demo

Hãy đọc toàn bộ `plan-v3-feature-first.md` trong root của `demo-agent`, đồng thời review source code và `git status` thực tế. **Plan V3 là source of truth mới cho UX và cách demo, thay mọi yêu cầu xung đột trong plan-v2.md.** `ui-preview-v2.html` chỉ tham khảo visual/layout, không tham khảo nội dung/behavior giả lập.

**Yêu cầu sản phẩm:** Đây là **AI Task Manager Workspace Application** để học các cơ chế Agent qua **TÍNH NĂNG CHẠY ĐƯỢC**. Mỗi menu phải giống `Agent Approval + Cancel Demo`: nhập dữ liệu, bấm Run, nhìn thấy state và output thực, mở trace/code để hiểu. Không phải trang giáo trình, câu hỏi trắc nghiệm hay dashboard Studied.

**Chỉ thực hiện Pass A của Plan V3 lần này. KHÔNG build tiếp 36 bài, database, Agent Loop, MCP, SDK hoặc đổi Approval mock ngay.**

1. Review working tree, preserve routes SSE `/` và Approval/Cancel `/approval`, không xoá code đã chạy, không commit/push/deploy.
2. Giữ `backend/lessons/messages_api.py` đang gọi **Claude API thật 1 request** qua `ANTHROPIC_API_KEY`, `LLM_MODEL` backend. Không thêm Queue/Loop khi không cần. Không fake response, trace, token, latency.
3. **Bỏ KnowledgeCheckpoint/trắc nghiệm/câu hỏi, Studied emphasis.** Giữ Kết quả cần đạt ngắn cuối feature.
4. Đổi `/playground` sang **Workspace Home** có links đến các **demo đang chạy được**, không phải thống kê tiến độ khóa học. Chưa implement thì Coming Soon, không fake trang.
5. Đổi layout Lesson 06 thành mini app: input task title/requirements → `Generate Description` → **lớn nhất là kết quả text Claude thật có Copy/Edit**; thêm preset Email xin nghỉ phép cũ. Sau đó show actual metrics + optional Request/Response/Trace/Source Code, và Kết quả cần đạt. Concept chỉ Collapse ngắn.
6. UI Ant Design (`Layout/Menu/Card/Input/Button/Tabs/Alert/...`), theme nhất quán, frontend TypeScript. No new UI framework, no unnecessary abstraction.
7. Smoke test offline + TS typecheck/build + old routes. Live verify nếu local API key đã có và được chạy; nếu thiếu key thì hướng dẫn env và ghi `Live verification pending`. Update README/status accurately.
8. Sau khi hoàn thành giải thích file-by-file, flow `input → Python execution → output`, breakpoint và success/failure đã verify. **DỪNG để tôi review; không tự làm Pass B.**

**Acceptance cực quan trọng:** người xem mở Lesson 06 nhìn phát biết nhập gì, bấm gì, output xuất hiện đâu, output đó dùng được (Copy/Edit); request/response JSON không phải nội dung chính; không có câu hỏi quiz. Source/demo cũ không bị regression.

**Lượt tiếp theo (KHÔNG làm trong lượt này):** Pass B đổi `create_ticket_draft` giả trong `/approval` thành create file thật trong sandbox + GET read-back. Các lesson sau đều feature-first theo Plan V3.
