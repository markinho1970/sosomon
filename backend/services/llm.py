import os
import asyncio
import json

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

# Models tried in order — first available wins; on 503 retries before moving on
_GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"]
_GEMINI_RETRIES = 3
_GEMINI_RETRY_DELAY = 10  # seconds between retries on 503

_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=GEMINI_KEY)
    return _gemini_client


async def _call_gemini(prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    client = _get_gemini_client()
    last_error = None
    for model in _GEMINI_MODELS:
        for attempt in range(_GEMINI_RETRIES):
            try:
                response = await client.aio.models.generate_content(
                    model=model, contents=prompt
                )
                return getattr(response, "text", str(response))
            except Exception as e:
                err_str = str(e)
                last_error = e
                is_overloaded = "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str
                if is_overloaded and attempt < _GEMINI_RETRIES - 1:
                    await asyncio.sleep(_GEMINI_RETRY_DELAY * (attempt + 1))
                    continue
                break  # non-retryable error or last attempt — try next model
    raise RuntimeError(f"Gemini call failed (all models/retries exhausted): {last_error}")


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
    """Unified async LLM call. Priority: Gemini (with retry + model fallback) → OpenAI."""
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
