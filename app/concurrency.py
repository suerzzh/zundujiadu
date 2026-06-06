"""Concurrency controller — shared semaphore pool for Extractor and Writer."""

import asyncio
from app.config import settings


class ConcurrencyController:
    """Shared semaphore pool for LLM calls.

    Extractor and Writer share the same semaphore pool (total = LLM_CONCURRENCY).
    When Extractor releases a slot, Writer can immediately use it.
    """

    def __init__(self, max_concurrency: int = 0):
        self._semaphore = asyncio.Semaphore(max_concurrency or settings.LLM_CONCURRENCY)

    async def acquire(self):
        await self._semaphore.acquire()

    def release(self):
        self._semaphore.release()

    async def run_with_limit(self, coro):
        """Run a coroutine with concurrency limit."""
        await self.acquire()
        try:
            return await coro
        finally:
            self.release()


# Singleton — shared between Extractor and Writer
concurrency_controller = ConcurrencyController()
