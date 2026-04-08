"""
gemini_service.py - Gemini AI crisis parsing for CrisisNetra
"""
import os
import logging
import httpx

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = "gemini-2.0-flash"
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    async def parse_crisis(self, text: str) -> dict:
        if not self.api_key:
            return {"error": "GEMINI_API_KEY not configured"}
        prompt = f"""
Parse this disaster/crisis report and extract structured information.
Return JSON with: incident_type, severity (critical/high/medium), location, casualties_estimate, description.

Report: {text}

Respond ONLY with valid JSON.
"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}?key={self.api_key}",
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                )
                data = resp.json()
            content = data["candidates"][0]["content"]["parts"][0]["text"]
            import json, re
            match = re.search(r'\{.*\}', content, re.DOTALL)
            return json.loads(match.group()) if match else {"raw": content}
        except Exception as e:
            logger.error(f"Gemini parse failed: {e}")
            return {"error": str(e)}
