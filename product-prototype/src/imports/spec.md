## ADDED Requirements

### Requirement: Extract Events Before Analysis
The system SHALL extract per-chapter event summaries (characters/events/locations/conflicts/emotional turns) before running adaptation analysis, and all subsequent stages SHALL read from the event table instead of the raw novel text.

#### Scenario: Events are extracted for each chapter
- **WHEN** the Pipeline starts with a novel of N chapters
- **THEN** the Extractor Agent produces events.json containing N chapter event summaries
- **AND** each event summary includes characters, events, locations, conflicts, and emotional turns

#### Scenario: Analyzer reads event table instead of raw novel
- **WHEN** the Analyzer Agent starts
- **THEN** it reads workspace/10_events/events.json as input
- **AND** it does NOT read the raw novel text from workspace/00_raw/

### Requirement: 5-Stage Agent Pipeline
The system SHALL execute a 5-stage Pipeline (Extractor → Analyzer → Planner → Writer → Reviewer) where each stage is an independent Python Class with clear input/output interfaces and Pydantic validation.

#### Scenario: Pipeline executes all 5 stages in order
- **WHEN** a user submits a novel with ≥3 chapters
- **THEN** the Orchestrator executes Extractor, Analyzer, Planner, Writer, and Reviewer in sequence
- **AND** each stage reads from workspace files and writes to workspace files

#### Scenario: Stage output fails Pydantic validation
- **WHEN** an Agent produces output that fails Pydantic validation
- **THEN** the system retries once with a modified prompt ("strictly output JSON")
- **AND** if retry also fails, attempts regex extraction of key fields
- **AND** if regex extraction fails, marks the stage as failed

### Requirement: Workspace File System
The system SHALL use a workspace directory structure (00_raw/10_events/20_analysis/30_plan/40_scripts/50_review/60_continuity/90_output/logs/) as the only inter-stage communication medium. Pipeline interruption SHALL be recoverable from any stage.

#### Scenario: Pipeline recovers from interruption
- **WHEN** the Pipeline is interrupted after stage 2 (Planner) completes
- **THEN** the system can resume from stage 3 (Writer) without re-running stages 0-2
- **AND** all workspace files from stages 0-2 are intact and valid

#### Scenario: Atomic write prevents corruption
- **WHEN** a stage writes a file to workspace
- **THEN** it writes to a .tmp file first and uses os.replace for atomic rename
- **AND** after write, it validates the file by deserializing it
- **AND** if validation fails, it deletes the file and reports an error

### Requirement: Context Control for Writer
The system SHALL limit Writer Agent's context injection to: previous chapter's 100-character summary + global character table + current chapter original text + continuity summary layer. The system SHALL NOT inject all previously written chapters' full text.

#### Scenario: Writer receives limited context
- **WHEN** the Writer Agent writes chapter 5
- **THEN** its context includes chapter 4's 100-char summary (not full text)
- **AND** its context includes the global character table
- **AND** its context includes chapter 5's original novel text
- **AND** its context includes the continuity summary layer

#### Scenario: Chapter summary is auto-generated
- **WHEN** the Writer Agent completes a chapter
- **THEN** the Assembler auto-generates a 100-character summary for that chapter
- **AND** saves it as workspace/40_scripts/chapter_XX.summary.json

### Requirement: Continuity Summary Compression
The system SHALL maintain a two-layer continuity record: raw layer (per-scene change details) and summary layer (compressed state every 5-10 scenes). Writer SHALL inject the summary layer plus scene-relevant raw entries, not the entire raw layer.

#### Scenario: Continuity is compressed
- **WHEN** 8 scenes have been written
- **THEN** the ContinuityCompressor generates a summary covering scenes 1-8
- **AND** the summary includes current character locations, key prop states, and active foreshadowing

#### Scenario: Writer reads continuity with compression
- **WHEN** the Writer Agent writes chapter 6
- **THEN** it receives the continuity summary layer + raw entries relevant to chapter 6's scenes
- **AND** it does NOT receive all raw continuity entries from chapters 1-5

#### Scenario: Continuity snapshot prevents race conditions
- **WHEN** the Writer Agent is about to call the LLM for a chapter
- **THEN** it takes a read-time snapshot of continuity.json
- **AND** async updates to continuity are written in a separate asyncio task after the Writer completes

### Requirement: 4 Editing Capabilities
The system SHALL provide 4 editing capabilities: single episode regeneration, adaptation visualization (AnalysisBoard), review result display (ReviewPanel), and continuity timeline display (ContinuityTimeline).

#### Scenario: Single episode regeneration
- **WHEN** the user clicks "regenerate" on episode 3
- **THEN** the system re-runs the Writer Agent for episode 3 only
- **AND** by default also regenerates the next downstream episode to prevent continuity breaks
- **AND** the user can choose "only this episode" to skip downstream regeneration

#### Scenario: Adaptation visualization
- **WHEN** the user views the AnalysisBoard
- **THEN** the system renders 4 tables: overview card (genre/orientation/risks), episode directory (number/title/events/hooks), hook library, and satisfaction fulfillment table

#### Scenario: Review result display
- **WHEN** the user views the ReviewPanel
- **THEN** the system shows a 5-dimension radar chart + Top-3 issue list (clickable to jump to episode) + modification suggestions (one-click adopt)

#### Scenario: Continuity timeline display
- **WHEN** the user views the ContinuityTimeline
- **THEN** the system shows a timeline of character settings/titles/key props/foreshadowing across episodes
- **AND** allows switching between raw layer and summary layer views

