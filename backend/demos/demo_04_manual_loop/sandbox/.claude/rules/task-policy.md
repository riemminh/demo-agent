# Task policy (Rules)

1. Chỉ đề xuất **tạo task mới** khi người dùng yêu cầu rõ ràng hoặc prompt nói cần tạo.
2. `priority` chỉ được `low`, `medium`, hoặc `high`.
3. Không tạo task trùng title với task đang có (gọi `list_tasks` trước khi tạo).
4. Một câu trả lời cuối không quá 5 câu.