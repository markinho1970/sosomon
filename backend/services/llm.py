import os
import asyncio
import json

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=GEMINI_KEY)
    return _gemini_client


async def _call_gemini(prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    try:
        client = _get_gemini_client()
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash-lite", contents=prompt
        )
        return getattr(response, "text", str(response))
    except Exception as e:
        raise RuntimeError("Gemini call failed: " + str(e))


async def _call_openai(prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    try:
        import httpx
        headers = {
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        raise RuntimeError("OpenAI call failed: " + str(e))


async def generate(prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    """Unified async LLM call. Priority: Gemini → OpenAI fallback."""
    last_error = None

    if GEMINI_KEY:
        try:
            return await _call_gemini(prompt, max_tokens=max_tokens, temperature=temperature)
        except Exception as e:
            last_error = e

    if OPENAI_KEY:
        try:
            return await _call_openai(prompt, max_tokens=max_tokens, temperature=temperature)
        except Exception as e:
            last_error = e

    raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")
