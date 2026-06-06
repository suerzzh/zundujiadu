"""Input validation for novel uploads."""

from app.config import settings


class ValidationError(Exception):
    """Raised when input validation fails."""
    pass


class ValidationWarning:
    """Non-fatal validation warning."""
    def __init__(self, message: str):
        self.message = message


def validate_novel_input(chapters: list[str], file_size_bytes: int) -> tuple[list[ValidationWarning], list[str]]:
    """Validate novel input according to spec requirements.

    Returns:
        Tuple of (warnings, errors). If errors is non-empty, the input is rejected.
    """
    warnings: list[ValidationWarning] = []
    errors: list[str] = []

    # Chapter count checks
    if len(chapters) < settings.MIN_CHAPTERS:
        errors.append(f"至少需要 {settings.MIN_CHAPTERS} 个章节，当前只有 {len(chapters)} 个")

    if len(chapters) > settings.MAX_CHAPTERS:
        warnings.append(ValidationWarning(
            f"章节数 ({len(chapters)}) 超过 {settings.MAX_CHAPTERS}，建议拆分小说"
        ))

    # File size check
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size_bytes > max_bytes:
        errors.append(f"文件大小超过 {settings.MAX_FILE_SIZE_MB}MB 限制")

    # Per-chapter checks
    for i, chapter in enumerate(chapters, 1):
        if not chapter.strip():
            errors.append(f"第 {i} 章内容为空")
        elif len(chapter) > settings.MAX_CHAPTER_CHARS:
            warnings.append(ValidationWarning(
                f"第 {i} 章字数 ({len(chapter)}) 超过 {settings.MAX_CHAPTER_CHARS}，可能影响生成质量"
            ))

    return warnings, errors