### Requirement: AI Transparency — EventsBoard
The system SHALL provide an EventsBoard component that displays per-chapter event summaries (characters/events/locations/conflicts/emotional turns) extracted by the Extractor Agent, allowing the author to verify AI's understanding of the novel.

#### Scenario: Author reviews extracted events
- **WHEN** the Extractor stage completes
- **THEN** the EventsBoard displays a list of event summaries per chapter
- **AND** each summary shows characters, events, locations, conflicts, and emotional turns

#### Scenario: EventsBoard is not an editing tool
- **WHEN** the author views the EventsBoard
- **THEN** the component is labeled as "AI Understanding Check" (not "Edit")
- **AND** it does not directly modify the script

### Requirement: SSE Event Protocol
The system SHALL emit 5 types of SSE events (stage_started, stage_progress, stage_completed, stage_failed, pipeline_completed) to the frontend for real-time progress display.

#### Scenario: Frontend shows real-time progress
- **WHEN** the Pipeline is running
- **THEN** the frontend displays a progress bar per stage (5 segments, each 0-100%)
- **AND** shows sub-progress per chapter (N/M for stages 0 and 3)
- **AND** displays "AI is thinking..." text prompts

#### Scenario: Stage failure is visible
- **WHEN** a stage fails with a recoverable error
- **THEN** the frontend shows a red banner with the error message
- **AND** provides a "Retry" button that calls POST /api/retry/{project_id}/{stage}

### Requirement: Pipeline Error Handling
The system SHALL implement classified retry with exponential backoff for LLM failures, stage gates (validate_upstream) before each stage, and atomic file writes. Disk-full errors SHALL NOT be retried.

#### Scenario: LLM rate limit is retried
- **WHEN** an LLM call returns 429 rate limit
- **THEN** the system retries up to 3 times with exponential backoff (1s, 3s, 9s)
- **AND** if all retries fail, marks the chapter/stage as failed

#### Scenario: Disk-full error is not retried
- **WHEN** a workspace file write fails due to disk full
- **THEN** the system immediately reports an error and pauses the Pipeline
- **AND** does NOT retry the write operation

#### Scenario: Stage gate prevents invalid execution
- **WHEN** a stage attempts to start but its upstream workspace files are missing or corrupted
- **THEN** the system blocks the stage from starting
- **AND** reports a validation error

### Requirement: YAML Schema v1.1 with Backward Compatibility
The system SHALL support Schema v1.1 with optional fields (beat_phase, emotion_marker, conflict_type, is_paywall, meta.analysis) that are backward compatible with v1.0.

#### Scenario: v1.1 fields are optional
- **WHEN** the Writer produces a script without v1.1 fields
- **THEN** the script is still valid under Schema v1.0
- **AND** no validation errors occur

#### Scenario: v1.1 fields are populated
- **WHEN** the Writer produces a script with beat_phase and emotion_marker
- **THEN** the script is valid under Schema v1.1
- **AND** the frontend can render beat phase and emotion markers

### Requirement: Independent YAML Schema Document
The system SHALL provide an independent document (docs/yaml-schema-design.md) defining the complete YAML Schema with field definitions, 9 design rationale, and JSON Schema constraints, as explicitly required by the competition.

#### Scenario: Schema document exists
- **WHEN** the project is delivered
- **THEN** docs/yaml-schema-design.md exists with complete field definitions
- **AND** includes 9 design rationale
- **AND** includes JSON Schema constraints

### Requirement: Docker Compose Local Deployment
The system SHALL be deployable locally via docker-compose up within 5 minutes, with .env.example for configuration.

#### Scenario: Local deployment works
- **WHEN** the user runs docker-compose up
- **THEN** both backend and frontend start successfully
- **AND** the application is accessible at localhost within 5 minutes

### Requirement: Input Validation
The system SHALL validate novel input: minimum 3 chapters, maximum 50 chapters (with warning), single chapter ≤ 10000 characters (with warning), single file ≤ 5MB, no empty files.

#### Scenario: Too few chapters
- **WHEN** the user submits a novel with 2 chapters
- **THEN** the system returns HTTP 400 with message "至少需要 3 个章节"

#### Scenario: Too many chapters
- **WHEN** the user submits a novel with 60 chapters
- **THEN** the system returns a warning suggesting to split the novel
- **AND** still processes the input if the user confirms

### Requirement: LLM Call Logging
The system SHALL log every LLM call to workspace/{project_id}/logs/llm.jsonl with fields: ts, stage, chapter, latency_ms, token_in, token_out, cost_cny, status, error. All Agents SHALL be required to use the logging function.

#### Scenario: LLM calls are logged
- **WHEN** the Extractor Agent makes an LLM call for chapter 3
- **THEN** a JSONL line is appended with ts, stage="extractor", chapter=3, latency_ms, token counts, cost, and status

#### Scenario: Logging works even on error
- **WHEN** an LLM call fails with a timeout
- **THEN** a JSONL line is still appended with status="error" and error="timeout"

### Requirement: Performance Baseline
The system SHALL meet performance baselines: 10-chapter novel Pipeline ≤ 90 seconds, first screen load ≤ 2 seconds, LLM call concurrency ≤ 2, workspace per project ≤ 50MB.

#### Scenario: 10-chapter pipeline completes within time limit
- **WHEN** a 10-chapter novel is processed
- **THEN** the total Pipeline duration is ≤ 90 seconds
- **AND** the total cost is ≤ 2.0 CNY

#### Scenario: Concurrency is bounded
- **WHEN** the Writer Agent is processing multiple chapters
- **THEN** at most 2 LLM calls are in flight simultaneously
- **AND** the Extractor and Writer share the same semaphore pool
