"use client";

import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Tooltip } from "antd";
import { ALL_LESSONS, STATUS_TAG, type Lesson } from "@/lib/lessons";

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

// Thanh cuối feature: [Previous] [Next].
export default function LessonNav({ lessonId }: { lessonId: string }) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);

  return (
    <Card size="small">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <NavButton lesson={ALL_LESSONS[index - 1]} direction="prev" />
        <NavButton lesson={ALL_LESSONS[index + 1]} direction="next" />
      </Flex>
    </Card>
  );
}
