"use client";
import { Alert, Card, Descriptions, Empty, Flex, List, Space, Tag, Typography } from "antd";
import CodeBlock from "@/components/CodeBlock";
import type { DiscoverResult, ResourcesPromptsResult, ToolCallResult } from "./api";
import type { ScenarioKey } from "./content";

type Props = {
  scenario: ScenarioKey;
  discovered: DiscoverResult | null;
  toolCall: ToolCallResult | null;
  resources: ResourcesPromptsResult | null;
  running: boolean;
  error: string;
};

export default function ResultCard(props: Props) {
  const { scenario, discovered, toolCall, resources, running, error } = props;
  const shown = scenario === "discover" ? discovered : scenario === "call" ? toolCall : resources;
  return (
    <Card size="small" title="Actual Result"
      extra={<Tag color={running ? "processing" : shown ? "success" : "default"}>
        {running ? "running" : shown ? "done" : "idle"}
      </Tag>}>
      <Flex vertical gap={12}>
        {error && <Alert type="error" showIcon title="Lỗi từ bridge hoặc MCP session" description={error} />}
        {!shown && !running && !error && <Empty description="Chưa chạy. Bấm nút ở trên để mở một session MCP." />}

        {scenario === "discover" && discovered && (
          <List size="small" bordered dataSource={discovered.tools}
            header={<Typography.Text strong>Tool do server công bố ({discovered.tools.length})</Typography.Text>}
            renderItem={(tool) => (
              <List.Item>
                <Flex vertical gap={4} style={{ width: "100%" }}>
                  <Space wrap size={4}>
                    <Tag color="purple">{tool.name}</Tag>
                    <Typography.Text type="secondary">{tool.description}</Typography.Text>
                  </Space>
                  <CodeBlock title="input_schema (server tự sinh từ type hint)"
                    code={JSON.stringify(tool.input_schema, null, 2)} />
                </Flex>
              </List.Item>
            )} />
        )}

        {scenario === "call" && toolCall && (
          <Flex vertical gap={10}>
            <Space wrap size={4}>
              <Tag color="purple">tools/call</Tag>
              <Typography.Text strong>{toolCall.tool}</Typography.Text>
              <Typography.Text code>{JSON.stringify(toolCall.arguments)}</Typography.Text>
              {toolCall.result.is_error
                ? <Tag color="error">is_error = true</Tag>
                : <Tag color="success">is_error = false</Tag>}
            </Space>
            {toolCall.result.is_error
              ? <Alert type="error" showIcon title="Tool error do server trả về"
                  description={toolCall.result.text} />
              : <CodeBlock title="Content block text từ server" code={toolCall.result.text} />}
            {toolCall.result.structured !== null && (
              <CodeBlock title="structured_content (server trả kèm)"
                code={JSON.stringify(toolCall.result.structured, null, 2)} />
            )}
          </Flex>
        )}

        {scenario === "resources" && resources && (
          <Flex vertical gap={10}>
            <Descriptions size="small" column={1} bordered items={[
              { key: "uri", label: "Resource", children: resources.resources.map((resource) => (
                  <Space key={resource.uri} wrap size={4}>
                    <Typography.Text code>{resource.uri}</Typography.Text>
                    <Tag>{resource.mime_type}</Tag>
                    <Typography.Text type="secondary">{resource.description}</Typography.Text>
                  </Space>
                )) },
              { key: "prompt", label: "Prompt", children: resources.prompts.map((prompt) => (
                  <Space key={prompt.name} wrap size={4}>
                    <Typography.Text code>{prompt.name}</Typography.Text>
                    <Tag>args: {prompt.arguments.join(", ") || "none"}</Tag>
                    <Typography.Text type="secondary">{prompt.description}</Typography.Text>
                  </Space>
                )) },
            ]} />
            {resources.resource_read && (
              <CodeBlock title={`resources/read ${resources.resource_read.uri} (sinh từ SQLite)`}
                code={resources.resource_read.text} />
            )}
            {resources.prompt_get && (
              <CodeBlock title={`prompts/get ${resources.prompt_get.name} — message server dựng sẵn`}
                code={resources.prompt_get.messages.map((message) => `[${message.role}]\n${message.text}`).join("\n\n")} />
            )}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
