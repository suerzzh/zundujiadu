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
INPUT_COST_PER_1M = 1.0  # CNY per 1M input tokens (≈0.001 per 1K)
OUTPUT_COST_PER_1M = 2.0  # CNY per 1M output tokens (≈0.002 per 1K)


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
        self.backup_key = settings.DEEPSEEK_API_KEY_BACKUP
        self.base_url = settings.DEEPSEEK_BASE_URL
        self.model = settings.DEEPSEEK_MODEL
        self._using_backup = False

    async def _make_request(self, api_key: str, messages: list[dict], temperature: float, max_tokens: int) -> httpx.Response:
        """Make a single API request with the given key. Returns the raw response."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            return await client.post(
                f"{self.base_url}/v1/chat/completions",
                headers=headers,
                json=payload,
            )

    async def call(
        self,
        messages: list[dict],
        project_id: str,
        stage: str,
        chapter: Optional[int] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Make a raw LLM API call with logging.

        Tries primary API key first, then falls back to backup key on 401/403.
        """
        keys_to_try = [self.api_key]
        if self.backup_key and self.backup_key != self.api_key:
            keys_to_try.append(self.backup_key)

        last_response = None
        for key_index, key in enumerate(keys_to_try):
            with LLMTimer() as timer:
                response = await self._make_request(key, messages, temperature, max_tokens)

            # Success
            if response.status_code == 200:
                if key_index > 0:
                    self.api_key = key
                    self._using_backup = True
                break

            # Auth errors: try next key
            if response.status_code in (401, 403):
                last_response = response
                continue

            # Rate limit
            if response.status_code == 429:
                raise RateLimitError("Rate limit exceeded")
            # Server error
            if response.status_code >= 500:
                raise LLMServerError(f"Server error: {response.status_code}")
            # Other errors
            last_response = response
            break

        # If we exhausted all keys without success
        if last_response is not None and last_response.status_code != 200:
            if last_response.status_code in (401, 403):
                raise LLMError(
                    f"Authentication failed with all available API keys (tried {len(keys_to_try)}). "
                    "Please set a valid DEEPSEEK_API_KEY in your .env file."
                )
            raise LLMError(f"API error: {last_response.status_code} {last_response.text}")

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        token_in = usage.get("prompt_tokens", 0)
        token_out = usage.get("completion_tokens", 0)
        cost = (token_in * INPUT_COST_PER_1M + token_out * OUTPUT_COST_PER_1M) / 1_000_000

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
