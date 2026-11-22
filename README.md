# Minimal Agent → FastAPI → Queue → SSE → Next.js demo

Matches the communication architecture of `riemminh/dev-support-agent`.
`agent.py` uses simulated LLM/tool delays to isolate and explain streaming mechanics.

## Backend

Requires [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
uv run uvicorn api:app --reload --port 9000
```

Add a dependency with `uv add <package>`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001 (backend CORS allows 3000 and 3001).

This demo intentionally creates sessions in Python process RAM and a new asyncio.Queue for each message. It does not implement persistence, authentication, client disconnect cancellation or approval. The real project handles approvals in `app/core/approvals.py`.

## Exact "on event" locations

- **Agent producer**: `agent.py` calls `emit({...})`.
- **Runner wiring**: `api.py`'s `emit` executes `queue.put_nowait(event)`.
- **Backend consumer**: `api.py`'s `event = await queue.get()` waits for events.
- **SSE network bridge**: `api.py`'s `yield 'data: ...\\n\\n'` pushes frames to browser.
- **Frontend consumer**: `web.tsx` uses `await reader.read()` to read chunks, splits complete SSE frames, then invokes `onEvent(event)`.
- **React renderer**: `web.tsx`'s `handleEvent()` updates state and re-renders UI.
