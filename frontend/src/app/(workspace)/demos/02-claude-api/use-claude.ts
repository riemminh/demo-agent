"use client";
import { useState } from "react";
import {
  sendMessages, streamMessages,
  type ClaudeRequest, type ClaudeResult, type SendBody, type StreamEvent,
} from "./api";

// Event của demo: mốc thời gian do browser đo (request gửi / response về / từng delta).
export type DemoEvent = { atMs: number; type: string; detail?: string };

const EMPTY_METRICS = { api_calls: 0, latency_ms: null, input_tokens: null, output_tokens: null };

// State của MỘT lần Send: result, event, text đang stream, lỗi transport.
export function useClaude() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ClaudeResult | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [streamText, setStreamText] = useState("");
  const [transportError, setTransportError] = useState("");

  function reset() {
    setResult(null);
    setEvents([]);
    setStreamText("");
    setTransportError("");
  }

  async function send(body: SendBody, streaming: boolean): Promise<ClaudeResult | null> {
    setRunning(true);
    reset();
    const startedAt = performance.now();
    const log = (type: string, detail?: string) =>
      setEvents((old) => [...old, { atMs: performance.now() - startedAt, type, detail }]);
    try {
      return streaming ? await runStream(body, log) : await runOnce(body, log);
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setRunning(false);
    }
  }

  async function runOnce(body: SendBody, log: (type: string, detail?: string) => void) {
    log("request_sent", `POST /messages · ${body.messages.length} turn trong messages[]`);
    const next = await sendMessages(body);
    if (next.status === "succeeded") {
      log("response_received", `${next.metrics.input_tokens} input / ${next.metrics.output_tokens} output tokens`);
    } else {
      log("response_failed", `${next.error?.kind}: ${next.error?.message}`);
    }
    setResult(next);
    return next;
  }

  async function runStream(body: SendBody, log: (type: string, detail?: string) => void) {
    let request: ClaudeRequest | null = null;
    let built: ClaudeResult | null = null;
    let text = "";
    await streamMessages(body, (event: StreamEvent) => {
      if (event.type === "text_delta") {
        text += event.text ?? "";
        setStreamText(text); // Render ngay, không chờ final.
        log("text_delta", event.text);
        return;
      }
      if (event.type === "request_sent") {
        request = event.request ?? null;
        log(event.type, `${body.messages.length} turn trong messages[]`);
        return;
      }
      if (event.type === "final") {
        built = {
          status: "succeeded", request, response: event.response ?? null,
          answer: event.answer ?? text, request_id: null,
          metrics: event.metrics ?? EMPTY_METRICS, error: null,
        };
        log(event.type, `${event.metrics?.output_tokens} output tokens`);
        return;
      }
      if (event.type === "error") {
        built = {
          status: "failed", request, response: null, answer: null, request_id: null,
          metrics: { ...EMPTY_METRICS, latency_ms: event.latency_ms ?? null },
          error: {
            kind: event.kind ?? "error", message: event.message ?? "",
            upstream_status: event.upstream_status ?? null,
          },
        };
        log(event.type, `${event.kind}: ${event.message}`);
        return;
      }
      log(event.type);
    });
    if (!built) {
      built = {
        status: "failed", request, response: null, answer: null, request_id: null,
        metrics: { ...EMPTY_METRICS, latency_ms: null },
        error: { kind: "incomplete_stream", message: "Stream kết thúc mà không có final/run_finished hợp lệ.",
                 upstream_status: null },
      };
    }
    setResult(built);
    return built;
  }

  return { running, result, events, streamText, transportError, send, reset };
}
