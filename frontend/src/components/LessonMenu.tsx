"use client";

import { CheckOutlined, HomeOutlined } from "@ant-design/icons";
import { Badge, Empty, Flex, Input, Menu } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ALL_LESSONS, MODULES, STATUS_TAG, type Lesson } from "@/lib/lessons";
import { useStudied } from "@/lib/studied";

function matches(lesson: Lesson, query: string) {
  return `${lesson.id} ${lesson.title}`.toLowerCase().includes(query);
}

// Sidebar: tìm lesson theo ID/tên, nhóm theo module, chấm màu = implementation status,
// dấu ✓ = learning status (Studied) do người học tự đánh dấu.
export default function LessonMenu() {
  const pathname = usePathname();
  const { studied } = useStudied();
  const [query, setQuery] = useState("");
  const currentLesson = ALL_LESSONS.find((lesson) => lesson.route === pathname);
  const currentModule = MODULES.find((m) => m.lessons.some((l) => l.id === currentLesson?.id));
  const [openKeys, setOpenKeys] = useState<string[]>(currentModule ? [currentModule.id] : ["m1", "m2"]);

  const search = query.trim().toLowerCase();
  const visibleModules = MODULES
    .map((module, index) => ({ module, index, lessons: module.lessons.filter((l) => matches(l, search)) }))
    .filter((group) => group.lessons.length > 0);

  const lessonItem = (lesson: Lesson) => {
    const status = STATUS_TAG[lesson.status];
    const text = `${lesson.id} · ${lesson.title}`;
    const isStudied = studied.includes(lesson.id);
    return {
      key: lesson.id,
      icon: <Badge color={status.dot} />,
      // Lesson chưa implement: disabled, không có link -> không thể mở như đang hoạt động.
      disabled: !lesson.route,
      title: `${text} — ${status.label}${isStudied ? " · Studied" : ""}`,
      label: (
        <>
          {isStudied && <CheckOutlined style={{ marginInlineEnd: 6 }} />}
          {lesson.route ? <Link href={lesson.route}>{text}</Link> : text}
        </>
      ),
    };
  };

  const items: MenuProps["items"] = [
    ...(search ? [] : [{ key: "overview", icon: <HomeOutlined />, label: <Link href="/playground">Overview</Link> }]),
    ...visibleModules.map(({ module, index, lessons }) => ({
      key: module.id,
      label: `0${index + 1} · ${module.title}`,
      children: lessons.map(lessonItem),
    })),
    ...(search ? [] : [
      { key: "m9", label: "09 · Engineering (xuyên suốt)", disabled: true },
      { key: "final", label: "★ Final · AI Task Manager", disabled: true },
    ]),
  ];

  return (
    <>
      <Flex vertical gap={10} style={{ padding: "12px 16px 4px" }}>
        <Input.Search allowClear placeholder="Tìm lesson theo ID hoặc tên" value={query}
          onChange={(e) => setQuery(e.target.value)} />
        <Flex gap={12} wrap>
          {Object.values(STATUS_TAG).map((status) => (
            <Badge key={status.label} color={status.dot} text={status.label} />
          ))}
          <span><CheckOutlined /> Studied</span>
        </Flex>
      </Flex>
      {search && visibleModules.length === 0
        ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có lesson phù hợp" />
        : <Menu
            mode="inline"
            selectedKeys={[currentLesson?.id ?? "overview"]}
            // Đang tìm: mở mọi module có kết quả. Không tìm: người dùng tự mở/đóng.
            openKeys={search ? visibleModules.map((g) => g.module.id) : openKeys}
            onOpenChange={(keys) => { if (!search) setOpenKeys(keys); }}
            items={items}
            style={{ borderInlineEnd: 0 }}
          />}
    </>
  );
}
