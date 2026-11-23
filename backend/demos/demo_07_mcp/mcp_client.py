"""MCP Client thật: spawn server qua stdio, initialize, rồi list/call theo protocol.

Mỗi operation mở một `async with Client(...)`: SDK spawn subprocess, initialize session,
và đóng/kill subprocess khi ra khỏi block — refresh hay retry không rò rỉ process.
Tham số server là HẰNG SỐ trong file này; browser không gửi command/đường dẫn nào vào đây.
"""

import sys
import time
from pathlib import Path
from typing import Any

from mcp.client import Client
from mcp.client.stdio import StdioServerParameters

BACKEND_DIR = Path(__file__).resolve().parents[2]

# Server cố định: chính interpreter của venv + module đã biết. Không nhận input từ UI.
SERVER_PARAMS = StdioServerParameters(
    command=sys.executable,
    args=["-m", "demos.demo_07_mcp.mcp_server"],
    cwd=str(BACKEND_DIR),
)


class Recorder:
    """Ghi lại từng bước protocol kèm mốc thời gian thật."""

    def __init__(self) -> None:
        self.started = time.perf_counter()
        self.events: list[dict[str, Any]] = []

    def log(self, event_type: str, **payload: Any) -> None:
        at_ms = round((time.perf_counter() - self.started) * 1000, 1)
        self.events.append({"type": event_type, "at_ms": at_ms, **payload})


def _session_info(client: Client) -> dict[str, Any]:
    info = client.server_info
    capabilities = client.server_capabilities
    return {
        "server_name": info.name if info else None,
        "server_version": getattr(info, "version", None) if info else None,
        "protocol_version": client.protocol_version,
        "capabilities": sorted(
            name for name, value in (capabilities.model_dump() if capabilities else {}).items()
            if value
        ),
    }


def _tool_schema(tool: Any) -> dict[str, Any]:
    return {"name": tool.name, "description": tool.description,
            "input_schema": tool.input_schema}


def _result_text(result: Any) -> str:
    """CallToolResult.content là list content block; ghép các block text."""
    return "\n".join(block.text for block in result.content if getattr(block, "type", "") == "text")


async def discover() -> dict[str, Any]:
    recorder = Recorder()
    recorder.log("spawn", transport="stdio", command=f"{Path(sys.executable).name} -m "
                                                     "demos.demo_07_mcp.mcp_server")
    async with Client(SERVER_PARAMS) as client:
        session = _session_info(client)
        recorder.log("initialize", **session)
        tools = (await client.list_tools()).tools
        recorder.log("tools/list", count=len(tools), names=[tool.name for tool in tools])
        return {"connected": True, "session": session,
                "tools": [_tool_schema(tool) for tool in tools], "events": recorder.events}


async def call_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    recorder = Recorder()
    recorder.log("spawn", transport="stdio")
    async with Client(SERVER_PARAMS) as client:
        session = _session_info(client)
        recorder.log("initialize", **session)
        published = {tool.name: tool for tool in (await client.list_tools()).tools}
        recorder.log("tools/list", names=sorted(published))
        if name not in published:
            # Chỉ gọi tool mà SERVER công bố; không bịa tool phía client.
            recorder.log("rejected", reason=f"server không công bố tool {name!r}")
            return {"connected": True, "session": session, "tool": name, "arguments": arguments,
                    "result": {"is_error": True, "text": f"Server không có tool {name!r}",
                               "structured": None},
                    "schema": None, "events": recorder.events}
        recorder.log("tools/call", name=name, arguments=arguments)
        result = await client.call_tool(name, arguments)
        recorder.log("result", is_error=bool(result.is_error))
        return {
            "connected": True, "session": session, "tool": name, "arguments": arguments,
            "schema": _tool_schema(published[name]),
            "result": {"is_error": bool(result.is_error), "text": _result_text(result),
                       "structured": getattr(result, "structured_content", None)},
            "events": recorder.events,
        }


async def resources_and_prompts(goal: str) -> dict[str, Any]:
    recorder = Recorder()
    recorder.log("spawn", transport="stdio")
    async with Client(SERVER_PARAMS) as client:
        session = _session_info(client)
        recorder.log("initialize", **session)
        resources = (await client.list_resources()).resources
        recorder.log("resources/list", uris=[str(resource.uri) for resource in resources])
        read = None
        if resources:
            uri = str(resources[0].uri)
            contents = (await client.read_resource(uri)).contents
            recorder.log("resources/read", uri=uri, blocks=len(contents))
            read = {"uri": uri,
                    "mime_type": getattr(contents[0], "mime_type", None) if contents else None,
                    "text": "\n".join(getattr(block, "text", "") for block in contents)}
        prompts = (await client.list_prompts()).prompts
        recorder.log("prompts/list", names=[prompt.name for prompt in prompts])
        got = None
        if prompts:
            prompt_result = await client.get_prompt(prompts[0].name, {"goal": goal})
            recorder.log("prompts/get", name=prompts[0].name, messages=len(prompt_result.messages))
            got = {
                "name": prompts[0].name,
                "messages": [{"role": message.role,
                              "text": getattr(message.content, "text", str(message.content))}
                             for message in prompt_result.messages],
            }
        return {"connected": True, "session": session,
                "resources": [{"uri": str(r.uri), "name": r.name, "description": r.description,
                               "mime_type": r.mime_type} for r in resources],
                "resource_read": read,
                "prompts": [{"name": p.name, "description": p.description,
                             "arguments": [a.name for a in (p.arguments or [])]} for p in prompts],
                "prompt_get": got, "events": recorder.events}
