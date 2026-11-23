"""Endpoint của Demo 02 (prefix /api/demos/02): Claude Messages API thật.

POST /messages        -> một request non-streaming (dùng cho scenario One-shot và History)
POST /messages/stream -> SSE: text_delta theo thời gian thực, final có usage/stop_reason
Handler mỏng: validate input rồi gọi messages.py / streaming.py.
"""

import json
from collections.abc import AsyncIterator
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, StringConstraints

import config
from .messages import run_messages
from .streaming import stream_events

router = APIRouter()

# Map lỗi của demo sang HTTP status cho frontend.
ERROR_STATUS = {"config_missing": 503, "timeout": 504, "connection_error": 502}

Content = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: Content


class MessagesRequest(BaseModel):
    # Tối đa 10 turn: đủ cho scenario History, chặn request quá lớn.
    messages: list[Turn] = Field(min_length=1, max_length=10)
    system: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    max_tokens: int = Field(default=512, ge=1)

    def turns(self) -> list[dict[str, str]]:
        return [turn.model_dump() for turn in self.messages]


def validate_limits(body: MessagesRequest) -> None:
    if body.max_tokens > config.LLM_MAX_TOKENS:
        raise HTTPException(422, f"max_tokens phải <= {config.LLM_MAX_TOKENS} (LLM_MAX_TOKENS)")
    if body.messages[-1].role != "user":
        raise HTTPException(422, "Turn cuối cùng phải có role=user")


@router.post("/messages")
async def post_messages(body: MessagesRequest) -> JSONResponse:
    validate_limits(body)
    result = await run_messages(body.turns(), body.system, body.max_tokens)
    if result["status"] == "succeeded":
        return JSONResponse(result)
    # Anthropic trả 4xx/5xx thì mình trả 502: backend ổn, upstream lỗi.
    status = ERROR_STATUS.get(result["error"]["kind"], 502)
    return JSONResponse(status_code=status, content=result)


@router.post("/messages/stream")
async def post_messages_stream(body: MessagesRequest) -> StreamingResponse:
    validate_limits(body)

    async def sse() -> AsyncIterator[str]:
        # Lỗi (kể cả thiếu config) đi vào event stream, không thành HTTP status,
        # vì response đã bắt đầu stream khi biết lỗi.
        async for event in stream_events(body.turns(), body.system, body.max_tokens):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        sse(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
