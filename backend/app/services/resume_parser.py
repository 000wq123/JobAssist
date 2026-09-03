"""Utilities for extracting raw text from uploaded resume files."""
import io

import pypdf

MAX_PDF_PAGES = 50
MAX_EXTRACTED_CHARS = 100_000


def extract_text_from_pdf(
    file_bytes: bytes,
    *,
    max_pages: int = MAX_PDF_PAGES,
    max_chars: int = MAX_EXTRACTED_CHARS,
) -> str:
    if not file_bytes.startswith(b"%PDF"):
        raise ValueError("File extension and content do not match: expected a PDF")
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes), strict=True)
        if len(reader.pages) > max_pages:
            raise ValueError(f"PDF has too many pages (max {max_pages})")

        pages: list[str] = []
        total = 0
        for page in reader.pages:
            text = page.extract_text() or ""
            total += len(text)
            if total > max_chars:
                raise ValueError(
                    f"Resume text too long (max {max_chars:,} characters after extraction)"
                )
            pages.append(text)
        return "\n".join(pages).strip()
    except ValueError:
        raise
    except (pypdf.errors.PyPdfError, EOFError, OSError) as exc:
        raise ValueError("The PDF is damaged or cannot be read") from exc


def extract_text_from_txt(file_bytes: bytes) -> str:
    if file_bytes.startswith(b"%PDF"):
        raise ValueError("File extension and content do not match: expected a text file")
    try:
        return file_bytes.decode("utf-8").strip()
    except UnicodeDecodeError as exc:
        raise ValueError("The text file must use UTF-8 encoding") from exc


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    if not filename:
        raise ValueError("Filename is missing. Please upload a file with a valid name.")
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    if ext in ("txt", "text"):
        return extract_text_from_txt(file_bytes)
    raise ValueError(f"Unsupported file type: .{ext}. Please upload a PDF or TXT file.")
