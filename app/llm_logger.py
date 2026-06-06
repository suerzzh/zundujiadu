"""LLM Call Logger — mandatory logging for all LLM calls.

Logs to workspace/{project_id}/logs/llm.jsonl with fields:
    ts, stage, chapter, latency_ms, token_in, token_out, cost_cny, status, error
"""

import json
import time
from datetime import datetime, timezone
from typing import Optional

from app.workspace import workspace_manager


class LLMLogger:
    """Logger for LLM API calls."""

    def log_call(
        self,
        project_id: str,
        stage: str,
        latency_ms: int,
        token_in: int,
        token_out: int,
        cost_cny: float,
        status: str,
        chapter: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        """Log a single LLM call to the project's JSONL file."""
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "stage": stage,
            "chapter": chapter,
            "latency_ms": latency_ms,
            "token_in": token_in,
            "token_out": token_out,
            "cost_cny": round(cost_cny, 4),
            "status": status,
            "error": error,
        }
        try:
            workspace_manager.append_jsonl(project_id, "llm.jsonl", entry)
        except Exception:
            # Logging must never crash the pipeline
            pass

    def get_total_cost(self, project_id: str) -> float:
        """Calculate total cost from all logged LLM calls for a project."""
        total = 0.0
        try:
            log_path = workspace_manager.get_project_dir(project_id) / "logs" / "llm.jsonl"
            if not log_path.exists():
                return 0.0
            with open(log_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        if entry.get("status") != "error":
                            total += entry.get("cost_cny", 0)
                    except (json.JSONDecodeError, Exception):
                        continue
        except Exception:
            pass
        return round(total, 4)


# Singleton
llm_logger = LLMLogger()


class LLMTimer:
    """Context manager to measure LLM call latency."""

    def __init__(self):
        self.start_time: float = 0
        self.latency_ms: int = 0

    def __enter__(self):
        self.start_time = time.monotonic()
        return self

    def __exit__(self, *args):
        self.latency_ms = int((time.monotonic() - self.start_time) * 1000)
