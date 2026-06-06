"""Workspace Manager — file-based inter-stage communication medium.

Workspace directory structure:
    workspace/{project_id}/
    ├── 00_raw/          ← original input
    ├── 10_events/       ← stage 0 output: per-chapter event summaries
    ├── 20_analysis/     ← stage 1 output: adaptation analysis
    ├── 30_plan/         ← stage 2 output: episode planning
    ├── 40_scripts/      ← stage 3 output: per-chapter script fragments
    ├── 50_review/       ← stage 4 output: review report
    ├── 60_continuity/   ← continuity records (incremental)
    ├── 90_output/       ← final outputs
    └── logs/            ← LLM call logs
"""

import json
import os
import shutil
from pathlib import Path
from typing import Any

from app.config import settings

# Workspace sub-directory names
WORKSPACE_DIRS = [
    "00_raw",
    "10_events",
    "20_analysis",
    "30_plan",
    "40_scripts",
    "50_review",
    "60_continuity",
    "90_output",
    "logs",
]


class WorkspaceManager:
    """Manages workspace directory structure and file I/O with atomic writes."""

    def __init__(self, workspace_root: Path | None = None):
        self.root = workspace_root or settings.WORKSPACE_DIR

    def get_project_dir(self, project_id: str) -> Path:
        return self.root / project_id

    # ── Lifecycle ──────────────────────────────────────────────

    def create_workspace(self, project_id: str) -> Path:
        """Create a new workspace with all sub-directories."""
        project_dir = self.get_project_dir(project_id)
        for subdir in WORKSPACE_DIRS:
            (project_dir / subdir).mkdir(parents=True, exist_ok=True)
        return project_dir

    def workspace_exists(self, project_id: str) -> bool:
        return self.get_project_dir(project_id).exists()

    def delete_workspace(self, project_id: str) -> None:
        """Delete an entire workspace."""
        project_dir = self.get_project_dir(project_id)
        if project_dir.exists():
            shutil.rmtree(project_dir)

    # ── File I/O with atomic writes ────────────────────────────

    def write_file(self, project_id: str, subdir: str, filename: str, content: str) -> Path:
        """Write a file atomically: write to .tmp then os.replace."""
        target_dir = self.get_project_dir(project_id) / subdir
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / filename
        tmp_path = target_path.with_suffix(target_path.suffix + ".tmp")

        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(content)
            os.replace(str(tmp_path), str(target_path))
        except Exception:
            # Clean up tmp file on failure
            if tmp_path.exists():
                tmp_path.unlink()
            raise

        return target_path

    def write_json(self, project_id: str, subdir: str, filename: str, data: Any) -> Path:
        """Write JSON data atomically."""
        content = json.dumps(data, ensure_ascii=False, indent=2)
        return self.write_file(project_id, subdir, filename, content)

    def read_file(self, project_id: str, subdir: str, filename: str) -> str:
        """Read a text file from workspace."""
        file_path = self.get_project_dir(project_id) / subdir / filename
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    def read_json(self, project_id: str, subdir: str, filename: str) -> Any:
        """Read and parse a JSON file from workspace."""
        content = self.read_file(project_id, subdir, filename)
        return json.loads(content)

    def file_exists(self, project_id: str, subdir: str, filename: str) -> bool:
        """Check if a file exists in workspace."""
        file_path = self.get_project_dir(project_id) / subdir / filename
        return file_path.exists()

    def list_files(self, project_id: str, subdir: str) -> list[str]:
        """List files in a workspace sub-directory."""
        dir_path = self.get_project_dir(project_id) / subdir
        if not dir_path.exists():
            return []
        return [f.name for f in dir_path.iterdir() if f.is_file()]

    # ── Stage gate validation ───────────────────────────────────

    def validate_upstream(self, project_id: str, stage: str) -> bool:
        """Validate that upstream workspace files exist and are valid.

        Returns True if the stage can proceed, False otherwise.
        """
        upstream_map = {
            "extractor": [("00_raw", "novel.txt")],
            "analyzer": [("10_events", "events.json")],
            "planner": [
                ("10_events", "events.json"),
                ("20_analysis", "analysis.json"),
            ],
            "writer": [
                ("20_analysis", "analysis.json"),
                ("30_plan", "plan.json"),
            ],
            "reviewer": [
                ("40_scripts", None),  # at least one script file
                ("60_continuity", "continuity.json"),
            ],
        }

        required = upstream_map.get(stage, [])
        for subdir, filename in required:
            if filename is None:
                # Check directory has at least one file
                if not self.list_files(project_id, subdir):
                    return False
            else:
                if not self.file_exists(project_id, subdir, filename):
                    return False
        return True

    # ── Convenience helpers ─────────────────────────────────────

    def get_stage_dir(self, project_id: str, subdir: str) -> Path:
        """Get the full path of a workspace sub-directory."""
        return self.get_project_dir(project_id) / subdir

    def append_jsonl(self, project_id: str, filename: str, data: dict) -> None:
        """Append a JSON line to a JSONL file (for LLM logs)."""
        logs_dir = self.get_project_dir(project_id) / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        log_path = logs_dir / filename
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False) + "\n")


# Singleton instance
workspace_manager = WorkspaceManager()
