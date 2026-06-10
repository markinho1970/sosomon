import os
import asyncio
import json
from typing import Optional

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")


async def _call_anthropic(prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    """Attempt to call Anthropic (Claude). Tries SDK import first, falls back to HTTP."""
    # Prefer SDK if installed
    try:
        import anthropic

        def sync_call():
            client = anthropic.Client(api_key=ANTHROPIC_KEY)
            resp = client.complete(
                model="claude-2.1",
                prompt=prompt,
                max_tokens_to_sample=max_tokens,
                temperature=temperature,
            )
            # SDK returns object with "completion"
            return getattr(resp, "completion", str(resp))

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, sync_call)
    except Exception:
        # Fallback to HTTP via httpx
        try:
            import httpx

            url = "https://api.anthropic.com/v1/complete"
            headers = {"x-api-key": ANTHROPIC_KEY, "Content-Type": "application/json"}

            payload = {
                "model": "claude-2.1",
                "prompt": prompt,
                "max_tokens_to_sample": max_tokens,
                "temperature": temperature,
            }

            async with httpx.AsyncClient(timeout=30) as c:
                r = await c.post(url, headers=headers, json=payload)
                r.raise_for_status()
                data = r.json()
                # response may have 'completion' or 'completion' nested
                if isinstance(data, dict):
                    return data.get("completion") or data.get("text") or json.dumps(data)
                return str(data)
        except Exception as e:
            raise RuntimeError(f"Anthropic call failed: {e}")


_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=GEMINI_KEY)
    return _gemini_client


async def _call_gemini(prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    """Call Google GenAI Gemini if configured (uses google.genai)."""
    try:
        client = _get_gemini_client()
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash-lite", contents=prompt
        )
        return getattr(response, "text", str(response))
    except Exception as e:
        raise RuntimeError("Gemini call failed: " + str(e))


async def generate(prompt: str, max_tokens: int = 512, temperature: float = 0.0) -> str:
    """Unified async API to generate text from the configured LLM.

    Priority: Anthropic (if ANTHROPIC_API_KEY set) -> Gemini (if GEMINI_API_KEY set)
    """
    if ANTHROPIC_KEY:
        return await _call_anthropic(prompt, max_tokens=max_tokens, temperature=temperature)
    if GEMINI_KEY:
        return await _call_gemini(prompt, max_tokens=max_tokens, temperature=temperature)
    raise RuntimeError("No LLM provider configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.")
