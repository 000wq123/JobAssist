from io import BytesIO

import pytest
from pypdf import PdfWriter

from app.services.resume_parser import extract_resume_text, extract_text_from_pdf


def _pdf_with_pages(count: int) -> bytes:
    writer = PdfWriter()
    for _ in range(count):
        writer.add_blank_page(width=72, height=72)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


def test_rejects_text_disguised_as_pdf():
    with pytest.raises(ValueError, match="expected a PDF"):
        extract_resume_text("resume.pdf", b"plain UTF-8 text")


def test_rejects_pdf_disguised_as_text():
    with pytest.raises(ValueError, match="expected a text file"):
        extract_resume_text("resume.txt", _pdf_with_pages(1))


def test_rejects_pdf_above_page_limit_before_extraction():
    with pytest.raises(ValueError, match="too many pages"):
        extract_text_from_pdf(_pdf_with_pages(3), max_pages=2)


def test_rejects_malformed_pdf_as_client_error():
    with pytest.raises(ValueError, match="damaged or cannot be read"):
        extract_resume_text("resume.pdf", b"%PDF definitely not a real PDF")


def test_accepts_utf8_text():
    assert extract_resume_text("resume.txt", "Hallo Wien".encode()) == "Hallo Wien"
