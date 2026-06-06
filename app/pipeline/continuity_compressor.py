"""Continuity Compressor — independent module for continuity summary compression.

Compresses the raw layer (per-scene change details) into summary layer
(compressed state every 5-10 scenes) as specified in design.md.

This module is called by Assembler after assembling the final script.
"""

from app.schemas import ContinuitySummary
from app.workspace import workspace_manager


class ContinuityCompressor:
    """Compress continuity raw layer into summary layer.

    Every 5-10 scenes, generate a compressed state summary containing:
    - Character states
    - Prop states
    - Active foreshadowing
    - Title conventions
    """

    BATCH_SIZE = 5  # Compress every 5 raw entries

    def __init__(self, project_id: str):
        self.project_id = project_id

    def compress(self) -> list[dict]:
        """Compress raw continuity entries into summary batches.

        Returns:
            List of ContinuitySummary dicts
        """
        try:
            cont_data = workspace_manager.read_json(
                self.project_id, "60_continuity", "continuity.json"
            )
        except (FileNotFoundError, Exception):
            return []

        raw_entries = cont_data.get("raw", [])
        if not raw_entries:
            return []

        summaries = []
        for i in range(0, len(raw_entries), self.BATCH_SIZE):
            batch = raw_entries[i:i + self.BATCH_SIZE]
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

            # Deduplicate while preserving order
            all_chars = list(dict.fromkeys(all_chars))
            all_props = list(dict.fromkeys(all_props))
            all_foreshadowing = list(dict.fromkeys(all_foreshadowing))
            all_titles = list(dict.fromkeys(all_titles))

            summary = ContinuitySummary(
                from_episode=batch[0].get("episode", 0),
                to_episode=batch[-1].get("episode", 0),
                character_states=all_chars,
                prop_states=all_props,
                active_foreshadowing=all_foreshadowing,
                title_conventions=all_titles,
            )
            summaries.append(summary.model_dump())

        # Update continuity.json with new summaries
        cont_data["summaries"] = summaries
        workspace_manager.write_json(
            self.project_id, "60_continuity", "continuity.json", cont_data
        )

        return summaries

    def generate_chapter_summary(self, episode_yaml: str, ep_num: int) -> dict:
        """Generate a 100-char summary for a chapter episode.

        Called by Assembler to create chapter_XX.summary.json files.
        """
        import yaml

        summary_parts = []
        char_count = 0

        try:
            parsed = yaml.safe_load(episode_yaml)
            if isinstance(parsed, dict):
                # Extract logline if available
                logline = parsed.get("logline", "")
                if logline and len(logline) <= 100:
                    return {"chapter": ep_num, "summary": logline}

                # Extract from scenes
                for scene in parsed.get("scenes", []):
                    for beat in scene.get("beats", []):
                        desc = beat.get("description", "")
                        if desc and char_count + len(desc) < 100:
                            summary_parts.append(desc[:50])
                            char_count += len(desc[:50])
                    if char_count >= 100:
                        break
        except Exception:
            # Fallback: simple text extraction
            lines = episode_yaml.split("\n")
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
        return {"chapter": ep_num, "summary": summary_text}
