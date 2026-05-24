"""
AI信效度分析系统 — FastAPI 后端代理
唯一职责：安全转发 Claude API 请求，用户自带 API Key
不做：数据存储、用户认证、统计分析
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Reliability Analysis API Proxy", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


class ChatRequest(BaseModel):
    api_key: str
    system_prompt: str
    user_message: str
    model: str = "claude-sonnet-4-6"
    max_tokens: int = 3000
    temperature: float = 0.2


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: dict | None = None


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Proxy a single-turn structured prompt to Claude API."""
    if not req.api_key or not req.api_key.startswith("sk-ant"):
        raise HTTPException(status_code=400, detail="Invalid API key format")

    headers = {
        "x-api-key": req.api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    body = {
        "model": req.model,
        "max_tokens": req.max_tokens,
        "temperature": req.temperature,
        "system": [
            {"type": "text", "text": req.system_prompt}
        ],
        "messages": [
            {"role": "user", "content": req.user_message}
        ],
    }

    logger.info(f"Forwarding to Claude API, model={req.model}, tokens={req.max_tokens}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(ANTHROPIC_API_URL, json=body, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Claude API error: {resp.status_code} {resp.text[:500]}")
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Claude API error: {resp.text[:300]}",
                )
            data = resp.json()
            content_blocks = data.get("content", [])
            text_parts = [b["text"] for b in content_blocks if b.get("type") == "text"]
            return ChatResponse(
                content="\n".join(text_parts),
                model=data.get("model", req.model),
                usage=data.get("usage"),
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Claude API timeout")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
