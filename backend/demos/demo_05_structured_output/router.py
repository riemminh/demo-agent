"""Endpoint của Demo 05 (prefix /api/demos/05): generate / validate / repair.

POST /generate -> gọi Claude với native structured output rồi validate hai tầng
POST /validate -> CHỈ Python, không gọi Claude (dùng cho JSON người dùng sửa tay)
POST /repair   -> gọi Claude đúng một lần với object fail + danh sách lỗi
GET  /schema   -> JSON Schema mà model nhận được
"""

from typing import Annotated, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, StringConstraints

import config

from .generation import generate_draft, repair_draft
from .schemas import json_schema
from .validation import validate_draft

router = APIRouter()

ERROR_STATUS = {"config_missing": 503, "timeout": 504, "connection_error": 502}


class GenerateRequest(BaseModel):
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
    max_tokens: int = Field(default=2048, ge=1)


class ValidateRequest(BaseModel):
    # Nhận JSON tùy ý: chính việc nó sai schema mới là nội dung của demo.
    draft: Any


class RepairRequest(BaseModel):
    draft: Any
    errors: list[str] = Field(min_length=1, max_length=20)
    max_tokens: int = Field(default=2048, ge=1)


def _check_max_tokens(max_tokens: int) -> None:
    if max_tokens > config.LLM_MAX_TOKENS:
        raise HTTPException(422, f"max_tokens phải <= {config.LLM_MAX_TOKENS} (LLM_MAX_TOKENS)")


def _respond(result: dict[str, Any]) -> JSONResponse:
    if result["status"] == "succeeded":
        return JSONResponse(result)
    error = result.get("error") or {}
    kind = error.get("kind")
    if kind is None:
        return JSONResponse(status_code=200, content=result)
    return JSONResponse(status_code=ERROR_STATUS.get(kind, 502), content=result)


@router.get("/schema")
async def get_schema() -> dict[str, Any]:
    return {"schema": json_schema()}


@router.post("/generate")
async def post_generate(body: GenerateRequest) -> JSONResponse:
    _check_max_tokens(body.max_tokens)
    return _respond(await generate_draft(body.prompt, body.max_tokens))


@router.post("/validate")
async def post_validate(body: ValidateRequest) -> dict[str, Any]:
    # Không gọi Claude: validate là code Python thuần, chạy được cả khi offline.
    validation = validate_draft(body.draft)
    return {"stage": "validate", "status": "succeeded", "raw": body.draft,
            "accepted": validation["accepted"], "schema_errors": validation["schema_errors"],
            "semantic_errors": validation["semantic_errors"], "metrics": None,
            "response": None, "error": None, "events": validation["events"]}


@router.post("/repair")
async def post_repair(body: RepairRequest) -> JSONResponse:
    _check_max_tokens(body.max_tokens)
    return _respond(await repair_draft(body.draft, body.errors, body.max_tokens))
