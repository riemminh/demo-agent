"""FastAPI app của workspace: chỉ tạo app, CORS, health và include router từng demo.

Mọi logic nằm trong backend/demos/demo_XX_*/. Router của demo chưa có code thật
thì KHÔNG import ở đây (plans/00-START-HERE.md, mục 3).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from demos.demo_01_runtime.router import router as demo_01_router
from demos.demo_02_claude_api.router import router as demo_02_router

app = FastAPI(title="AI Agent Demo Workspace")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://localhost:3001",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"http://192\.168\.\d{1,3}\.\d{1,3}:(3000|3001)",
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> dict[str, object]:
    # Không gọi Claude và không trả key (kể cả một phần key).
    missing = config.missing_llm_settings()
    return {
        "ok": True,
        "llm_configured": not missing,
        "missing_env": missing,
        "model": config.LLM_MODEL or None,
        "max_tokens_cap": config.LLM_MAX_TOKENS,
        "timeout_seconds": config.LLM_TIMEOUT_SECONDS,
    }


app.include_router(demo_01_router, prefix="/api/demos/01", tags=["demo-01-runtime"])
app.include_router(demo_02_router, prefix="/api/demos/02", tags=["demo-02-claude-api"])
# Thêm router demo mới SAU KHI demo đó có code thật.
