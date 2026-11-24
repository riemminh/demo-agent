"""Endpoint của Demo 03 (prefix /api/demos/03): một tool round với Claude thật.

POST /run  -> {scenario, prompt, max_tokens?} -> trace thật của hai lần gọi Claude
GET  /tools -> schema đang gửi cho model (để UI hiện tool definition)
"""

from typing import Annotated, Any, Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, StringConstraints

import config

from .tool_calling import run_tool_round
from .tools import TOOL_SCHEMAS

router = APIRouter()

ERROR_STATUS = {"config_missing": 503, "timeout": 504, "connection_error": 502}

# Mỗi scenario quyết định: tool nào được gửi cho model, và có ép tool_choice hay không.
SCENARIOS: dict[str, dict[str, Any]] = {
    "single": {"tools": ["sum_numbers"], "forced_tool": "sum_numbers"},
    "registry": {"tools": ["sum_numbers", "count_words", "divide_numbers"], "forced_tool": None},
    "error": {"tools": ["divide_numbers"], "forced_tool": "divide_numbers"},
}


class RunRequest(BaseModel):
    scenario: Literal["single", "registry", "error"]
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    max_tokens: int = Field(default=2048, ge=1)


@router.get("/tools")
async def get_tools() -> dict[str, Any]:
    return {"tools": TOOL_SCHEMAS}


@router.post("/run")
async def post_run(body: RunRequest) -> JSONResponse:
    if body.max_tokens > config.LLM_MAX_TOKENS:
        raise HTTPException(422, f"max_tokens phải <= {config.LLM_MAX_TOKENS} (LLM_MAX_TOKENS)")
    scenario = SCENARIOS[body.scenario]
    result = await run_tool_round(
        body.prompt, scenario["tools"], scenario["forced_tool"], body.max_tokens,
    )
    if result["status"] == "succeeded":
        return JSONResponse(result)
    return JSONResponse(status_code=ERROR_STATUS.get(result["error"]["kind"], 502), content=result)
