"""Pipeline Orchestrator — code-driven pipeline execution.

Manages agent lifecycle: init → execute → output → next.
Emits SSE events for frontend progress display.
SSE stage_progress includes elapsed_sec and events_count per spec.
Accumulates total_cost from LLM logger.
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Callable, Optional

from app.chapter_splitter import split_chapters, Chapter
from app.llm_logger import llm_logger
from app.pipeline.extractor import ExtractorAgent
from app.pipeline.analyzer import AnalyzerAgent
from app.pipeline.planner import PlannerAgent
from app.pipeline.writer import WriterAgent
from app.pipeline.reviewer import ReviewerAgent
from app.pipeline.assembler import Assembler
from app.workspace import workspace_manager


class PipelineOrchestrator:
    """Orchestrate the 5-stage pipeline with SSE event emission."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self._start_time: float = 0
        self._total_cost: float = 0.0
        self._event_callbacks: list[Callable] = []
        self._stage_start_time: float = 0  # Track per-stage start time
        self._events_count: int = 0  # Track events count for extractor

    def on_event(self, callback: Callable):
        """Register an SSE event callback."""
        self._event_callbacks.append(callback)

    def _emit_event(self, event_data: dict):
        """Emit an SSE event to all registered callbacks."""
        event_data["ts"] = datetime.now(timezone.utc).isoformat()
        for callback in self._event_callbacks:
            try:
                callback(event_data)
            except Exception:
                pass

    async def run_pipeline(
        self,
        novel_text: str,
        novel_title: str = "",
    ) -> AsyncGenerator[dict, None]:
        """Run the complete 5-stage pipeline.

        Yields SSE events as they occur.
        """
        self._start_time = time.monotonic()
        event_queue: asyncio.Queue = asyncio.Queue()

        def queue_event(data: dict):
            asyncio.get_event_loop().call_soon_threadsafe(
                event_queue.put_nowait, data
            )

        self.on_event(queue_event)

        # Run pipeline in background
        pipeline_task = asyncio.create_task(
            self._run_pipeline(novel_text, novel_title)
        )

        # Yield events as they come
        while not pipeline_task.done() or not event_queue.empty():
            try:
                event = await asyncio.wait_for(event_queue.get(), timeout=0.5)
                yield event
            except asyncio.TimeoutError:
                continue

        # Check for pipeline errors
        if pipeline_task.exception():
            yield {
                "event": "stage_failed",
                "stage": "pipeline",
                "error": str(pipeline_task.exception()),
                "recoverable": False,
            }

    async def _run_pipeline(self, novel_text: str, novel_title: str):
        """Execute the 5-stage pipeline."""
        # Split chapters
        chapters = split_chapters(novel_text)
        chapter_dicts = [
            {"number": ch.number, "title": ch.title, "content": ch.content}
            for ch in chapters
        ]

        # Save raw novel
        workspace_manager.write_file(
            self.project_id, "00_raw", "novel.txt", novel_text
        )

        total_chapters = len(chapters)

        # ── Stage 0: Extractor ──────────────────────────────────
        self._stage_start_time = time.monotonic()
        self._events_count = 0
        self._emit_event({
            "event": "stage_started",
            "stage": "extractor",
            "total_chapters": total_chapters,
        })

        try:
            extractor = ExtractorAgent(self.project_id)

            def extractor_progress(stage, chapter, total, status):
                self._events_count += 1
                self._emit_event({
                    "event": "stage_progress",
                    "stage": stage,
                    "chapter": chapter,
                    "total": total,
                    "chapter_status": status,
                    "elapsed_sec": round(time.monotonic() - self._stage_start_time, 1),
                    "events_count": self._events_count,
                })

            events_result = await extractor.execute(
                chapters=chapter_dicts,
                progress_callback=extractor_progress,
            )

            self._emit_event({
                "event": "stage_completed",
                "stage": "extractor",
                "duration_sec": round(time.monotonic() - self._stage_start_time, 1),
                "outputs": {"events_json": f"workspace/{self.project_id}/10_events/events.json"},
            })
        except Exception as e:
            self._emit_event({
                "event": "stage_failed",
                "stage": "extractor",
                "chapter": 0,
                "error": str(e),
                "retry_count": 0,
                "recoverable": True,
            })
            return

        # ── Stage 1: Analyzer ───────────────────────────────────
        self._stage_start_time = time.monotonic()
        self._emit_event({
            "event": "stage_started",
            "stage": "analyzer",
            "total_chapters": 1,
        })

        try:
            analyzer = AnalyzerAgent(self.project_id)
            analysis = await analyzer.execute()
            self._emit_event({
                "event": "stage_completed",
                "stage": "analyzer",
                "duration_sec": round(time.monotonic() - self._stage_start_time, 1),
                "outputs": {"analysis_json": f"workspace/{self.project_id}/20_analysis/analysis.json"},
            })
        except Exception as e:
            self._emit_event({
                "event": "stage_failed",
                "stage": "analyzer",
                "chapter": 0,
                "error": str(e),
                "retry_count": 0,
                "recoverable": True,
            })
            return

        # ── Stage 2: Planner ───────────────────────────────────
        self._stage_start_time = time.monotonic()
        self._emit_event({
            "event": "stage_started",
            "stage": "planner",
            "total_chapters": 1,
        })

        try:
            planner = PlannerAgent(self.project_id)
            plan = await planner.execute()
            self._emit_event({
                "event": "stage_completed",
                "stage": "planner",
                "duration_sec": round(time.monotonic() - self._stage_start_time, 1),
                "outputs": {"plan_json": f"workspace/{self.project_id}/30_plan/plan.json"},
            })
        except Exception as e:
            self._emit_event({
                "event": "stage_failed",
                "stage": "planner",
                "chapter": 0,
                "error": str(e),
                "retry_count": 0,
                "recoverable": True,
            })
            return

        # ── Stage 3: Writer ────────────────────────────────────
        self._stage_start_time = time.monotonic()
        self._events_count = 0
        self._emit_event({
            "event": "stage_started",
            "stage": "writer",
            "total_chapters": total_chapters,
        })

        try:
            writer = WriterAgent(self.project_id)

            def writer_progress(stage, chapter, total, status):
                self._events_count += 1
                self._emit_event({
                    "event": "stage_progress",
                    "stage": stage,
                    "chapter": chapter,
                    "total": total,
                    "chapter_status": status,
                    "elapsed_sec": round(time.monotonic() - self._stage_start_time, 1),
                    "events_count": self._events_count,
                })

            writer_results = await writer.execute(
                chapters=chapter_dicts,
                progress_callback=writer_progress,
            )
            self._emit_event({
                "event": "stage_completed",
                "stage": "writer",
                "duration_sec": round(time.monotonic() - self._stage_start_time, 1),
                "outputs": {"scripts_dir": f"workspace/{self.project_id}/40_scripts/"},
            })
        except Exception as e:
            self._emit_event({
                "event": "stage_failed",
                "stage": "writer",
                "chapter": 0,
                "error": str(e),
                "retry_count": 0,
                "recoverable": True,
            })
            return

        # ── Stage 4: Reviewer + Assembler ──────────────────────
        self._stage_start_time = time.monotonic()
        self._emit_event({
            "event": "stage_started",
            "stage": "reviewer",
            "total_chapters": 1,
        })

        try:
            # Assemble final script first
            assembler = Assembler(self.project_id)
            script = assembler.execute(novel_title=novel_title)

            # Then review
            reviewer = ReviewerAgent(self.project_id)
            review = await reviewer.execute()

            self._emit_event({
                "event": "stage_completed",
                "stage": "reviewer",
                "duration_sec": round(time.monotonic() - self._stage_start_time, 1),
                "outputs": {"review_json": f"workspace/{self.project_id}/50_review/review.json"},
            })
        except Exception as e:
            self._emit_event({
                "event": "stage_failed",
                "stage": "reviewer",
                "chapter": 0,
                "error": str(e),
                "retry_count": 0,
                "recoverable": True,
            })
            return

        # ── Pipeline Complete ───────────────────────────────────
        total_duration = round(time.monotonic() - self._start_time, 1)
        # A14: Accumulate total_cost from LLM logger
        self._total_cost = llm_logger.get_total_cost(self.project_id)
        pipeline_complete_event = {
            "event": "pipeline_completed",
            "outputs": [
                "script.yaml",
                "events.json",
                "analysis.json",
                "plan.json",
                "review.json",
            ],
            "total_duration_sec": total_duration,
            "total_cost": self._total_cost,
        }
        # Include review status if available
        try:
            review_data = workspace_manager.read_json(
                self.project_id, "50_review", "review.json"
            )
            if review_data.get("review_status"):
                pipeline_complete_event["review_status"] = review_data["review_status"]
            if review_data.get("overall_score"):
                pipeline_complete_event["review_score"] = review_data["overall_score"]
        except Exception:
            pass
        self._emit_event(pipeline_complete_event)

    async def regenerate_episode(
        self,
        episode_number: int,
        regenerate_downstream: bool = True,
    ) -> dict:
        """Regenerate a single episode.

        Args:
            episode_number: The episode to regenerate
            regenerate_downstream: If True, also regenerate next episode
        """
        # Read chapters from raw novel
        novel_text = workspace_manager.read_file(
            self.project_id, "00_raw", "novel.txt"
        )
        chapters = split_chapters(novel_text)
        chapter_dicts = [
            {"number": ch.number, "title": ch.title, "content": ch.content}
            for ch in chapters
        ]

        writer = WriterAgent(self.project_id)

        # Regenerate target episode
        results = await writer.execute(
            chapters=chapter_dicts,
            single_episode=episode_number,
        )

        # Optionally regenerate downstream
        if regenerate_downstream:
            plan_data = workspace_manager.read_json(
                self.project_id, "30_plan", "plan.json"
            )
            next_ep = episode_number + 1
            if next_ep <= len(plan_data.get("episodes", [])):
                downstream_results = await writer.execute(
                    chapters=chapter_dicts,
                    single_episode=next_ep,
                )
                results.extend(downstream_results)

        # Re-assemble and re-review
        assembler = Assembler(self.project_id)
        assembler.execute()

        reviewer = ReviewerAgent(self.project_id)
        await reviewer.execute()

        return {"status": "ok", "results": results}

    async def retry_stage(self, stage: str) -> dict:
        """Retry a failed stage."""
        if not workspace_manager.validate_upstream(self.project_id, stage):
            return {"status": "error", "message": "上游依赖不满足"}

        novel_text = workspace_manager.read_file(
            self.project_id, "00_raw", "novel.txt"
        )
        chapters = split_chapters(novel_text)
        chapter_dicts = [
            {"number": ch.number, "title": ch.title, "content": ch.content}
            for ch in chapters
        ]

        try:
            if stage == "extractor":
                agent = ExtractorAgent(self.project_id)
                await agent.execute(chapters=chapter_dicts)
            elif stage == "analyzer":
                agent = AnalyzerAgent(self.project_id)
                await agent.execute()
            elif stage == "planner":
                agent = PlannerAgent(self.project_id)
                await agent.execute()
            elif stage == "writer":
                agent = WriterAgent(self.project_id)
                await agent.execute(chapters=chapter_dicts)
            elif stage == "reviewer":
                agent = ReviewerAgent(self.project_id)
                await agent.execute()
            else:
                return {"status": "error", "message": f"未知阶段: {stage}"}

            return {"status": "ok", "message": f"阶段 {stage} 重试成功"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
