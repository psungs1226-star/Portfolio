"""Ollama loopback client (same model config as insaon)."""

from __future__ import annotations

import httpx


class OllamaClient:
    def __init__(
        self,
        model: str = "qwen3:4b-instruct",
        base_url: str = "http://127.0.0.1:11434/api",
        timeout: float = 120.0,
    ) -> None:
        self._model = model
        self._base_url = base_url
        self._timeout = timeout

    def is_available(self) -> bool:
        try:
            with httpx.Client(
                base_url=self._base_url,
                timeout=5.0,
                follow_redirects=False,
                trust_env=False,
            ) as client:
                return client.get("/tags").status_code == 200
        except httpx.HTTPError:
            return False

    def generate(self, system: str, user: str) -> str:
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {"temperature": 0},
            "keep_alive": "20m",
        }
        with httpx.Client(
            base_url=self._base_url,
            timeout=self._timeout,
            follow_redirects=False,
            trust_env=False,
        ) as client:
            resp = client.post("/chat", json=payload)
            resp.raise_for_status()
        return resp.json().get("message", {}).get("content", "")
