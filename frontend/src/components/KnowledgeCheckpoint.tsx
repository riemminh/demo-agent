"use client";

import { Alert, Button, Card, Flex, Radio, Typography } from "antd";
import { useState } from "react";

export type CheckpointQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

// Người học chọn đáp án rồi bấm Kiểm tra mới thấy giải thích. Không tự đánh dấu "studied".
export default function KnowledgeCheckpoint({ questions }: { questions: CheckpointQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <Card title="Knowledge Checkpoint" size="small">
      <Flex vertical gap={20}>
        {questions.map((q, index) => {
          const chosen = answers[index];
          const isCorrect = chosen === q.correctIndex;
          return (
            <div key={q.question}>
              <Typography.Text strong>{index + 1}. {q.question}</Typography.Text>
              <Radio.Group
                value={chosen}
                onChange={(e) => {
                  setAnswers((old) => ({ ...old, [index]: e.target.value as number }));
                  setRevealed((old) => ({ ...old, [index]: false }));
                }}
                style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0" }}
                options={q.options.map((label, value) => ({ label, value }))}
              />
              <Button size="small" disabled={chosen === undefined}
                onClick={() => setRevealed((old) => ({ ...old, [index]: true }))}>
                Kiểm tra
              </Button>
              {revealed[index] && (
                <Alert
                  style={{ marginTop: 8 }}
                  type={isCorrect ? "success" : "error"}
                  showIcon
                  title={isCorrect ? "Chính xác" : `Chưa đúng. Đáp án: ${q.options[q.correctIndex]}`}
                  description={q.explanation}
                />
              )}
            </div>
          );
        })}
      </Flex>
    </Card>
  );
}
