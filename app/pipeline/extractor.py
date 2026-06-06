"""Extractor Agent — extracts per-chapter event summaries.

Stage 0: Reads raw novel text, outputs events.json to workspace/10_events/.
Runs N LLM calls (one per chapter) with concurrency limit of 2.
"""

import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator, Callable, Optional

from app.concurrency import concurrency_controller
from app.llm_client import llm_client, RateLimitError, LLMServerError, LLMOutputError
from app.pipeline.base import BaseAgent
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
        semaphore = asyncio.Semaphore(2)  # Concurrency limit

        async def extract_chapter(chapter: dict) -> ChapterEvents:
            async with semaphore:
                messages = [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": f"章节标题: {chapter['title']}\n\n{chapter['content']}"},
                ]

                # Retry with exponential backoff
                for attempt in range(3):
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
                        wait_time = 2 ** attempt  # 1s, 2s, 4s
                        await asyncio.sleep(wait_time)
                    except (LLMOutputError, Exception) as e:
                        if attempt == 2:
                            # Mark as failed, continue pipeline
                            event = Event()
                            break
                        await asyncio.sleep(1)
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
