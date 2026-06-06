"""LLM Client — DeepSeek V4-Pro API wrapper with logging and retry."""

import asyncio
import json
import re
from typing import Optional, Type, TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.config import settings
from app.llm_logger import llm_logger, LLMTimer

T = TypeVar("T", bound=BaseModel)

# DeepSeek pricing (approximate, per 1M tokens)
INPUT_COST_PER_1K = 0.001  # CNY per 1K input tokens
OUTPUT_COST_PER_1K = 0.002  # CNY per 1K output tokens


class LLMError(Exception):
    """Base LLM error."""
    pass


class RateLimitError(LLMError):
    """429 rate limit error."""
    pass


class LLMServerError(LLMError):
    """5xx server error."""
    pass


class LLMOutputError(LLMError):
    """Output parsing/validation error."""
    pass


class LLMClient:
    """DeepSeek V4-Pro API client with logging, retry, and Pydantic validation."""

    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.base_url = settings.DEEPSEEK_BASE_URL
        self.model = settings.DEEPSEEK_MODEL

    async def call(
        self,
        messages: list[dict],
        project_id: str,
        stage: str,
        chapter: Optional[int] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Make a raw LLM API call with logging."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        with LLMTimer() as timer:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )

        # Parse response
        if response.status_code == 429:
            raise RateLimitError("Rate limit exceeded")
        if response.status_code >= 500:
            raise LLMServerError(f"Server error: {response.status_code}")
        if response.status_code != 200:
            raise LLMError(f"API error: {response.status_code} {response.text}")

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        token_in = usage.get("prompt_tokens", 0)
        token_out = usage.get("completion_tokens", 0)
        cost = (token_in * INPUT_COST_PER_1K + token_out * OUTPUT_COST_PER_1K) / 1000

        llm_logger.log_call(
            project_id=project_id,
            stage=stage,
            chapter=chapter,
            latency_ms=timer.latency_ms,
            token_in=token_in,
            token_out=token_out,
            cost_cny=cost,
            status="success",
        )

        return content

    async def call_with_model(
        self,
        messages: list[dict],
        output_model: Type[T],
        project_id: str,
        stage: str,
        chapter: Optional[int] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> T:
        """Call LLM and parse output into a Pydantic model.

        Includes retry with modified prompt and regex extraction fallback.
        """
        # First attempt
        try:
            content = await self.call(messages, project_id, stage, chapter, temperature, max_tokens)
            return self._parse_output(content, output_model)
        except (ValidationError, LLMOutputError):
            pass

        # Retry with strict prompt
        strict_messages = messages + [
            {"role": "user", "content": "请严格输出JSON格式，不要包含任何其他文字。"}
        ]
        try:
            content = await self.call(strict_messages, project_id, stage, chapter, temperature, max_tokens)
            return self._parse_output(content, output_model)
        except (ValidationError, LLMOutputError):
            pass

        # Regex extraction fallback
        try:
            return self._regex_extract(content, output_model)
        except Exception as e:
            llm_logger.log_call(
                project_id=project_id,
                stage=stage,
                chapter=chapter,
                latency_ms=0,
                token_in=0,
                token_out=0,
                cost_cny=0,
                status="error",
                error=f"Pydantic validation failed after retry: {e}",
            )
            raise LLMOutputError(f"Failed to parse LLM output into {output_model.__name__}")

    def _parse_output(self, content: str, model: Type[T]) -> T:
        """Parse LLM output string into Pydantic model."""
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1).strip()
        else:
            json_str = content.strip()

        # Remove any leading/trailing non-JSON characters
        json_str = json_str.strip()
        if json_str.startswith("```"):
            json_str = json_str[3:]
        if json_str.endswith("```"):
            json_str = json_str[:-3]

        try:
            data = json.loads(json_str)
            return model.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as e:
            raise LLMOutputError(f"Failed to parse: {e}")

    def _regex_extract(self, content: str, model: Type[T]) -> T:
        """Attempt regex extraction of JSON from LLM output."""
        # Find the largest {...} or [...] block
        json_pattern = re.search(r'[\[{].*[\]}]', content, re.DOTALL)
        if json_pattern:
            json_str = json_pattern.group(0)
            data = json.loads(json_str)
            return model.model_validate(data)
        raise LLMOutputError("No JSON block found in output")


# Singleton
llm_client = LLMClient()
