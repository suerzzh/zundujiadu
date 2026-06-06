"""Writer Agent — writes script episodes chapter by chapter.

Stage 3: Reads analysis.json + plan.json + current chapter text,
outputs chapter_XX.yaml + chapter_XX.summary.json to workspace/40_scripts/.
Context control: only injects previous chapter's 100-char summary + global character table + current chapter.
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
from app.schemas import Script, Episode, ChapterSummary, ContinuityRecord
from app.workspace import workspace_manager

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "writer.md"


class WriterAgent(BaseAgent):
    """Write script episodes chapter by chapter with context control."""

    stage_name = "writer"

    def __init__(self, project_id: str):
        super().__init__(project_id)
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            self.system_prompt = f.read().strip()

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
        semaphore = asyncio.Semaphore(2)

        for ep_idx, episode_plan in enumerate(target_episodes):
            ep_num = episode_plan["episode"]

            # Get corresponding chapter
            chapter = chapters[ep_num - 1] if ep_num <= len(chapters) else chapters[-1]

            # Build context with control
            context = self._build_context(
                episode_plan=episode_plan,
                analysis_data=analysis_data,
                chapter=chapter,
                character_table=character_table,
                ep_num=ep_num,
            )

            async with semaphore:
                # Write episode
                episode_yaml = await self._write_episode(context, ep_num)

                if episode_yaml:
                    # Save chapter script
                    workspace_manager.write_file(
                        self.project_id, "40_scripts",
                        f"chapter_{ep_num:02d}.yaml",
                        episode_yaml,
                    )

                    # Generate and save chapter summary
                    summary = self._generate_summary(episode_yaml, ep_num)
                    workspace_manager.write_json(
                        self.project_id, "40_scripts",
                        f"chapter_{ep_num:02d}.summary.json",
                        summary.model_dump(),
                    )

                    # Update continuity (async)
                    await self._update_continuity(episode_yaml, ep_num)

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
            lines.append(f"- {char['name']} ({char.get('role', '')}): {traits} | 称呼: {titles}")
        return "\n".join(lines)

    def _build_context(
        self,
        episode_plan: dict,
        analysis_data: dict,
        chapter: dict,
        character_table: str,
        ep_num: int,
    ) -> dict:
        """Build context for Writer with control strategy.

        Only injects:
        - Previous chapter's 100-char summary
        - Global character table
        - Current chapter original text
        - Continuity summary layer
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

        # Get continuity summary layer
        continuity_summary = ""
        try:
            cont_data = workspace_manager.read_json(
                self.project_id, "60_continuity", "continuity.json"
            )
            summaries = cont_data.get("summaries", [])
            if summaries:
                # Get the latest summary
                latest = summaries[-1]
                continuity_summary = json.dumps(latest, ensure_ascii=False, indent=2)
        except (FileNotFoundError, Exception):
            continuity_summary = ""

        return {
            "episode_plan": episode_plan,
            "genre": analysis_data.get("genre", ""),
            "orientation": analysis_data.get("orientation", ""),
            "character_table": character_table,
            "prev_summary": prev_summary,
            "continuity_summary": continuity_summary,
            "chapter_title": chapter.get("title", ""),
            "chapter_content": chapter.get("content", ""),
        }

    async def _write_episode(self, context: dict, ep_num: int) -> Optional[str]:
        """Call LLM to write a single episode."""
        # Build user message
        user_parts = [
            f"## 当前集规划\n{json.dumps(context['episode_plan'], ensure_ascii=False, indent=2)}",
            f"\n## 题材: {context['genre']} | 频向: {context['orientation']}",
            f"\n## 全局角色表\n{context['character_table']}",
        ]

        if context["prev_summary"]:
            user_parts.append(f"\n## 上一集梗概\n{context['prev_summary']}")

        if context["continuity_summary"]:
            user_parts.append(f"\n## 连续性摘要\n{context['continuity_summary']}")

        user_parts.append(
            f"\n## 当前章节原文\n标题: {context['chapter_title']}\n{context['chapter_content']}"
        )

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": "\n".join(user_parts)},
        ]

        # Retry with exponential backoff
        for attempt in range(3):
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
                wait_time = 2 ** attempt
                await asyncio.sleep(wait_time)
            except Exception as e:
                if attempt == 2:
                    return None
                await asyncio.sleep(1)

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

    def _generate_summary(self, episode_yaml: str, ep_num: int) -> ChapterSummary:
        """Generate a 100-char summary of the episode."""
        # Simple extraction: take first few lines of dialogue/description
        lines = episode_yaml.split("\n")
        summary_parts = []
        char_count = 0

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("-") and ":" in stripped:
                text = stripped.split(":", 1)[1].strip().strip('"')
                if text and char_count + len(text) < 100:
                    summary_parts.append(text)
                    char_count += len(text)
            if char_count >= 100:
                break

        summary_text = "；".join(summary_parts)[:100]
        return ChapterSummary(chapter=ep_num, summary=summary_text)

    async def _update_continuity(self, episode_yaml: str, ep_num: int) -> None:
        """Update continuity record after writing an episode."""
        try:
            # Read existing continuity or create new
            try:
                cont_data = workspace_manager.read_json(
                    self.project_id, "60_continuity", "continuity.json"
                )
            except (FileNotFoundError, Exception):
                cont_data = {"raw": [], "summaries": []}

            # Extract basic continuity info from YAML
            entry = {
                "episode": ep_num,
                "scene": 0,
                "character_changes": [],
                "prop_states": [],
                "foreshadowing": [],
                "title_changes": [],
            }

            # Simple extraction from YAML content
            try:
                parsed = yaml.safe_load(episode_yaml)
                if isinstance(parsed, dict):
                    scenes = parsed.get("scenes", [])
                    for scene in scenes:
                        for beat in scene.get("beats", []):
                            for dialogue in beat.get("dialogues", []):
                                char_name = dialogue.get("character", "")
                                if char_name and char_name not in entry["character_changes"]:
                                    entry["character_changes"].append(f"{char_name}出场")
            except Exception:
                pass

            cont_data["raw"].append(entry)

            # Save updated continuity
            workspace_manager.write_json(
                self.project_id, "60_continuity", "continuity.json", cont_data
            )
        except Exception:
            # Continuity update failure should not crash the pipeline
            pass
