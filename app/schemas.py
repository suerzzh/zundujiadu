"""Pydantic schemas for API request/response validation."""

from typing import Optional
from pydantic import BaseModel, Field


# ── Event Models (Extractor output) ──────────────────────────

class Event(BaseModel):
    """A single event extracted from a chapter."""
    characters: list[str] = Field(default_factory=list, description="涉及人物")
    events: list[str] = Field(default_factory=list, description="事件描述")
    locations: list[str] = Field(default_factory=list, description="地点")
    conflicts: list[str] = Field(default_factory=list, description="冲突")
    emotional_turns: list[str] = Field(default_factory=list, description="情感转折")


class ChapterEvents(BaseModel):
    """Events for a single chapter."""
    chapter: int
    title: str = ""
    events: Event = Field(default_factory=Event)


class EventsResult(BaseModel):
    """Extractor output: events for all chapters."""
    chapters: list[ChapterEvents] = Field(default_factory=list)


# ── Analysis Models (Analyzer output) ─────────────────────────

class CharacterProfile(BaseModel):
    """Character profile from analysis."""
    name: str
    role: str = ""  # protagonist / antagonist / supporting
    traits: list[str] = Field(default_factory=list)
    arc: str = ""
    titles: list[str] = Field(default_factory=list, description="称呼规范")


class ConflictPool(BaseModel):
    """Conflict pool from analysis."""
    core_conflicts: list[str] = Field(default_factory=list)
    sub_conflicts: list[str] = Field(default_factory=list)


class SatisfactionPool(BaseModel):
    """Satisfaction/pleasure point pool."""
    points: list[str] = Field(default_factory=list, description="爽点列表")


class AdaptationRisk(BaseModel):
    """Adaptation risk item."""
    risk: str
    mitigation: str = ""


class Analysis(BaseModel):
    """Analyzer output: adaptation analysis."""
    genre: str = Field(description="题材")
    orientation: str = Field(description="男频/女频")
    sub_genres: list[str] = Field(default_factory=list)
    conflict_pool: ConflictPool = Field(default_factory=ConflictPool)
    satisfaction_pool: SatisfactionPool = Field(default_factory=SatisfactionPool)
    characters: list[CharacterProfile] = Field(default_factory=list)
    adaptation_strategy: str = ""
    risks: list[AdaptationRisk] = Field(default_factory=list)


# ── Plan Models (Planner output) ──────────────────────────────

class EpisodeEntry(BaseModel):
    """A single episode in the plan."""
    episode: int
    title: str = ""
    episode_type: str = ""  # setup / escalation / climax / resolution
    events: list[str] = Field(default_factory=list, description="事件流程")
    hook: str = ""  # 钩子
    emotional_intensity: float = 0.5
    cliffhanger: str = ""


class EmotionCurve(BaseModel):
    """Emotion curve data."""
    episode: int
    intensity: float
    label: str = ""


class EpisodePlan(BaseModel):
    """Planner output: episode plan."""
    episodes: list[EpisodeEntry] = Field(default_factory=list)
    emotion_curve: list[EmotionCurve] = Field(default_factory=list)
    pacing_warnings: list[str] = Field(default_factory=list)


# ── Script Models (Writer output, Schema v1.1) ───────────────

class Dialogue(BaseModel):
    """A single dialogue line."""
    character: str
    line: str
    direction: str = ""  # stage direction


class Beat(BaseModel):
    """A beat within a scene."""
    beat_phase: Optional[str] = None  # v1.1: setup/confrontation/resolution
    description: str = ""
    dialogues: list[Dialogue] = Field(default_factory=list)
    emotion_marker: Optional[str] = None  # v1.1
    conflict_type: Optional[str] = None  # v1.1


class Scene(BaseModel):
    """A scene within an episode."""
    scene_number: int
    location: str = ""
    time_of_day: str = ""
    beats: list[Beat] = Field(default_factory=list)
    is_paywall: Optional[bool] = None  # v1.1


