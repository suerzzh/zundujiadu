"""Chapter splitter — splits novel text into chapters."""

import re
from dataclasses import dataclass


@dataclass
class Chapter:
    """A single chapter of a novel."""
    number: int
    title: str
    content: str


# Common chapter heading patterns
CHAPTER_PATTERNS = [
    r'^第[一二三四五六七八九十百千万零\d]+[章节回卷]',
    r'^Chapter\s+\d+',
    r'^CHAPTER\s+\d+',
    r'^\d+\.\s',  # numbered sections
]


def split_chapters(text: str) -> list[Chapter]:
    """Split novel text into chapters.

    Tries common Chinese and English chapter heading patterns.
    Falls back to splitting by double newlines if no patterns match.
    """
    lines = text.split('\n')
    chapter_starts: list[tuple[int, str]] = []

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        for pattern in CHAPTER_PATTERNS:
            if re.match(pattern, stripped):
                chapter_starts.append((i, stripped))
                break

    # If fewer than 3 chapters detected, try splitting by double newlines
    if len(chapter_starts) < 3:
        return _split_by_double_newlines(text)

    # Build chapters from detected starts
    chapters: list[Chapter] = []
    for idx, (start_line, title) in enumerate(chapter_starts):
        end_line = chapter_starts[idx + 1][0] if idx + 1 < len(chapter_starts) else len(lines)
        content = '\n'.join(lines[start_line:end_line]).strip()
        if content:
            chapters.append(Chapter(number=idx + 1, title=title, content=content))

    return chapters


def _split_by_double_newlines(text: str) -> list[Chapter]:
    """Fallback: split by double newlines (blank line separators)."""
    # Split by one or more blank lines
    parts = re.split(r'\n\s*\n', text.strip())
    parts = [p.strip() for p in parts if p.strip()]

    if len(parts) < 3:
        # Last resort: treat entire text as single "chapter"
        # and split into roughly equal parts
        chunk_size = len(text) // 3
        chapters = []
        for i in range(3):
            start = i * chunk_size
            end = start + chunk_size if i < 2 else len(text)
            content = text[start:end].strip()
            if content:
                chapters.append(Chapter(number=i + 1, title=f"第{i + 1}章", content=content))
        return chapters

    chapters = []
    for i, part in enumerate(parts):
        title = f"第{i + 1}章"
        # Try to extract title from first line
        first_line = part.split('\n')[0].strip()
        if first_line and len(first_line) < 50:
            title = first_line
            part = '\n'.join(part.split('\n')[1:]).strip()
        chapters.append(Chapter(number=i + 1, title=title, content=part))

    return chapters
