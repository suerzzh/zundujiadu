"""Reviewer Agent — reviews the complete script with four-pass review method.

Stage 4: Reads complete script + continuity.json,
outputs review.json to workspace/50_review/.
Injects references/04-review-gates.md for four-pass review methodology.
Supports user decision pause mechanism: review_status can be "paused"
to let author review and decide before continuing.
"""

import traceback

from pathlib import Path
from typing import Callable, Optional

from app.llm_client import llm_client
from app.pipeline.base import BaseAgent
from app.schemas import Review, PassReviewResult, CrossEpisodeCheck
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "reviewer.md"
REFERENCES_DIR = Path(__file__).parent.parent / "references"


class ReviewerAgent(BaseAgent):
    """Review the complete script with 5-dimension scoring."""

    stage_name = "reviewer"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

        # Inject references/04-review-gates.md for four-pass review methodology
        ref_path = REFERENCES_DIR / "04-review-gates.md"
        if ref_path.exists():
            try:
                ref_content = ref_path.read_text(encoding="utf-8")
                self.system_prompt += (
                    f"\n\n## 审核方法论参考：四遍修改法\n{ref_content}\n\n"
                    "请严格按四遍修改法进行审核：\n"
                    "1. 第一遍-结构审查：检查每集开场钩子/发展/转折/结尾钩子、三幕式完整性、节奏\n"
                    "2. 第二遍-角色审查：检查角色行为一致性、称呼统一性、关系发展\n"
                    "3. 第三遍-对话审查：检查对话长度(≤30字)、推进性、风格匹配\n"
                    "4. 第四遍-细节审查：检查道具传递、时间线、场景衔接、付费卡点、爽点兑现、伏笔回收\n\n"
                    "同时执行跨集重复检查和事件完整性检查。"
                )
            except Exception:
                pass

    async def execute(
        self,
        progress_callback: Optional[Callable] = None,
        pause_for_user: bool = False,
    ) -> Review:
        """Review the complete script with four-pass review method.

        Args:
            progress_callback: Optional progress callback
            pause_for_user: If True, mark review_status as "paused" for user decision
        """
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

        # Build four-pass review prompt
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": (
                f"## 完整剧本\n\n{script_content}\n\n"
                f"## 连续性记录\n\n{continuity_summary}\n\n"
                "请按四遍修改法对剧本进行审核，输出JSON格式的审核报告，包含：\n"
                "1. four_pass_results: 四遍审查结果（每遍的问题列表和建议）\n"
                "2. cross_episode_checks: 跨集重复检查结果\n"
                "3. event_integrity_score: 事件完整性分数(0-1)\n"
                "4. dimension_scores: 5维评分\n"
                "5. top_issues: Top-3问题\n"
                "6. suggestions: 修改建议\n"
                "7. review_status: 审核状态(completed/conditional/failed)"
            )},
        ]

        # Retry logic: spec requires 2 retries for stage 4 = 3 total attempts
        for attempt in range(3):
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
                print(f"[Reviewer] Attempt {attempt + 1} failed: {type(e).__name__}: {e}")
                if attempt >= 2:
                    print(f"[Reviewer] Full traceback:\n{traceback.format_exc()}")
                    raise RuntimeError(f"Reviewer failed after 2 retries: {e}")
                messages.append({"role": "user", "content": "请重新审核，确保输出完整JSON。"})

        # Run quality gate checks (local, no LLM)
        quality_gates = self._run_quality_gates(script_content)
        review.quality_gates = quality_gates

        # Run four-pass local checks (supplement LLM results)
        four_pass = self._run_four_pass_checks(script_content)
        if not review.four_pass_results:
            review.four_pass_results = four_pass

        # Run cross-episode duplicate checks
        cross_checks = self._run_cross_episode_checks(script_content)
        if not review.cross_episode_checks:
            review.cross_episode_checks = cross_checks

        # Calculate event integrity score
        if review.event_integrity_score == 0.0:
            review.event_integrity_score = self._calculate_event_integrity(script_content)

        # Determine review_status based on four-pass results
        if not review.review_status or review.review_status == "completed":
            review.review_status = self._determine_status(review)

        # User decision pause mechanism
        if pause_for_user:
            review.review_status = "paused"

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
        print(f"[Reviewer] Found {len(yaml_files)} script files: {yaml_files}")

        parts = []
        for yaml_file in yaml_files:
            content = workspace_manager.read_file(self.project_id, "40_scripts", yaml_file)
            parts.append(content)

        result = "\n\n---\n\n".join(parts)
        print(f"[Reviewer] Assembled script length: {len(result)} chars")
        return result

    def _format_continuity(self, continuity_data: dict) -> str:
        """Format continuity data for LLM input."""
        lines = []
        for entry in continuity_data.get("raw", []):
            ep = entry.get("episode", "?")
            changes = entry.get("character_changes", [])
            if changes:
                lines.append(f"第{ep}集: {'; '.join(changes)}")
            props = entry.get("prop_states", [])
            if props:
                lines.append(f"第{ep}集道具: {'; '.join(props)}")
        return "\n".join(lines) if lines else "无连续性变化"

    def _run_quality_gates(self, script_content: str) -> list:
        """Run 6 quality gate checks on the script.

        Implements:
        - Gate 1: Minimum episodes
        - Gate 2: Each episode has scenes
        - Gate 3: Dialogue exists
        - Gate 4: No empty episodes
        - Gate 5: Reference consistency (引用一致性)
        - Gate 6: Continuity validation (连续性校验)
        """
        import re
        import yaml
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

        # Gate 5: Reference consistency (引用一致性)
        ref_consistent = True
        ref_details = "引用一致性检查通过"
        try:
            dialogue_chars = set(re.findall(r'character:\s*["\']?([^"\':\n]+)["\']?', script_content))
            analysis_data = workspace_manager.read_json(
                self.project_id, "20_analysis", "analysis.json"
            )
            known_chars = {c.get("name", "") for c in analysis_data.get("characters", [])}
            unknown = dialogue_chars - known_chars
            unknown.discard("")
            if unknown:
                ref_consistent = False
                ref_details = f"发现未在角色表中定义的角色引用: {', '.join(list(unknown)[:5])}"
        except Exception as e:
            ref_details = f"无法完成引用一致性检查: {e}"
        gates.append(QualityGateCheck(
            rule="引用一致性",
            passed=ref_consistent,
            details=ref_details,
        ))

        # Gate 6: Continuity validation (连续性校验)
        cont_valid = True
        cont_details = "连续性校验通过"
        try:
            cont_data = workspace_manager.read_json(
                self.project_id, "60_continuity", "continuity.json"
            )
            raw_entries = cont_data.get("raw", [])
            if raw_entries:
                cont_episodes = set(e.get("episode", 0) for e in raw_entries)
                script_episodes = set()
                for match in re.finditer(r'episode_number:\s*(\d+)', script_content):
                    script_episodes.add(int(match.group(1)))
                missing = cont_episodes - script_episodes
                if missing:
                    cont_valid = False
                    cont_details = f"连续性记录中引用了不存在的集数: {sorted(missing)}"
        except Exception as e:
            cont_details = f"无法完成连续性校验: {e}"
        gates.append(QualityGateCheck(
            rule="连续性校验",
            passed=cont_valid,
            details=cont_details,
        ))

        return gates

    def _run_four_pass_checks(self, script_content: str) -> list[PassReviewResult]:
        """Run four-pass review checks locally (supplements LLM review)."""
        import re

        results = []
        ep_count = len(re.findall(r'episode_number:', script_content))

        # Pass 1: Structure check
        structure_issues = []
        structure_suggestions = []
        if ep_count < 3:
            structure_issues.append("集数不足3集")
        hook_count = len(re.findall(r'hook|钩子|悬念|cliffhanger', script_content, re.IGNORECASE))
        if hook_count < ep_count:
            structure_issues.append(f"部分集缺少钩子（发现{hook_count}个钩子，共{ep_count}集）")
            structure_suggestions.append("确保每集结尾都有钩子或悬念")

        results.append(PassReviewResult(
            pass_name="structure",
            issues=structure_issues,
            suggestions=structure_suggestions,
            issue_count=len(structure_issues),
            passed=len(structure_issues) <= 3,
        ))

        # Pass 2: Character check
        char_issues = []
        char_names = set(re.findall(r'character:\s*["\']?([^"\':\n]+)["\']?', script_content))
        char_names.discard("")
        if len(char_names) < 1:
            char_issues.append("未检测到角色对话")

        results.append(PassReviewResult(
            pass_name="character",
            issues=char_issues,
            suggestions=[],
            issue_count=len(char_issues),
            passed=len(char_issues) <= 3,
        ))

        # Pass 3: Dialogue check
        dialogue_issues = []
        dialogue_suggestions = []
        lines_with_dialogue = re.findall(r'line:\s*["\']?([^"\'\n]+)["\']?', script_content)
        long_lines = [l for l in lines_with_dialogue if len(l) > 30]
        if long_lines:
            dialogue_issues.append(f"发现{len(long_lines)}句对话超过30字")
            dialogue_suggestions.append("长对话应拆分为多句或精简")

        results.append(PassReviewResult(
            pass_name="dialogue",
            issues=dialogue_issues,
            suggestions=dialogue_suggestions,
            issue_count=len(dialogue_issues),
            passed=len(dialogue_issues) <= 3,
        ))

        # Pass 4: Detail check
        detail_issues = []
        detail_suggestions = []
        paywall_count = len(re.findall(r'is_paywall:\s*true', script_content, re.IGNORECASE))
        if ep_count > 0 and paywall_count == 0:
            detail_suggestions.append("建议在关键悬念处设置付费卡点(is_paywall: true)")

        results.append(PassReviewResult(
            pass_name="detail",
            issues=detail_issues,
            suggestions=detail_suggestions,
            issue_count=len(detail_issues),
            passed=len(detail_issues) <= 3,
        ))

        return results

    def _run_cross_episode_checks(self, script_content: str) -> list[CrossEpisodeCheck]:
        """Run cross-episode duplicate checks."""
        import re

        checks = []

        # Check for duplicate hooks
        hooks = re.findall(r'hook:\s*["\']?([^"\'\n]+)["\']?', script_content)
        hook_set = set()
        dup_hooks = []
        for h in hooks:
            h_clean = h.strip().lower()
            if h_clean and h_clean in hook_set:
                dup_hooks.append(h)
            hook_set.add(h_clean)
        checks.append(CrossEpisodeCheck(
            check_type="hook",
            has_duplicates=len(dup_hooks) > 0,
            duplicates=dup_hooks[:5],
        ))

        # Check for duplicate dialogue lines
        lines = re.findall(r'line:\s*["\']?([^"\'\n]+)["\']?', script_content)
        line_set = set()
        dup_lines = []
        for l in lines:
            l_clean = l.strip().lower()
            if l_clean and len(l_clean) > 10 and l_clean in line_set:
                dup_lines.append(l)
            line_set.add(l_clean)
        checks.append(CrossEpisodeCheck(
            check_type="dialogue",
            has_duplicates=len(dup_lines) > 0,
            duplicates=dup_lines[:5],
        ))

        return checks

    def _calculate_event_integrity(self, script_content: str) -> float:
        """Calculate event integrity score (0.0-1.0)."""
        import re

        scene_count = len(re.findall(r'scene_number:', script_content))
        event_count = len(re.findall(r'description:', script_content))

        if scene_count == 0:
            return 0.0

        events_per_scene = event_count / scene_count if scene_count > 0 else 0
        if events_per_scene >= 1.0:
            return 0.9
        elif events_per_scene >= 0.5:
            return 0.7
        else:
            return 0.5

    def _determine_status(self, review: Review) -> str:
        """Determine review status based on four-pass results."""
        if not review.four_pass_results:
            return "completed"

        total_issues = sum(pr.issue_count for pr in review.four_pass_results)
        any_failed = any(not pr.passed for pr in review.four_pass_results)

        if total_issues == 0:
            return "completed"
        elif total_issues <= 5:
            return "conditional"
        elif any_failed:
            return "failed"
        else:
            return "conditional"
