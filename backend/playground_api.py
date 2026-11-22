"""Routes REST cho Playground V2 (health + các lesson đã implement).

Handler mỏng: validate body bằng Pydantic, gọi hàm lesson, chọn HTTP status.
Không gọi model khi load page; chỉ POST lesson mới gọi Claude.
"""
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, StringConstraints

import config
from lessons.messages_api import run_messages_api

router = APIRouter(prefix="/api")

BACKEND_DIR = Path(__file__).parent
MESSAGES_API_SOURCE = "lessons/messages_api.py"  # Path cố định, không nhận từ client.

# Map lỗi của lesson sang HTTP status cho frontend.
ERROR_STATUS = {"config_missing": 503, "timeout": 504, "connection_error": 502}


@router.get("/health")
async def health() -> dict[str, Any]:
    # Không gọi Claude. Chỉ báo config an toàn: không trả key hay một phần key.
    missing = config.missing_llm_settings()
    return {
        "ok": True,
        "llm_configured": not missing,
        "missing_env": missing,
        "model": config.LLM_MODEL or None,
        "max_tokens_cap": config.LLM_MAX_TOKENS,
        "timeout_seconds": config.LLM_TIMEOUT_SECONDS,
    }


class MessagesApiInput(BaseModel):
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
    system: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    max_tokens: int = Field(default=512, ge=1)


@router.post("/lessons/messages-api")
async def post_messages_api(body: MessagesApiInput) -> JSONResponse:
    if body.max_tokens > config.LLM_MAX_TOKENS:
        return JSONResponse(status_code=422, content={
            "detail": f"max_tokens must be <= {config.LLM_MAX_TOKENS} (LLM_MAX_TOKENS)"})

    result = await run_messages_api(body.prompt, body.system, body.max_tokens)
    if result["status"] == "succeeded":
        return JSONResponse(result)
    # Lỗi từ Anthropic (4xx/5xx) trả 502: backend của mình ổn, upstream lỗi.
    status = ERROR_STATUS.get(result["error"]["kind"], 502)
    return JSONResponse(status_code=status, content=result)


@router.get("/lessons/messages-api/source")
async def get_messages_api_source() -> dict[str, str]:
    # Đọc đúng file đang chạy để UI hiển thị code thật, có số dòng để đặt breakpoint.
    return {"path": f"backend/{MESSAGES_API_SOURCE}",
            "code": (BACKEND_DIR / MESSAGES_API_SOURCE).read_text(encoding="utf-8")}
