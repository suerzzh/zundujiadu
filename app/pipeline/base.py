"""Base Agent class for all pipeline stages."""

from abc import ABC, abstractmethod
from typing import Any, Callable, Optional

from app.workspace import workspace_manager


class BaseAgent(ABC):
    """Base class for all pipeline agents."""

    stage_name: str = ""

    def __init__(self, project_id: str):
        self.project_id = project_id
        # Optional callback for streaming LLM chunks: fn(stage, chunk_text)
        self._stream_callback: Optional[Callable[[str, str], None]] = None

    def set_stream_callback(self, callback: Callable[[str, str], None]):
        """Set a callback to receive streaming LLM output chunks.

        Args:
            callback: fn(stage_name, chunk_text) — called for each token delta.
        """
        self._stream_callback = callback

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """Execute the agent's main task."""
        pass

    def validate_upstream(self) -> bool:
        """Check if upstream dependencies are met."""
        return workspace_manager.validate_upstream(self.project_id, self.stage_name)
