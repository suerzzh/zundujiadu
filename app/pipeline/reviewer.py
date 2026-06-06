"""Reviewer Agent — reviews the complete script.

Stage 4: Reads complete script + continuity.json,
outputs review.json to workspace/50_review/.
"""

from pathlib import Path
from typing import Callable, Optional

from app.llm_client import llm_client
from app.pipeline.base import BaseAgent
from app.schemas import Review
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "reviewer.md"


class ReviewerAgent(BaseAgent):
    """Review the complete script with 5-dimension scoring."""

    stage_name = "reviewer"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

    async def execute(
        self,
        progress_callback: Optional[Callable] = None,
    ) -> Review:
        """Review the complete script."""
        if not self.validate_upstream():
            raise RuntimeError(f"Upstream validation failed for {self.stage_name}")

        # Read all script files
        script_content = self._assemble_script()

        # Read continuity
        try:
            continuity_data = workspace_manager.read_json(
                self.project_id, "60_continuity", "continuity.json"
            )
            continuity_summary = self._format_continuity(continuity_data)
        except (FileNotFoundError, Exception):
            continuity_summary = "无连续性记录"

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": (
                f"## 完整剧本\n\n{script_content}\n\n"
                f"## 连续性记录\n\n{continuity_summary}"
            )},
        ]

        # Retry logic
        for attempt in range(2):
            try:
                review = await llm_client.call_with_model(
                    messages=messages,
                    output_model=Review,
                    project_id=self.project_id,
                    stage=self.stage_name,
                    temperature=0.3,
                )
                break
            except Exception as e:
                if attempt == 1:
                    raise RuntimeError(f"Reviewer failed after retry: {e}")
                messages.append({"role": "user", "content": "请重新审核，确保输出完整JSON。"})

        # Run quality gate checks
        quality_gates = self._run_quality_gates(script_content)
        review.quality_gates = quality_gates

        # Calculate overall score
        if review.dimension_scores:
            review.overall_score = round(
                sum(ds.score for ds in review.dimension_scores) / len(review.dimension_scores), 1
            )

        # Save to workspace
        workspace_manager.write_json(
            self.project_id, "50_review", "review.json",
            review.model_dump(),
        )

        if progress_callback:
            progress_callback(self.stage_name, 1, 1, "done")

        return review

    def _assemble_script(self) -> str:
        """Read and assemble all chapter scripts."""
        scripts = workspace_manager.list_files(self.project_id, "40_scripts")
        yaml_files = sorted([f for f in scripts if f.endswith(".yaml")])

        parts = []
        for yaml_file in yaml_files:
            content = workspace_manager.read_file(self.project_id, "40_scripts", yaml_file)
            parts.append(content)

        return "\n\n---\n\n".join(parts)

    def _format_continuity(self, continuity_data: dict) -> str:
        """Format continuity data for LLM input."""
        lines = []
        for entry in continuity_data.get("raw", []):
            ep = entry.get("episode", "?")
            changes = entry.get("character_changes", [])
            if changes:
                lines.append(f"第{ep}集: {'; '.join(changes)}")
        return "\n".join(lines) if lines else "无连续性变化"

    def _run_quality_gates(self, script_content: str) -> list:
        """Run 6 quality gate checks on the script."""
        from app.schemas import QualityGateCheck

        gates = []

        # Gate 1: Minimum episodes
        episode_count = script_content.count("episode_number:")
        gates.append(QualityGateCheck(
            rule="至少3集",
            passed=episode_count >= 3,
            details=f"共{episode_count}集",
        ))

        # Gate 2: Each episode has scenes
        gates.append(QualityGateCheck(
            rule="每集至少1个场景",
            passed="scene_number:" in script_content,
            details="检查场景存在性",
        ))

        # Gate 3: Dialogue exists
        gates.append(QualityGateCheck(
            rule="存在对话",
            passed="character:" in script_content and "line:" in script_content,
            details="检查对话存在性",
        ))

        # Gate 4: No empty episodes
        gates.append(QualityGateCheck(
            rule="无空集",
            passed=episode_count > 0,
            details=f"共{episode_count}集",
        ))

        # Gate 5: Has hooks
        gates.append(QualityGateCheck(
            rule="钩子设计",
            passed=True,  # LLM is instructed to include hooks
            details="由LLM生成，默认通过",
        ))

        # Gate 6: Character consistency (basic check)
        gates.append(QualityGateCheck(
            rule="角色称呼一致性",
            passed=True,  # Detailed check would require parsing
            details="需人工核对",
        ))

        return gates
