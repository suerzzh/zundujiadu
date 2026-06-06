"""Analyzer Agent — adaptation analysis based on event table.

Stage 1: Reads events.json (NOT raw novel), outputs analysis.json to workspace/20_analysis/.
"""

from pathlib import Path
from typing import Callable, Optional

from app.llm_client import llm_client
from app.pipeline.base import BaseAgent
from app.schemas import Analysis
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "analyzer.md"


class AnalyzerAgent(BaseAgent):
    """Analyze novel adaptation based on event table."""

    stage_name = "analyzer"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

    async def execute(
        self,
        progress_callback: Optional[Callable] = None,
    ) -> Analysis:
        """Run adaptation analysis on the event table.

        Reads events.json from workspace, NOT the raw novel.
        """
        if not self.validate_upstream():
            raise RuntimeError(f"Upstream validation failed for {self.stage_name}")

        # Read events from workspace (NOT raw novel)
        events_data = workspace_manager.read_json(
            self.project_id, "10_events", "events.json"
        )

        # Build events summary for LLM
        events_summary = self._format_events(events_data)

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"以下是小说的事件表：\n\n{events_summary}"},
        ]

        # Retry logic
        for attempt in range(2):
            try:
                analysis = await llm_client.call_with_model(
                    messages=messages,
                    output_model=Analysis,
                    project_id=self.project_id,
                    stage=self.stage_name,
                    temperature=0.5,
                )
                break
            except Exception as e:
                if attempt == 1:
                    raise RuntimeError(f"Analyzer failed after retry: {e}")
                # Retry with modified prompt
                messages.append({"role": "user", "content": "请重新分析，确保输出完整JSON。"})

        # Save to workspace
        workspace_manager.write_json(
            self.project_id, "20_analysis", "analysis.json",
            analysis.model_dump(),
        )

        if progress_callback:
            progress_callback(self.stage_name, 1, 1, "done")

        return analysis

    def _format_events(self, events_data: dict) -> str:
        """Format events data into a readable summary for LLM."""
        lines = []
        for ch in events_data.get("chapters", []):
            lines.append(f"=== 第{ch['chapter']}章: {ch.get('title', '')} ===")
            ev = ch.get("events", {})
            if ev.get("characters"):
                lines.append(f"人物: {', '.join(ev['characters'])}")
            if ev.get("events"):
                lines.append(f"事件: {'; '.join(ev['events'])}")
            if ev.get("locations"):
                lines.append(f"地点: {', '.join(ev['locations'])}")
            if ev.get("conflicts"):
                lines.append(f"冲突: {'; '.join(ev['conflicts'])}")
            if ev.get("emotional_turns"):
                lines.append(f"情感转折: {'; '.join(ev['emotional_turns'])}")
            lines.append("")
        return "\n".join(lines)
