"""Planner Agent — episode planning based on analysis and events.

Stage 2: Reads analysis.json + events.json, outputs plan.json to workspace/30_plan/.
"""

from pathlib import Path
from typing import Callable, Optional

from app.llm_client import llm_client
from app.pipeline.base import BaseAgent
from app.schemas import EpisodePlan
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "planner.md"


class PlannerAgent(BaseAgent):
    """Plan episode structure based on analysis and events."""

    stage_name = "planner"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

    async def execute(
        self,
        progress_callback: Optional[Callable] = None,
    ) -> EpisodePlan:
        """Generate episode plan from analysis and events."""
        if not self.validate_upstream():
            raise RuntimeError(f"Upstream validation failed for {self.stage_name}")

        # Read inputs from workspace
        analysis_data = workspace_manager.read_json(
            self.project_id, "20_analysis", "analysis.json"
        )
        events_data = workspace_manager.read_json(
            self.project_id, "10_events", "events.json"
        )

        # Format inputs for LLM
        analysis_summary = self._format_analysis(analysis_data)
        events_summary = self._format_events(events_data)

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": (
                f"## 改编分析\n\n{analysis_summary}\n\n"
                f"## 事件表\n\n{events_summary}"
            )},
        ]

        # Retry logic
        for attempt in range(2):
            try:
                plan = await llm_client.call_with_model(
                    messages=messages,
                    output_model=EpisodePlan,
                    project_id=self.project_id,
                    stage=self.stage_name,
                    temperature=0.6,
                )
                break
            except Exception as e:
                if attempt == 1:
                    raise RuntimeError(f"Planner failed after retry: {e}")
                messages.append({"role": "user", "content": "请重新规划，确保输出完整JSON。"})

        # Validate plan
        self._validate_plan(plan)

        # Save to workspace
        workspace_manager.write_json(
            self.project_id, "30_plan", "plan.json",
            plan.model_dump(),
        )

        if progress_callback:
            progress_callback(self.stage_name, 1, 1, "done")

        return plan

    def _format_analysis(self, analysis_data: dict) -> str:
        """Format analysis data for LLM input."""
        lines = []
        lines.append(f"题材: {analysis_data.get('genre', '')}")
        lines.append(f"频向: {analysis_data.get('orientation', '')}")
        lines.append(f"子题材: {', '.join(analysis_data.get('sub_genres', []))}")

        cp = analysis_data.get("conflict_pool", {})
        if cp.get("core_conflicts"):
            lines.append(f"核心冲突: {'; '.join(cp['core_conflicts'])}")
        if cp.get("sub_conflicts"):
            lines.append(f"次要冲突: {'; '.join(cp['sub_conflicts'])}")

        sp = analysis_data.get("satisfaction_pool", {})
        if sp.get("points"):
            lines.append(f"爽点: {'; '.join(sp['points'])}")

        chars = analysis_data.get("characters", [])
        if chars:
            lines.append("\n角色档案:")
            for c in chars:
                lines.append(f"  - {c.get('name', '')} ({c.get('role', '')}): {c.get('arc', '')}")

        lines.append(f"\n改编策略: {analysis_data.get('adaptation_strategy', '')}")
        return "\n".join(lines)

    def _format_events(self, events_data: dict) -> str:
        """Format events data for LLM input."""
        lines = []
        for ch in events_data.get("chapters", []):
            lines.append(f"第{ch['chapter']}章: {', '.join(ch.get('events', {}).get('events', []))}")
        return "\n".join(lines)

    def _validate_plan(self, plan: EpisodePlan) -> None:
        """Validate plan meets basic requirements."""
        if not plan.episodes:
            raise ValueError("Plan has no episodes")
        # Check episode numbers are sequential
        for i, ep in enumerate(plan.episodes):
            if ep.episode != i + 1:
                ep.episode = i + 1  # Auto-fix
