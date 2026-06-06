"""Extractor Agent — extracts per-chapter event summaries.

Stage 0: Reads raw novel text, outputs events.json to workspace/10_events/.
Runs N LLM calls (one per chapter) with shared concurrency pool (total = 2).
Uses RetryPolicy for classified retry with exponential backoff 1s/3s/9s.
"""

import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator, Callable, Optional

from app.concurrency import concurrency_controller
from app.llm_client import llm_client, RateLimitError, LLMServerError, LLMOutputError
from app.pipeline.base import BaseAgent
from app.pipeline.retry import RetryPolicy, classify_error, ErrorCategory
from app.schemas import Event, ChapterEvents, EventsResult
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extractor.md"


class ExtractorAgent(BaseAgent):
    """Extract per-chapter event summaries from raw novel text."""

    stage_name = "extractor"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

    async def execute(
        self,
        chapters: list[dict],
        progress_callback: Optional[Callable] = None,
    ) -> EventsResult:
        """Extract events for each chapter.

        Args:
            chapters: List of {"number": int, "title": str, "content": str}
            progress_callback: Optional callback(stage, chapter, total, status)
        """
        if not self.validate_upstream():
            raise RuntimeError(f"Upstream validation failed for {self.stage_name}")

        results: list[ChapterEvents] = []
        total = len(chapters)

        async def extract_chapter(chapter: dict) -> ChapterEvents:
            async with concurrency_controller._semaphore:
                messages = [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": f"章节标题: {chapter['title']}\n\n{chapter['content']}"},
                ]

                # Classified retry via RetryPolicy
                # Rate limit: exponential backoff 1s/3s/9s (3 retries)
                event = None
                last_error = None

                for attempt in range(RetryPolicy.MAX_RETRIES[ErrorCategory.RATE_LIMIT] + 1):
                    try:
                        event = await llm_client.call_with_model(
                            messages=messages,
                            output_model=Event,
                            project_id=self.project_id,
                            stage=self.stage_name,
                            chapter=chapter["number"],
                            temperature=0.3,
                        )
                        break
                    except RateLimitError:
                        if attempt >= RetryPolicy.MAX_RETRIES[ErrorCategory.RATE_LIMIT]:
                            event = Event()
                            break
                        delay = RetryPolicy.BASE_DELAYS[ErrorCategory.RATE_LIMIT] * (
                            RetryPolicy.EXP_BASE[ErrorCategory.RATE_LIMIT] ** attempt
                        )
                        await asyncio.sleep(delay)
                        last_error = RateLimitError()
                    except (LLMOutputError, Exception) as e:
                        category = classify_error(e)
                        max_retries = RetryPolicy.MAX_RETRIES[category]
                        if attempt >= max_retries:
                            event = Event()
                            break
                        base_delay = RetryPolicy.BASE_DELAYS[category]
                        exp_base = RetryPolicy.EXP_BASE[category]
                        await asyncio.sleep(base_delay * (exp_base ** attempt))
                        last_error = e
                else:
                    event = Event()

                result = ChapterEvents(
                    chapter=chapter["number"],
                    title=chapter["title"],
                    events=event,
                )

                if progress_callback:
                    progress_callback(self.stage_name, chapter["number"], total, "done")

                return result

        # Run all chapters concurrently with semaphore
        tasks = [extract_chapter(ch) for ch in chapters]
        results = await asyncio.gather(*tasks)

        # Build and save EventsResult
        events_result = EventsResult(chapters=list(results))
        workspace_manager.write_json(
            self.project_id, "10_events", "events.json",
            events_result.model_dump(),
        )

        return events_result
