#!/usr/bin/env python3
"""Build the Durood Stories SQLite database from the markdown source.

Source : data/durood-stories.md
Output : assets/db/durood_stories.sqlite

Schema (catalog / contents / localized text):
  - books            : book catalog metadata
  - book_entries     : ordered contents (story today, chapters later via parent_entry_id)
  - book_entry_text  : localized text lines per entry (language_code + role)
  - book_search      : FTS5 index over book content, keyed by book_id + entry_id

The schema is book-agnostic: additional books or nested chapters/stories can be
added without schema changes.

Usage:
  python scripts/build-durood-stories-db.py [input.md] [output.sqlite]
"""

from __future__ import annotations

import os
import re
import sqlite3
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_INPUT = os.path.join(ROOT, "data", "durood-stories.md")
DEFAULT_OUTPUT = os.path.join(ROOT, "assets", "db", "durood_stories.sqlite")

BOOK_SLUG = "durood-stories"
BOOK_TITLE_FALLBACK = "Durood Stories"
BOOK_DESCRIPTION = (
    "A collection of true stories about the blessings and miracles of "
    "reciting durood sharif upon the Prophet Muhammad."
)
BOOK_AUTHOR = None
BOOK_LANGUAGE = "en"
BOOK_CONTENT_TYPE = "text"

ENTRY_TYPE = "story"
ENTRY_ROLE = "body"

STORY_HEADING_RE = re.compile(r"^##\s+(\d+)\.\s+(.*?)\s*$")
MD_NOISE_RE = re.compile(r"[*_`~#>]+")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def to_plain(value: str) -> str:
    """Strip light markdown markup so summaries/search stay readable."""
    text = MD_NOISE_RE.sub("", value)
    text = text.replace("\u2014", "-").replace("\u2013", "-")
    return re.sub(r"\s+", " ", text).strip()


def parse_markdown(path: str):
    with open(path, "r", encoding="utf-8") as fh:
        lines = fh.read().splitlines()

    book_title = BOOK_TITLE_FALLBACK
    stories: list[dict] = []
    current: dict | None = None

    for raw in lines:
        stripped = raw.strip()

        if not stripped:
            continue

        # Horizontal rule -> separator between stories, ignore.
        if re.fullmatch(r"-{3,}", stripped):
            continue

        # Book title (single leading #).
        if re.match(r"^#\s+", stripped) and not stripped.startswith("##"):
            book_title = stripped[2:].strip()
            continue

        # Story heading.
        match = STORY_HEADING_RE.match(stripped)
        if match:
            if current is not None:
                stories.append(current)
            current = {
                "number": int(match.group(1)),
                "title": match.group(2).strip(),
                "paragraphs": [],
            }
            continue

        # Ignore any other heading level (defensive).
        if re.match(r"^#{1,6}\s+", stripped):
            continue

        if current is None:
            # Preamble text before the first story heading -> ignored.
            continue

        current["paragraphs"].append(stripped)

    if current is not None:
        stories.append(current)

    return book_title, stories


