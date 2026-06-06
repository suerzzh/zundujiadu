"""Assembler — assembles final outputs from pipeline stages.

Assembles:
- script.yaml (complete script from all chapter YAML files)
- Continuity summary generation
- Final output to workspace/90_output/
"""

import json
from typing import Optional

import yaml

from app.schemas import Script, MetaInfo, Episode, Scene, Beat, Dialogue, ContinuityRecord, ContinuitySummary
from app.workspace import workspace_manager


class Assembler:
    """Assemble final outputs from pipeline stages."""

    def __init__(self, project_id: str):
        self.project_id = project_id

    def execute(self, novel_title: str = "") -> Script:
        """Assemble the complete script from chapter YAML files.

        Returns the assembled Script object and writes it to workspace/90_output/.
        """
        # Read all chapter YAML files
        scripts = workspace_manager.list_files(self.project_id, "40_scripts")
        yaml_files = sorted([f for f in scripts if f.endswith(".yaml")])

        episodes = []
        for yaml_file in yaml_files:
            content = workspace_manager.read_file(self.project_id, "40_scripts", yaml_file)
            try:
                episode = self._parse_episode_yaml(content)
                if episode:
                    episodes.append(episode)
            except Exception:
                continue

        # Read analysis for metadata
        try:
            analysis_data = workspace_manager.read_json(
                self.project_id, "20_analysis", "analysis.json"
            )
            genre = analysis_data.get("genre", "")
        except Exception:
            genre = ""

        # Build complete script
        script = Script(
            meta=MetaInfo(
                title=novel_title or "未命名剧本",
                genre=genre,
                source_novel=novel_title,
                total_episodes=len(episodes),
                version="1.1",
            ),
            episodes=episodes,
        )

        # Write final script.yaml
        script_yaml = yaml.dump(
            script.model_dump(),
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )
        workspace_manager.write_file(
            self.project_id, "90_output", "script.yaml", script_yaml
        )

        # Generate continuity summary compression
        self._compress_continuity()

        return script

    def _parse_episode_yaml(self, yaml_content: str) -> Optional[Episode]:
        """Parse a single episode YAML file into an Episode model."""
        try:
            data = yaml.safe_load(yaml_content)
            if not isinstance(data, dict):
                return None

            # Parse scenes
            scenes = []
            for scene_data in data.get("scenes", []):
                beats = []
                for beat_data in scene_data.get("beats", []):
                    dialogues = []
                    for dlg_data in beat_data.get("dialogues", []):
                        dialogues.append(Dialogue(
                            character=dlg_data.get("character", ""),
                            line=dlg_data.get("line", ""),
                            direction=dlg_data.get("direction", ""),
                        ))
                    beats.append(Beat(
                        beat_phase=beat_data.get("beat_phase"),
                        description=beat_data.get("description", ""),
                        dialogues=dialogues,
                        emotion_marker=beat_data.get("emotion_marker"),
                        conflict_type=beat_data.get("conflict_type"),
                    ))
                scenes.append(Scene(
                    scene_number=scene_data.get("scene_number", 0),
                    location=scene_data.get("location", ""),
                    time_of_day=scene_data.get("time_of_day", ""),
                    beats=beats,
                    is_paywall=scene_data.get("is_paywall"),
                ))

            return Episode(
                episode_number=data.get("episode_number", 0),
                title=data.get("title", ""),
                logline=data.get("logline", ""),
                scenes=scenes,
            )
        except Exception:
            return None

    def _compress_continuity(self) -> None:
        """Compress continuity raw layer into summary layer.

        Every 5-10 scenes, generate a compressed state summary.
        """
        try:
            cont_data = workspace_manager.read_json(
                self.project_id, "60_continuity", "continuity.json"
            )
        except Exception:
            return

        raw_entries = cont_data.get("raw", [])
        if not raw_entries:
            return

        # Generate summaries for every batch of entries
        summaries = []
        batch_size = 5
        for i in range(0, len(raw_entries), batch_size):
            batch = raw_entries[i:i + batch_size]
            if not batch:
                continue

            # Collect all character changes, prop states, etc. from batch
            all_chars = []
            all_props = []
            all_foreshadowing = []
            all_titles = []

            for entry in batch:
                all_chars.extend(entry.get("character_changes", []))
                all_props.extend(entry.get("prop_states", []))
                all_foreshadowing.extend(entry.get("foreshadowing", []))
                all_titles.extend(entry.get("title_changes", []))

            # Deduplicate
            all_chars = list(dict.fromkeys(all_chars))
            all_props = list(dict.fromkeys(all_props))
            all_foreshadowing = list(dict.fromkeys(all_foreshadowing))
            all_titles = list(dict.fromkeys(all_titles))

            summaries.append(ContinuitySummary(
                from_episode=batch[0].get("episode", 0),
                to_episode=batch[-1].get("episode", 0),
                character_states=all_chars,
                prop_states=all_props,
                active_foreshadowing=all_foreshadowing,
                title_conventions=all_titles,
            ).model_dump())

        cont_data["summaries"] = summaries
        workspace_manager.write_json(
            self.project_id, "60_continuity", "continuity.json", cont_data
        )
