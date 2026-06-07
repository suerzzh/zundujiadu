"""Planner Agent — episode planning based on analysis and events.

Stage 2: Reads analysis.json + events.json, outputs plan.json to workspace/30_plan/.
Injects references/02-episode-architecture.md into system prompt.
"""

from pathlib import Path
from typing import Callable, Optional

from app.llm_client import llm_client
from app.pipeline.base import BaseAgent
from app.schemas import EpisodePlan
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "planner.md"
REFERENCES_DIR = Path(__file__).parent.parent / "references"


class PlannerAgent(BaseAgent):
    """Plan episode structure based on analysis and events."""

    stage_name = "planner"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

        # A11: Inject references/02-episode-architecture.md
        ref_path = REFERENCES_DIR / "02-episode-architecture.md"
        if ref_path.exists():
            try:
                ref_content = ref_path.read_text(encoding="utf-8")
                self.system_prompt += f"\n\n## 分集架构方法论参考\n{ref_content}"
            except Exception:
                pass

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

        # Retry logic: spec requires 2 retries for stage 1/2 = 3 total attempts
        for attempt in range(3):
            try:
                if self._stream_callback:
                    # Streaming mode: collect full text then parse
                    full_content = ""
                    async for chunk in llm_client.stream_call(
                        messages=messages,
                        project_id=self.project_id,
                        stage=self.stage_name,
                        temperature=0.6,
                    ):
                        full_content += chunk
                        self._stream_callback(self.stage_name, chunk)
                    plan = llm_client._parse_output(full_content, EpisodePlan)
                else:
                    plan = await llm_client.call_with_model(
                        messages=messages,
                        output_model=EpisodePlan,
                        project_id=self.project_id,
                        stage=self.stage_name,
                        temperature=0.6,
                    )
                # Validate plan after generation
                validation_issues = self._validate_plan(plan, events_data)
                if not validation_issues:
                    break
                # Feed validation feedback back to LLM for retry
                messages.append({
                    "role": "user",
                    "content": (
                        f"上一次生成的计划验证未通过，问题如下：\n"
                        f"{'; '.join(validation_issues)}\n\n"
                        f"请根据以上反馈重新生成计划，确保：\n"
                        f"1. 三幕结构完整（setup/escalation/climax/resolution）\n"
                        f"2. 事件覆盖率≥70%\n"
                        f"3. 集数满足最低要求"
                    )
                })
            except Exception as e:
                if attempt >= 2:
                    raise RuntimeError(f"Planner failed after 2 retries: {e}")
                messages.append({"role": "user", "content": "请重新规划，确保输出完整JSON。"})

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
        if cp.get("potential_conflicts"):
            lines.append(f"潜在冲突: {'; '.join(cp['potential_conflicts'])}")

        sp = analysis_data.get("satisfaction_pool", {})
        if sp.get("points"):
            lines.append(f"爽点: {'; '.join(sp['points'])}")

        chars = analysis_data.get("characters", [])
        if chars:
            lines.append("\n角色档案:")
            for c in chars:
                rels = c.get("relationships", [])
                rel_str = f" | 关系: {', '.join(rels)}" if rels else ""
                lines.append(f"  - {c.get('name', '')} ({c.get('role', '')}): {c.get('arc', '')}{rel_str}")

        lines.append(f"\n改编策略: {analysis_data.get('adaptation_strategy', '')}")
        return "\n".join(lines)

    def _format_events(self, events_data: dict) -> str:
        """Format events data for LLM input."""
        lines = []
        for ch in events_data.get("chapters", []):
            lines.append(f"第{ch['chapter']}章: {', '.join(ch.get('events', {}).get('events', []))}")
        return "\n".join(lines)

    def _validate_plan(self, plan: EpisodePlan, events_data: dict = None) -> list[str]:
        """Validate plan meets hard requirements from design spec.

        Returns:
            List of validation issue strings. Empty list means all checks passed.
            Caller decides whether to retry or raise error.
        """
        if not plan.episodes:
            raise ValueError("Plan has no episodes")

        issues = []

        # Check episode numbers are sequential
        for i, ep in enumerate(plan.episodes):
            if ep.episode != i + 1:
                ep.episode = i + 1  # Auto-fix

        ep_count = len(plan.episodes)

        # Check: each episode has a hook
        episodes_without_hook = []
        for ep in plan.episodes:
            if not ep.hook or len(ep.hook.strip()) < 3:
                episodes_without_hook.append(ep.episode)
        if episodes_without_hook:
            issues.append(f"缺少钩子: 第{episodes_without_hook}集, 已自动添加默认钩子")
            for ep in plan.episodes:
                if not ep.hook or len(ep.hook.strip()) < 3:
                    ep.hook = f"第{ep.episode}集悬念: 接下来的发展将如何？"

        # Check: hooks are not duplicated
        hooks_lower = [ep.hook.strip().lower() for ep in plan.episodes if ep.hook]
        seen = set()
        dup_hooks = []
        for i, h in enumerate(hooks_lower):
            if h and h in seen:
                dup_hooks.append(plan.episodes[i].episode)
            seen.add(h)
        if dup_hooks:
            issues.append(f"钩子重复: 第{dup_hooks}集与前面的集使用了相同的钩子")

        # Check: three-act structure coverage
        act_types = set()
        for ep in plan.episodes:
            if ep.episode_type:
                act_types.add(ep.episode_type.lower())
        required_acts = {"setup", "escalation", "climax", "resolution"}
        missing_acts = required_acts - act_types
        if missing_acts:
            issues.append(f"三幕结构不完整, 缺少: {missing_acts}")

        # Check: emotion curve doesn't decline 3+ episodes in a row
        emotion_streak = 0
        prev_strength = None
        for ep in plan.episodes:
            if ep.emotional_intensity is not None:
                if prev_strength is not None and ep.emotional_intensity < prev_strength:
                    emotion_streak += 1
                else:
                    emotion_streak = 0
                prev_strength = ep.emotional_intensity
                if emotion_streak >= 3:
                    issues.append(f"情绪强度连续下降超过3集(从第{ep.episode - 2}集开始)")
                    emotion_streak = 0

        # Check: satisfaction points are distributed
        satisfaction_eps = [ep for ep in plan.episodes
                            if ep.satisfaction_points and len(ep.satisfaction_points) > 0]
        if satisfaction_eps and len(satisfaction_eps) < ep_count * 0.3:
            issues.append(f"爽点分布不足: 仅{len(satisfaction_eps)}/{ep_count}集有爽点(建议≥30%)")

        # Check: event coverage rate (events from events.json must be covered)
        if events_data:
            all_source_events = []
            for ch in events_data.get("chapters", []):
                ch_events = ch.get("events", {}).get("events", [])
                all_source_events.extend(ch_events)

            if all_source_events:
                planned_events = []
                for ep in plan.episodes:
                    planned_events.extend(ep.events)

                uncovered = []
                for src_event in all_source_events:
                    src_lower = src_event.lower().strip()
                    covered = any(
                        src_lower in pe.lower() or pe.lower() in src_lower
                        for pe in planned_events
                    )
                    if not covered:
                        uncovered.append(src_event)

                coverage_rate = 1.0 - (len(uncovered) / len(all_source_events))
                if coverage_rate < 0.7:
                    issues.append(
                        f"事件覆盖率不足: {coverage_rate:.0%} (建议≥70%), "
                        f"未覆盖事件: {uncovered[:5]}"
                    )

            # Check: source chapters coverage
            all_chapter_nums = {ch.get("chapter", 0) for ch in events_data.get("chapters", [])}
            planned_chapters = set()
            for ep in plan.episodes:
                planned_chapters.update(ep.source_chapters)
            missing_chapters = all_chapter_nums - planned_chapters
            if missing_chapters:
                issues.append(f"原文章节未覆盖: 第{sorted(missing_chapters)}章")

            # Check: source chapters overlap
            chapter_usage = {}
            for ep in plan.episodes:
                for ch in ep.source_chapters:
                    if ch not in chapter_usage:
                        chapter_usage[ch] = []
                    chapter_usage[ch].append(ep.episode)
            overlaps = {ch: eps for ch, eps in chapter_usage.items() if len(eps) > 1}
            if overlaps:
                issues.append(
                    f"章节分配重叠: {overlaps} (同一章节被多集引用，会导致内容重复)"
                )

            # Check: minimum episode count
            min_episodes = max(3, (len(all_chapter_nums) + 1) // 2)
            if ep_count < min_episodes:
                issues.append(
                    f"集数不足: {ep_count}集 (建议至少{min_episodes}集，基于{len(all_chapter_nums)}章内容)"
                )

        if issues:
            issues_text = "; ".join(issues)
            print(f"[Planner] Validation issues ({len(issues)}): {issues_text}")
        return issues
