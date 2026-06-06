"""Base Agent class for all pipeline stages."""

from abc import ABC, abstractmethod
from typing import Any

from app.workspace import workspace_manager


class BaseAgent(ABC):
    """Base class for all pipeline agents."""

    stage_name: str = ""

    def __init__(self, project_id: str):
        self.project_id = project_id

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """Execute the agent's main task."""
        pass

    def validate_upstream(self) -> bool:
        """Check if upstream dependencies are met."""
        return workspace_manager.validate_upstream(self.project_id, self.stage_name)
