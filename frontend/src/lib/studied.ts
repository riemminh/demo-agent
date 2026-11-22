"use client";

import { useEffect, useState } from "react";

// Learning status "Studied" do người học tự đánh dấu, lưu trong localStorage của browser.
// Tách hẳn khỏi implementation status (lessons.ts): học xong ≠ code đã verify.
const STORAGE_KEY = "playground.studied";
const CHANGE_EVENT = "playground-studied-change"; // Báo cho sidebar/dashboard/lesson cùng cập nhật.

function readStudied(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return []; // Dữ liệu hỏng thì coi như chưa học bài nào, không làm vỡ UI.
  }
}

export function useStudied() {
  // Bắt đầu rỗng rồi đọc trong useEffect: server không có localStorage, đọc sớm sẽ lệch hydration.
  const [studied, setStudied] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setStudied(readStudied());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync); // Đồng bộ giữa các tab.
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function setLessonStudied(lessonId: string, value: boolean) {
    const others = readStudied().filter((id) => id !== lessonId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value ? [...others, lessonId] : others));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { studied, setLessonStudied };
}