def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE books (
            id              INTEGER PRIMARY KEY,
            slug            TEXT NOT NULL UNIQUE,
            title           TEXT NOT NULL,
            subtitle        TEXT,
            description     TEXT,
            author          TEXT,
            language_code   TEXT NOT NULL DEFAULT 'en',
            cover_asset     TEXT,
            content_type    TEXT NOT NULL DEFAULT 'text',
            display_order   INTEGER NOT NULL DEFAULT 0,
            is_published    INTEGER NOT NULL DEFAULT 1,
            created_at      TEXT,
            updated_at      TEXT
        );

        CREATE TABLE book_entries (
            id                INTEGER PRIMARY KEY,
            book_id           INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            parent_entry_id   INTEGER REFERENCES book_entries(id) ON DELETE CASCADE,
            slug              TEXT NOT NULL,
            entry_type        TEXT NOT NULL DEFAULT 'story',
            title             TEXT NOT NULL,
            summary           TEXT,
            position          INTEGER NOT NULL,
            word_count        INTEGER,
            is_published      INTEGER NOT NULL DEFAULT 1,
            created_at        TEXT,
            updated_at        TEXT,
            UNIQUE(book_id, slug)
        );

        CREATE TABLE book_entry_text (
            id              INTEGER PRIMARY KEY,
            entry_id        INTEGER NOT NULL REFERENCES book_entries(id) ON DELETE CASCADE,
            language_code   TEXT NOT NULL,
            line_number     INTEGER NOT NULL,
            role            TEXT NOT NULL DEFAULT 'body',
            text            TEXT NOT NULL,
            UNIQUE(entry_id, language_code, line_number, role)
        );

        CREATE INDEX idx_book_entries_book_order
            ON book_entries(book_id, position);

        CREATE INDEX idx_book_entries_parent
            ON book_entries(parent_entry_id);

        CREATE INDEX idx_book_entry_text_entry_language
            ON book_entry_text(entry_id, language_code, line_number);

        CREATE VIRTUAL TABLE book_search USING fts5 (
            book_id     UNINDEXED,
            entry_id    UNINDEXED,
            entry_slug  UNINDEXED,
            title,
            body,
            tokenize = 'unicode61 remove_diacritics 2'
        );
        """
    )


def build(input_path: str, output_path: str) -> None:
    if not os.path.exists(input_path):
        raise SystemExit(f"Input markdown not found: {input_path}")

    book_title, stories = parse_markdown(input_path)
    if not stories:
        raise SystemExit("No stories parsed from markdown; aborting.")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if os.path.exists(output_path):
        os.remove(output_path)

    ts = now_iso()
    conn = sqlite3.connect(output_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        create_schema(conn)

        # --- books -------------------------------------------------------
        conn.execute(
            """INSERT INTO books
               (id, slug, title, subtitle, description, author, language_code,
                cover_asset, content_type, display_order, is_published,
                created_at, updated_at)
               VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)""",
            (
                BOOK_SLUG,
                book_title,
                None,
                BOOK_DESCRIPTION,
                BOOK_AUTHOR,
                BOOK_LANGUAGE,
                None,
                BOOK_CONTENT_TYPE,
                ts,
                ts,
            ),
        )
        book_id = 1

        # --- book_entries + book_entry_text + FTS ------------------------
        used_slugs: set[str] = set()
        text_rows = []
        search_rows = []
        line_id = 0
        total_words = 0

        for position, story in enumerate(stories, start=1):
            entry_id = story["number"]
            paragraphs = story["paragraphs"]

            # Keep slugs unique within the book (UNIQUE(book_id, slug)).
            slug = slugify(story["title"]) or f"story-{entry_id}"
            if slug in used_slugs:
                slug = f"{slug}-{entry_id}"
            used_slugs.add(slug)

            summary = to_plain(paragraphs[0]) if paragraphs else ""
            body = " ".join(to_plain(p) for p in paragraphs)
            word_count = len(body.split())
            total_words += word_count

            conn.execute(
                """INSERT INTO book_entries
                   (id, book_id, parent_entry_id, slug, entry_type, title,
                    summary, position, word_count, is_published,
                    created_at, updated_at)
                   VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
                (
                    entry_id,
                    book_id,
                    slug,
                    ENTRY_TYPE,
                    story["title"],
                    summary,
                    position,
                    word_count,
                    ts,
                    ts,
                ),
            )

            for line_number, paragraph in enumerate(paragraphs, start=1):
                line_id += 1
                text_rows.append(
                    (
                        line_id,
                        entry_id,
                        BOOK_LANGUAGE,
                        line_number,
                        ENTRY_ROLE,
                        paragraph,
                    )
                )

            search_rows.append(
                (book_id, entry_id, slug, story["title"], body)
            )

        conn.executemany(
            """INSERT INTO book_entry_text
               (id, entry_id, language_code, line_number, role, text)
               VALUES (?, ?, ?, ?, ?, ?)""",
            text_rows,
        )
        conn.executemany(
            """INSERT INTO book_search
               (book_id, entry_id, entry_slug, title, body)
               VALUES (?, ?, ?, ?, ?)""",
            search_rows,
        )

        conn.commit()

        print(f"Book        : {book_title} (id={book_id}, slug={BOOK_SLUG})")
        print(f"Entries     : {len(stories)} ({ENTRY_TYPE})")
        print(f"Text lines  : {len(text_rows)} (role={ENTRY_ROLE})")
        print(f"Words       : {total_words}")
        print(f"Output      : {output_path}")
    finally:
        conn.close()


def main() -> None:
    input_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    output_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT
    build(input_path, output_path)


if __name__ == "__main__":
    main()
