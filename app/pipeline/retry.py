"""Retry Policy — classified retry with exponential backoff."""

import asyncio
from enum import Enum
from typing import Callable, Optional, Type

from app.llm_client import RateLimitError, LLMServerError, LLMOutputError


class ErrorCategory(str, Enum):
    """Error categories for classified retry."""
    RATE_LIMIT = "rate_limit"       # 429 — exponential backoff, 3 retries
    SERVER_ERROR = "server_error"   # 5xx — exponential backoff, 2 retries
    OUTPUT_ERROR = "output_error"   # Pydantic validation — retry with modified prompt, 1 retry
    DISK_ERROR = "disk_error"       # Disk full / permission — no retry
    UNKNOWN = "unknown"             # Unknown — retry once


def classify_error(error: Exception) -> ErrorCategory:
    """Classify an error into a retry category."""
    if isinstance(error, RateLimitError):
        return ErrorCategory.RATE_LIMIT
    if isinstance(error, LLMServerError):
        return ErrorCategory.SERVER_ERROR
    if isinstance(error, LLMOutputError):
        return ErrorCategory.OUTPUT_ERROR
    if isinstance(error, (OSError, PermissionError)):
        return ErrorCategory.DISK_ERROR
    return ErrorCategory.UNKNOWN


class RetryPolicy:
    """Classified retry policy with exponential backoff."""

    # Max retries per error category
    MAX_RETRIES = {
        ErrorCategory.RATE_LIMIT: 3,
        ErrorCategory.SERVER_ERROR: 2,
        ErrorCategory.OUTPUT_ERROR: 1,
        ErrorCategory.DISK_ERROR: 0,
        ErrorCategory.UNKNOWN: 1,
    }

    # Base delays (seconds) per category — spec requires 1s/3s/9s for rate limit
    BASE_DELAYS = {
        ErrorCategory.RATE_LIMIT: 1.0,   # 1s, 3s, 9s (exponential with base 3)
        ErrorCategory.SERVER_ERROR: 2.0,  # 2s, 6s
        ErrorCategory.OUTPUT_ERROR: 0.5,
        ErrorCategory.DISK_ERROR: 0,
        ErrorCategory.UNKNOWN: 1.0,
    }

    # Exponential base per category
    EXP_BASE = {
        ErrorCategory.RATE_LIMIT: 3.0,   # 1s * 3^0=1s, 1s * 3^1=3s, 1s * 3^2=9s
        ErrorCategory.SERVER_ERROR: 3.0,
        ErrorCategory.OUTPUT_ERROR: 2.0,
        ErrorCategory.DISK_ERROR: 0,
        ErrorCategory.UNKNOWN: 2.0,
    }

    @classmethod
    async def execute_with_retry(
        cls,
        func: Callable,
        *args,
        project_id: str = "",
        stage: str = "",
        **kwargs,
    ) -> any:
        """Execute a function with classified retry policy."""
        last_error = None

        for attempt in range(5):  # Safety limit
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                category = classify_error(e)
                max_retries = cls.MAX_RETRIES[category]

                if attempt >= max_retries:
                    raise

                base_delay = cls.BASE_DELAYS[category]
                exp_base = cls.EXP_BASE[category]
                delay = base_delay * (exp_base ** attempt)

                if delay > 0:
                    await asyncio.sleep(delay)

                last_error = e

        raise last_error
