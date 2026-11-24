"use client";

import { Alert, Typography } from "antd";
import { useEffect, useState } from "react";
import { getHealth, type Health } from "@/lib/api";

const { Text } = Typography;

/** Cảnh báo chung demo 02–06: dùng cùng preflight / OPENSSL như backend. */
export default function LlmNetworkAlert() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    void getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  if (!health || health.messages_api_reachable) return null;

  return (
    <Alert
      type="warning"
      showIcon
      title="Messages API chưa reachable"
      description={
        <>
          Demo này gọi Claude qua Python (không phải CLI Demo 08). Restart backend để{" "}
          <Text code>config.py</Text> gán <Text code>OPENSSL_CONF</Text>, hoặc VPN /{" "}
          <Text code>HTTPS_PROXY</Text>. Loop nhiều lượt (Demo 04) có thể lỗi khi body lớn dù probe OK.
        </>
      }
    />
  );
}