"""Writer Agent — writes script episodes chapter by chapter.

Stage 3: Reads analysis.json + plan.json + current chapter text,
outputs chapter_XX.yaml to workspace/40_scripts/.
Context control: only injects previous chapter's 100-char summary + global character table
+ current chapter + continuity summary layer + scene-relevant raw entries.
Uses shared concurrency pool with Extractor.
Uses RetryPolicy for classified retry.
Injects genre-specific rules from references.
"""

import asyncio
import copy
import json
from pathlib import Path
from typing import Callable, Optional

import yaml

from app.concurrency import concurrency_controller
from app.llm_client import llm_client, RateLimitError, LLMOutputError
from app.pipeline.base import BaseAgent
from app.pipeline.retry import RetryPolicy, classify_error, ErrorCategory
from app.schemas import Script, Episode, ChapterSummary, ContinuityRecord
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "writer.md"
REFERENCES_DIR = Path(__file__).parent.parent / "references"


class WriterAgent(BaseAgent):
    """Write script episodes chapter by chapter with context control."""

    stage_name = "writer"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

        # Inject references/03-script-writing-standard.md into system prompt
        ref_path = REFERENCES_DIR / "03-script-writing-standard.md"
        if ref_path.exists():
            try:
                ref_content = ref_path.read_text(encoding="utf-8")
                self.system_prompt += f"\n\n## 剧本写作标准参考\n{ref_content}"
            except Exception:
                pass

        # Inject references/14-story-psychology.md for audience psychology
        psych_path = REFERENCES_DIR / "14-story-psychology.md"
        if psych_path.exists():
            try:
                psych_content = psych_path.read_text(encoding="utf-8")
                self.system_prompt += (
                    f"\n\n## 故事心理学参考：观众预期与爽点设计\n{psych_content}\n\n"
                    "请严格遵循故事心理学原则：\n"
                    "1. 每集开场30秒内建立本集预期\n"
                    "2. 每集至少兑现1个预期，在结尾前1/3处释放\n"
                    "3. 爽点间隔3-5分钟，类型轮换（打脸/升级/情感/反转）\n"
                    "4. 每集至少1个即时悬念+1个短期悬念推进\n"
                    "5. 不能连续3个场景保持同一情绪\n"
                    "6. 付费卡点必须在悬念高峰期，卡点后立即兑现爽点"
                )
            except Exception:
                pass

    async def execute(
        self,
        chapters: list[dict],
        progress_callback: Optional[Callable] = None,
        single_episode: Optional[int] = None,
    ) -> list[dict]:
        """Write script for each chapter.

        Args:
            chapters: List of {"number": int, "title": str, "content": str}
            progress_callback: Optional progress callback
            single_episode: If set, only regenerate this episode
        """
        if not self.validate_upstream():
            raise RuntimeError(f"Upstream validation failed for {self.stage_name}")

        # Read analysis and plan from workspace
        analysis_data = workspace_manager.read_json(
            self.project_id, "20_analysis", "analysis.json"
        )
        plan_data = workspace_manager.read_json(
            self.project_id, "30_plan", "plan.json"
        )

        # Build global character table
        character_table = self._build_character_table(analysis_data)

        # Determine which episodes to write
        if single_episode is not None:
            target_episodes = [ep for ep in plan_data["episodes"] if ep["episode"] == single_episode]
        else:
            target_episodes = plan_data["episodes"]

        results = []

        for ep_idx, episode_plan in enumerate(target_episodes):
            ep_num = episode_plan["episode"]

            # Get corresponding chapter
            chapter = chapters[ep_num - 1] if ep_num <= len(chapters) else chapters[-1]

            # A4: Read-time snapshot of continuity.json BEFORE LLM call
            continuity_snapshot = self._snapshot_continuity()

            # Build context with control (A3: includes scene-relevant raw entries)
            context = self._build_context(
                episode_plan=episode_plan,
                analysis_data=analysis_data,
                chapter=chapter,
                character_table=character_table,
                ep_num=ep_num,
            )

            # A2: Use shared concurrency pool
            async with concurrency_controller._semaphore:
                # Write episode using RetryPolicy (A7)
                episode_yaml = await self._write_episode(context, ep_num)

                if episode_yaml:
                    # Save chapter script
                    workspace_manager.write_file(
                        self.project_id, "40_scripts",
                        f"chapter_{ep_num:02d}.yaml",
                        episode_yaml,
                    )

                    # A4: Update continuity in a separate asyncio task (non-blocking)
                    # Uses the snapshot taken before the LLM call
                    asyncio.create_task(
                        self._update_continuity_async(episode_yaml, ep_num, continuity_snapshot)
                    )

                    results.append({
                        "episode": ep_num,
                        "status": "done",
                        "yaml_path": f"chapter_{ep_num:02d}.yaml",
                    })
                else:
                    results.append({
                        "episode": ep_num,
                        "status": "failed",
                    })

                if progress_callback:
                    progress_callback(self.stage_name, ep_num, len(target_episodes), "done")

        return results

    def _build_character_table(self, analysis_data: dict) -> str:
        """Build global character table for context injection."""
        lines = []
        for char in analysis_data.get("characters", []):
            titles = ", ".join(char.get("titles", []))
            traits = ", ".join(char.get("traits", []))
            rels = ", ".join(char.get("relationships", []))
            rel_str = f" | 关系: {rels}" if rels else ""
            lines.append(f"- {char['name']} ({char.get('role', '')}): {traits} | 称呼: {titles}{rel_str}")
        return "\n".join(lines)

    def _snapshot_continuity(self) -> dict:
        """A4: Take a read-time snapshot of continuity.json before LLM call."""
        try:
            return workspace_manager.read_json(
                self.project_id, "60_continuity", "continuity.json"
            )
        except (FileNotFoundError, Exception):
            return {"raw": [], "summaries": []}

    def _build_context(
        self,
        episode_plan: dict,
        analysis_data: dict,
        chapter: dict,
        character_table: str,
        ep_num: int,
    ) -> dict:
        """Build context for Writer with control strategy.

        Injects:
        - Previous chapter's 100-char summary
        - Global character table
        - Current chapter original text
        - Continuity summary layer
        - A3: Scene-relevant raw entries from continuity raw layer
        - A12: Genre-specific rules
        """
        # Get previous chapter summary
        prev_summary = ""
        if ep_num > 1:
            try:
                summary_data = workspace_manager.read_json(
                    self.project_id, "40_scripts",
                    f"chapter_{ep_num - 1:02d}.summary.json"
                )
                prev_summary = summary_data.get("summary", "")
            except (FileNotFoundError, Exception):
                prev_summary = ""

        # Get continuity summary layer + A3: scene-relevant raw entries
        continuity_summary = ""
        relevant_raw_entries = []
        try:
            cont_data = workspace_manager.read_json(
                self.project_id, "60_continuity", "continuity.json"
            )
            summaries = cont_data.get("summaries", [])
            if summaries:
                latest = summaries[-1]
                continuity_summary = json.dumps(latest, ensure_ascii=False, indent=2)

            # A3: Get scene-relevant raw entries (entries from recent episodes)
            raw_entries = cont_data.get("raw", [])
            recent_episodes = sorted(set(e.get("episode", 0) for e in raw_entries), reverse=True)[:2]
            relevant_raw_entries = [
                e for e in raw_entries if e.get("episode", 0) in recent_episodes
            ]
        except (FileNotFoundError, Exception):
            pass

        # A12: Load genre-specific rules
        genre_rules = self._load_genre_rules(analysis_data.get("genre", ""))

        return {
            "episode_plan": episode_plan,
            "genre": analysis_data.get("genre", ""),
            "orientation": analysis_data.get("orientation", ""),
            "character_table": character_table,
            "prev_summary": prev_summary,
            "continuity_summary": continuity_summary,
            "relevant_raw_entries": json.dumps(relevant_raw_entries, ensure_ascii=False, indent=2) if relevant_raw_entries else "",
            "genre_rules": genre_rules,
            "chapter_title": chapter.get("title", ""),
            "chapter_content": chapter.get("content", ""),
        }

    def _load_genre_rules(self, genre: str) -> str:
        """A12: Load genre-specific rules from references directory."""
        genre_file_map = {
            "末世重生": "12-genre-specific-techniques.md",
            "玄幻": "12-genre-specific-techniques.md",
            "女频": "12-genre-specific-techniques.md",
            "网文": "12-genre-specific-techniques.md",
        }
        filename = genre_file_map.get(genre, "12-genre-specific-techniques.md")
        filepath = REFERENCES_DIR / filename
        if filepath.exists():
            try:
                return filepath.read_text(encoding="utf-8")
            except Exception:
                return ""
        return ""

    async def _write_episode(self, context: dict, ep_num: int) -> Optional[str]:
        """Call LLM to write a single episode using RetryPolicy."""
        # Build user message
        user_parts = [
            f"## 当前集规划\n{json.dumps(context['episode_plan'], ensure_ascii=False, indent=2)}",
            f"\n## 题材: {context['genre']} | 频向: {context['orientation']}",
            f"\n## 全局角色表\n{context['character_table']}",
        ]

        # A12: Inject genre-specific rules
        if context["genre_rules"]:
            user_parts.append(f"\n## 体裁专属规则\n{context['genre_rules']}")

        if context["prev_summary"]:
            user_parts.append(f"\n## 上一集梗概\n{context['prev_summary']}")

        if context["continuity_summary"]:
            user_parts.append(f"\n## 连续性摘要层\n{context['continuity_summary']}")

        # A3: Inject scene-relevant raw entries
        if context["relevant_raw_entries"]:
            user_parts.append(f"\n## 本场相关原始层\n{context['relevant_raw_entries']}")

        user_parts.append(
            f"\n## 当前章节原文\n标题: {context['chapter_title']}\n{context['chapter_content']}"
        )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": "\n".join(user_parts)},
        ]

        # A7: Classified retry via RetryPolicy
        for attempt in range(RetryPolicy.MAX_RETRIES[ErrorCategory.RATE_LIMIT] + 1):
            try:
                content = await llm_client.call(
                    messages=messages,
                    project_id=self.project_id,
                    stage=self.stage_name,
                    chapter=ep_num,
                    temperature=0.7,
                    max_tokens=4096,
                )
                # Clean up YAML output
                content = self._clean_yaml_output(content)
                return content
            except RateLimitError:
                if attempt >= RetryPolicy.MAX_RETRIES[ErrorCategory.RATE_LIMIT]:
                    return None
                delay = RetryPolicy.BASE_DELAYS[ErrorCategory.RATE_LIMIT] * (
                    RetryPolicy.EXP_BASE[ErrorCategory.RATE_LIMIT] ** attempt
                )
                await asyncio.sleep(delay)
            except LLMOutputError:
                category = ErrorCategory.OUTPUT_ERROR
                max_retries = RetryPolicy.MAX_RETRIES[category]
                if attempt >= max_retries:
                    return None
                delay = RetryPolicy.BASE_DELAYS[category] * (
                    RetryPolicy.EXP_BASE[category] ** attempt
                )
                await asyncio.sleep(delay)
            except Exception as e:
                category = classify_error(e)
                max_retries = RetryPolicy.MAX_RETRIES[category]
                if attempt >= max_retries:
                    return None
                base_delay = RetryPolicy.BASE_DELAYS[category]
                exp_base = RetryPolicy.EXP_BASE[category]
                await asyncio.sleep(base_delay * (exp_base ** attempt))

        return None

    def _clean_yaml_output(self, content: str) -> str:
        """Clean up LLM YAML output."""
        # Remove markdown code blocks
        if content.strip().startswith("```yaml"):
            content = content.strip()[7:]
        if content.strip().startswith("```"):
            content = content.strip()[3:]
        if content.strip().endswith("```"):
            content = content.strip()[:-3]
        return content.strip()

    async def _update_continuity_async(
        self, episode_yaml: str, ep_num: int, snapshot: dict
    ) -> None:
        """A4: Update continuity in a separate asyncio task using pre-LLM snapshot.

        Always creates a raw entry for every episode (even if YAML parsing fails)
        to ensure no episodes are missing from the continuity timeline.
        """
        try:
            # Use the snapshot taken before the LLM call
            cont_data = copy.deepcopy(snapshot)

            # Build entry with guaranteed fields
            entry = {
                "episode": ep_num,
                "scene": 0,
                "character_changes": [],
                "prop_states": [],
                "foreshadowing": [],
                "title_changes": [],
            }

            try:
                parsed = yaml.safe_load(episode_yaml)
                if isinstance(parsed, dict):
                    scenes = parsed.get("scenes", [])
                    entry["scene"] = len(scenes)

                    scene_locations = []
                    for idx, scene in enumerate(scenes):
                        loc = scene.get("location", "")
                        if loc:
                            scene_locations.append(loc)

                        for beat in scene.get("beats", []):
                            # Extract characters from dialogues
                            for dialogue in beat.get("dialogues", []):
                                char_name = dialogue.get("character", "")
                                if char_name and char_name not in entry["character_changes"]:
                                    entry["character_changes"].append(f"{char_name}出场")

                            # Extract emotion markers as foreshadowing hints
                            em = beat.get("emotion_marker")
                            if em and em not in entry["foreshadowing"]:
                                entry["foreshadowing"].append(f"情绪: {em}")

                            # Extract conflict types
                            ct = beat.get("conflict_type")
                            if ct and ct not in entry["prop_states"]:
                                entry["prop_states"].append(f"冲突: {ct}")

                    # Add location info to prop_states
                    if scene_locations:
                        entry["prop_states"].append(f"场景: {', '.join(scene_locations)}")

                    # Add title info
                    title = parsed.get("title", "")
                    if title:
                        entry["title_changes"].append(title)

            except Exception:
                # YAML parse failed — still record the episode existed
                entry["character_changes"].append(f"第{ep_num}集已生成（解析详情失败）")

            cont_data["raw"].append(entry)

            # Save updated continuity
            workspace_manager.write_json(
                self.project_id, "60_continuity", "continuity.json", cont_data
            )
        except Exception:
            # Continuity update failure should not crash the pipeline
            pass