class Episode(BaseModel):
    """An episode in the script."""
    episode_number: int
    title: str = ""
    logline: str = ""
    scenes: list[Scene] = Field(default_factory=list)


class MetaInfo(BaseModel):
    """Script metadata."""
    title: str = ""
    genre: str = ""
    source_novel: str = ""
    total_episodes: int = 0
    version: str = "1.0"
    analysis: Optional[dict] = None  # v1.1: optional analysis summary


class Script(BaseModel):
    """Complete script (Schema v1.0/v1.1)."""
    meta: MetaInfo = Field(default_factory=MetaInfo)
    episodes: list[Episode] = Field(default_factory=list)


# ── Review Models (Reviewer output) ──────────────────────────

class DimensionScore(BaseModel):
    """Score for a single review dimension."""
    dimension: str
    score: float  # 0-10
    comment: str = ""


class TopIssue(BaseModel):
    """A top issue found in review."""
    episode: int
    scene: int = 0
    description: str
    suggestion: str = ""


class QualityGateCheck(BaseModel):
    """A quality gate check result."""
    rule: str
    passed: bool
    details: str = ""


class Review(BaseModel):
    """Reviewer output: review report."""
    dimension_scores: list[DimensionScore] = Field(default_factory=list)
    top_issues: list[TopIssue] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    quality_gates: list[QualityGateCheck] = Field(default_factory=list)
    overall_score: float = 0.0


# ── Continuity Models ─────────────────────────────────────────

class ContinuityEntry(BaseModel):
    """A single continuity entry (raw layer)."""
    episode: int
    scene: int = 0
    character_changes: list[str] = Field(default_factory=list)
    prop_states: list[str] = Field(default_factory=list)
    foreshadowing: list[str] = Field(default_factory=list)
    title_changes: list[str] = Field(default_factory=list)


class ContinuitySummary(BaseModel):
    """Compressed continuity summary (summary layer)."""
    from_episode: int
    to_episode: int
    character_states: list[str] = Field(default_factory=list)
    prop_states: list[str] = Field(default_factory=list)
    active_foreshadowing: list[str] = Field(default_factory=list)
    title_conventions: list[str] = Field(default_factory=list)


class ContinuityRecord(BaseModel):
    """Full continuity record with raw and summary layers."""
    raw: list[ContinuityEntry] = Field(default_factory=list)
    summaries: list[ContinuitySummary] = Field(default_factory=list)


# ── Chapter Summary ──────────────────────────────────────────

class ChapterSummary(BaseModel):
    """100-character summary of a chapter's script."""
    chapter: int
    summary: str = Field(max_length=200)  # allow some margin over 100 chars


# ── SSE Event Models ──────────────────────────────────────────

class SSEEvent(BaseModel):
    """Base SSE event."""
    event: str
    ts: str = ""


class StageStartedEvent(SSEEvent):
    event: str = "stage_started"
    stage: str = ""
    total_chapters: int = 0


class StageProgressEvent(SSEEvent):
    event: str = "stage_progress"
    stage: str = ""
    chapter: int = 0
    total: int = 0
    elapsed_sec: float = 0
    chapter_status: str = ""
    events_count: int = 0


class StageCompletedEvent(SSEEvent):
    event: str = "stage_completed"
    stage: str = ""
    duration_sec: float = 0
    outputs: dict = Field(default_factory=dict)


class StageFailedEvent(SSEEvent):
    event: str = "stage_failed"
    stage: str = ""
    chapter: int = 0
    error: str = ""
    retry_count: int = 0
    recoverable: bool = True


class PipelineCompletedEvent(SSEEvent):
    event: str = "pipeline_completed"
    outputs: list[str] = Field(default_factory=list)
    total_duration_sec: float = 0
    total_cost: float = 0.0


# ── API Request/Response ──────────────────────────────────────

class UploadResponse(BaseModel):
    project_id: str
    chapter_count: int
    warnings: list[str] = Field(default_factory=list)


class RegenerateRequest(BaseModel):
    episode_number: int
    regenerate_downstream: bool = True
