---
name: task-planning
description: Chia một yêu cầu thành tối đa 3 task có priority. Dùng khi người dùng xin kế hoạch hoặc muốn chia nhỏ công việc.
---

# Task planning

Khi được yêu cầu lập kế hoạch cho một việc:

1. Nếu cần biết việc đã có hay chưa, gọi tool `list_tasks` trước.
2. Chia yêu cầu thành **tối đa 3 task**, mỗi task một dòng theo dạng:
   `<title> — <priority>` với priority thuộc `low | medium | high`.
3. Không viết code, không giải thích dài. Nếu yêu cầu đã trùng task đang có, nói rõ là trùng.
