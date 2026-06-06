"""SQLAlchemy database models."""

from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


class Project(Base):
    """Project record — one per novel upload."""
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    chapter_count = Column(Integer, nullable=False)
    status = Column(String, default="uploaded")  # uploaded / processing / completed / failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Script(Base):
    """Generated script output."""
    __tablename__ = "scripts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)  # YAML string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Plan(Base):
    """Episode plan from Planner stage."""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, nullable=False, index=True)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Review(Base):
    """Review report from Reviewer stage."""
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, nullable=False, index=True)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Continuity(Base):
    """Continuity records."""
    __tablename__ = "continuities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, nullable=False, index=True)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency for DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
