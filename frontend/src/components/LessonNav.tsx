"use client";

import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Flex, Tooltip } from "antd";
import { ALL_LESSONS, STATUS_TAG, type Lesson } from "@/lib/lessons";
import { useStudied } from "@/lib/studied";

// Lesson chưa có route: nút disabled + tooltip, không dẫn tới trang giả.
function NavButton({ lesson, direction }: { lesson: Lesson | undefined; direction: "prev" | "next" }) {
  if (!lesson) return <span />;
  const icon = direction === "prev" ? <ArrowLeftOutlined /> : <ArrowRightOutlined />;
  const label = `${lesson.id} · ${lesson.title}`;
  if (!lesson.route) {
    return (
      <Tooltip title={STATUS_TAG[lesson.status].label}>
        <Button disabled icon={icon} iconPlacement={direction === "prev" ? "start" : "end"}>{label}</Button>
      </Tooltip>
    );
  }
  return (
    <Button href={lesson.route} icon={icon} iconPlacement={direction === "prev" ? "start" : "end"}>{label}</Button>
  );
}

// Thanh cuối lesson: [Previous] [Mark studied] [Next] (Plan V2 mục 5.3).
export default function LessonNav({ lessonId }: { lessonId: string }) {
  const { studied, setLessonStudied } = useStudied();
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);

  return (
    <Card size="small">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <NavButton lesson={ALL_LESSONS[index - 1]} direction="prev" />
        <Checkbox checked={studied.includes(lessonId)}
          onChange={(e) => setLessonStudied(lessonId, e.target.checked)}>
          Mark studied (tôi đã tự giải thích lại được bài này)
        </Checkbox>
        <NavButton lesson={ALL_LESSONS[index + 1]} direction="next" />
      </Flex>
    </Card>
  );
}
