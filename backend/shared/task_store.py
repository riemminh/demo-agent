"""Task sandbox bằng sqlite3 chuẩn (không ORM), dùng từ Demo 04.

Một DB duy nhất `backend/data/tasks.sqlite3` (gitignored). Mỗi demo ghi dưới
`demo_scope` riêng nên reset của demo này không xóa dữ liệu của demo khác.
Mọi câu lệnh đều parameterized; không ghép chuỗi SQL.
"""

import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "tasks.sqlite3"
PRIORITIES = ("low", "medium", "high")
STATUSES = ("todo", "doing", "done")


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connect() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                demo_scope TEXT NOT NULL
            )
        """)


def list_tasks(scope: str) -> list[dict[str, Any]]:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, title, priority, status FROM tasks WHERE demo_scope = ? ORDER BY id",
            (scope,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_task(scope: str, task_id: int) -> dict[str, Any] | None:
    with _connect() as connection:
        row = connection.execute(
            "SELECT id, title, priority, status FROM tasks WHERE demo_scope = ? AND id = ?",
            (scope, task_id),
        ).fetchone()
    return dict(row) if row else None


def create_task(scope: str, title: str, priority: str, status: str = "todo") -> dict[str, Any]:
    """INSERT rồi ĐỌC LẠI theo id vừa tạo, để caller có dữ liệu thật trong DB."""
    if priority not in PRIORITIES:
        raise ValueError(f"priority phải thuộc {PRIORITIES}, nhận {priority!r}")
    if status not in STATUSES:
        raise ValueError(f"status phải thuộc {STATUSES}, nhận {status!r}")
    with _connect() as connection:
        cursor = connection.execute(
            "INSERT INTO tasks (title, priority, status, demo_scope) VALUES (?, ?, ?, ?)",
            (title, priority, status, scope),
        )
        task_id = int(cursor.lastrowid or 0)
    created = get_task(scope, task_id)
    if created is None:  # Không bao giờ nên xảy ra; báo lỗi thay vì trả dữ liệu đoán.
        raise RuntimeError(f"Tạo task thất bại: không đọc lại được id={task_id}")
    return created


def reset_scope(scope: str) -> int:
    """Xóa dữ liệu CỦA RIÊNG scope này. Trả về số dòng đã xóa."""
    with _connect() as connection:
        cursor = connection.execute("DELETE FROM tasks WHERE demo_scope = ?", (scope,))
        return cursor.rowcount
