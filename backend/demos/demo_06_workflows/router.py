"""Endpoint của Demo 06 (prefix /api/demos/06): năm workflow pattern.

POST /run  -> {scenario, input} -> {answer, steps[], metrics, error}
GET  /caps -> budget và cap của từng scenario (UI hiển thị, backend enforce)
"""

from typing import Annotated, Any, Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, StringConstraints

from .patterns import BUDGETS, MAX_REVISIONS, MAX_WORKERS, run_workflow

router = APIRouter()

ERROR_STATUS = {"config_missing": 503, "timeout": 504, "connection_error": 502,
                "budget_exceeded": 409}

Scenario = Literal["chaining", "routing", "parallel", "orchestrator", "evaluator"]


class RunRequest(BaseModel):
    scenario: Scenario
    input: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


@router.get("/caps")
async def get_caps() -> dict[str, Any]:
    return {"budgets": BUDGETS, "max_workers": MAX_WORKERS, "max_revisions": MAX_REVISIONS}


@router.post("/run")
async def post_run(body: RunRequest) -> JSONResponse:
    result = await run_workflow(body.scenario, body.input)
    if result["status"] == "succeeded":
        return JSONResponse(result)
    # Trace vẫn được trả về khi fail: người xem thấy nó dừng ở bước nào.
    return JSONResponse(status_code=ERROR_STATUS.get(result["error"]["kind"], 502), content=result)
