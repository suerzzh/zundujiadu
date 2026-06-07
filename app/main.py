"""FastAPI application — main entry point."""

import io
import json
import zipfile
import uuid
from typing import Optional

import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.models import init_db, get_db, Project
from app.validation import validate_novel_input
from app.workspace import workspace_manager
from app.pipeline.orchestrator import PipelineOrchestrator

app = FastAPI(
    title="Novel2Script",
    description="AI-assisted scriptwriting tool — converts novels to structured YAML scripts",
    version="2.1.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()
    settings.WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)


# ── Upload ─────────────────────────────────────────────────────

@app.post("/api/projects/upload", status_code=201)
async def upload_novel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a novel text file and create a project."""
    # Validate file size
    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"文件大小超过 {settings.MAX_FILE_SIZE_MB}MB 限制")

    # Decode text
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("gbk")
        except UnicodeDecodeError:
            raise HTTPException(400, "无法解码文件，请上传 UTF-8 或 GBK 编码的文本文件")

    # Split chapters
    from app.chapter_splitter import split_chapters
    chapters = split_chapters(text)

    # Validate input
    chapter_texts = [ch.content for ch in chapters]
    warnings, errors = validate_novel_input(chapter_texts, file_size)

    if errors:
        raise HTTPException(400, "; ".join(errors))

    # Create project
    project_id = str(uuid.uuid4())[:8]
    project = Project(
        id=project_id,
        filename=file.filename or "novel.txt",
        chapter_count=len(chapters),
        status="uploaded",
    )
    db.add(project)
    db.commit()

    # Create workspace
    workspace_manager.create_workspace(project_id)
    workspace_manager.write_file(project_id, "00_raw", "novel.txt", text)

    return {
        "project_id": project_id,
        "chapter_count": len(chapters),
        "warnings": [w.message for w in warnings],
    }


# ── Pipeline ───────────────────────────────────────────────────

@app.get("/api/projects/{project_id}/convert/stream")
async def convert_stream(project_id: str):
    """Start the pipeline and stream SSE events."""
    # Validate project exists
    workspace_dir = workspace_manager.get_project_dir(project_id)
    if not workspace_dir.exists():
        raise HTTPException(404, f"项目 {project_id} 不存在")

    # Read novel text
    try:
        novel_text = workspace_manager.read_file(project_id, "00_raw", "novel.txt")
    except FileNotFoundError:
        raise HTTPException(400, "小说文本未找到，请先上传")

    orchestrator = PipelineOrchestrator(project_id)

    async def event_generator():
        async for event in orchestrator.run_pipeline(novel_text):
            event_type = event.get("event", "stage_progress")
            data = json.dumps(event, ensure_ascii=False)
            yield f"event: {event_type}\ndata: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Regenerate ─────────────────────────────────────────────────

class RegenerateBody(BaseModel):
    episode_number: int
    regenerate_downstream: bool = True


@app.post("/api/projects/{project_id}/regenerate")
async def regenerate_episode(project_id: str, body: RegenerateBody):
    """Regenerate a single episode."""
    if not workspace_manager.workspace_exists(project_id):
        raise HTTPException(404, f"项目 {project_id} 不存在")

    orchestrator = PipelineOrchestrator(project_id)
    result = await orchestrator.regenerate_episode(
        episode_number=body.episode_number,
        regenerate_downstream=body.regenerate_downstream,
    )
    return result


# ── Retry ──────────────────────────────────────────────────────

@app.post("/api/projects/{project_id}/retry/{stage}")
async def retry_stage(project_id: str, stage: str):
    """Retry a failed pipeline stage."""
    if not workspace_manager.workspace_exists(project_id):
        raise HTTPException(404, f"项目 {project_id} 不存在")

    orchestrator = PipelineOrchestrator(project_id)
    result = await orchestrator.retry_stage(stage)
    if result["status"] == "error":
        raise HTTPException(400, result["message"])
    return result


# ── GET endpoints for pipeline outputs ─────────────────────────

@app.get("/api/projects/{project_id}/events")
async def get_events(project_id: str):
    """Get extracted events."""
    try:
        data = workspace_manager.read_json(project_id, "10_events", "events.json")
        return data
    except FileNotFoundError:
        raise HTTPException(404, "事件数据未生成")


@app.get("/api/projects/{project_id}/analysis")
async def get_analysis(project_id: str):
    """Get adaptation analysis."""
    try:
        data = workspace_manager.read_json(project_id, "20_analysis", "analysis.json")
        return data
    except FileNotFoundError:
        raise HTTPException(404, "分析数据未生成")


@app.get("/api/projects/{project_id}/plan")
async def get_plan(project_id: str):
    """Get episode plan."""
    try:
        data = workspace_manager.read_json(project_id, "30_plan", "plan.json")
        return data
    except FileNotFoundError:
        raise HTTPException(404, "规划数据未生成")


@app.get("/api/projects/{project_id}/review")
async def get_review(project_id: str):
    """Get review report."""
    try:
        data = workspace_manager.read_json(project_id, "50_review", "review.json")
        return data
    except FileNotFoundError:
        raise HTTPException(404, "审核数据未生成")


@app.get("/api/projects/{project_id}/continuity")
async def get_continuity(project_id: str):
    """Get continuity records."""
    try:
        data = workspace_manager.read_json(project_id, "60_continuity", "continuity.json")
        return data
    except FileNotFoundError:
        raise HTTPException(404, "连续性数据未生成")


@app.get("/api/projects/{project_id}/script")
async def get_script(project_id: str):
    """Get the final script YAML."""
    try:
        content = workspace_manager.read_file(project_id, "90_output", "script.yaml")
        return {"content": content}
    except FileNotFoundError:
        raise HTTPException(404, "剧本未生成")


@app.get("/api/projects/{project_id}/chapters")
async def get_chapters(project_id: str):
    """Get chapter list from the raw novel."""
    try:
        novel_text = workspace_manager.read_file(project_id, "00_raw", "novel.txt")
        from app.chapter_splitter import split_chapters
        chapters = split_chapters(novel_text)
        return {
            "chapters": [
                {"number": ch.number, "title": ch.title, "length": len(ch.content)}
                for ch in chapters
            ]
        }
    except FileNotFoundError:
        raise HTTPException(404, "小说未上传")


# ── Script Edit ───────────────────────────────────────────────

class ScriptUpdateBody(BaseModel):
    content: str


@app.put("/api/projects/{project_id}/script")
async def update_script(project_id: str, body: ScriptUpdateBody):
    """Save edited script YAML back to workspace."""
    if not workspace_manager.workspace_exists(project_id):
        raise HTTPException(404, f"项目 {project_id} 不存在")

    workspace_manager.write_file(
        project_id, "90_output", "script.yaml", body.content
    )
    return {"status": "ok"}


# ── Export (B7) ────────────────────────────────────────────────

@app.get("/api/projects/{project_id}/export")
async def export_outputs(project_id: str):
    """Export all pipeline outputs as a ZIP file."""
    if not workspace_manager.workspace_exists(project_id):
        raise HTTPException(404, f"项目 {project_id} 不存在")

    # Create ZIP in memory
    buffer = io.BytesIO()
    project_dir = workspace_manager.get_project_dir(project_id)

    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        # Export script.yaml
        for subdir in ["10_events", "20_analysis", "30_plan", "40_scripts", "50_review", "60_continuity", "90_output"]:
            subdir_path = project_dir / subdir
            if subdir_path.exists():
                for file_path in subdir_path.iterdir():
                    if file_path.is_file():
                        zf.write(file_path, f"{subdir}/{file_path.name}")

    buffer.seek(0)
    return Response(
        content=buffer.read(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=novel2script_{project_id}.zip"
        },
    )


# ── Health ─────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.1.0"}
