import type { SQLiteDatabase } from "expo-sqlite";

export type LibraryBook = {
    id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    author: string | null;
    languageCode: string;
    coverAsset: string | null;
    contentType: string;
    displayOrder: number;
    entryCount: number;
};

export type BookEntry = {
    id: number;
    bookId: number;
    parentEntryId: number | null;
    slug: string;
    entryType: string;
    title: string;
    summary: string | null;
    position: number;
    wordCount: number | null;
    childCount: number;
};

export type BookTextBlock = {
    lineNumber: number;
    role: string;
    text: string;
};

type BookRow = {
    id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    author: string | null;
    language_code: string;
    cover_asset: string | null;
    content_type: string;
    display_order: number;
    entry_count: number;
};

type EntryRow = {
    id: number;
    book_id: number;
    parent_entry_id: number | null;
    slug: string;
    entry_type: string;
    title: string;
    summary: string | null;
    position: number;
    word_count: number | null;
    child_count: number;
};

function mapEntry(row: EntryRow): BookEntry {
    return {
        id: row.id,
        bookId: row.book_id,
        parentEntryId: row.parent_entry_id,
        slug: row.slug,
        entryType: row.entry_type,
        title: row.title,
        summary: row.summary,
        position: row.position,
        wordCount: row.word_count,
        childCount: row.child_count,
    };
}

export async function getBooks(db: SQLiteDatabase): Promise<LibraryBook[]> {
    const rows = await db.getAllAsync<BookRow>(
        `SELECT b.id, b.slug, b.title, b.subtitle, b.description, b.author,
                b.language_code, b.cover_asset, b.content_type, b.display_order,
                COUNT(e.id) AS entry_count
         FROM books b
         LEFT JOIN book_entries e ON e.book_id = b.id AND e.parent_entry_id IS NULL AND e.is_published = 1
         WHERE b.is_published = 1
         GROUP BY b.id
         ORDER BY b.display_order, b.title COLLATE NOCASE`
    );

    return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        author: row.author,
        languageCode: row.language_code,
        coverAsset: row.cover_asset,
        contentType: row.content_type,
        displayOrder: row.display_order,
        entryCount: row.entry_count,
    }));
}

export async function getBook(db: SQLiteDatabase, bookId: number): Promise<LibraryBook | null> {
    const books = await getBooks(db);
    return books.find((book) => book.id === bookId) ?? null;
}

export async function getBookEntries(
    db: SQLiteDatabase,
    bookId: number,
    parentEntryId: number | null = null,
): Promise<BookEntry[]> {
    const rows = parentEntryId === null
        ? await db.getAllAsync<EntryRow>(
            `SELECT e.id, e.book_id, e.parent_entry_id, e.slug, e.entry_type, e.title,
                    e.summary, e.position, e.word_count,
                    (SELECT COUNT(*) FROM book_entries child WHERE child.parent_entry_id = e.id AND child.is_published = 1) AS child_count
             FROM book_entries e
             WHERE e.book_id = ? AND e.parent_entry_id IS NULL AND e.is_published = 1
             ORDER BY e.position, e.title COLLATE NOCASE`,
            bookId,
        )
        : await db.getAllAsync<EntryRow>(
            `SELECT e.id, e.book_id, e.parent_entry_id, e.slug, e.entry_type, e.title,
                    e.summary, e.position, e.word_count,
                    (SELECT COUNT(*) FROM book_entries child WHERE child.parent_entry_id = e.id AND child.is_published = 1) AS child_count
             FROM book_entries e
             WHERE e.book_id = ? AND e.parent_entry_id = ? AND e.is_published = 1
             ORDER BY e.position, e.title COLLATE NOCASE`,
            bookId,
            parentEntryId,
        );
    return rows.map(mapEntry);
}

export async function getBookEntry(db: SQLiteDatabase, bookId: number, entryId: number): Promise<BookEntry | null> {
    const row = await db.getFirstAsync<EntryRow>(
        `SELECT e.id, e.book_id, e.parent_entry_id, e.slug, e.entry_type, e.title,
                e.summary, e.position, e.word_count,
                (SELECT COUNT(*) FROM book_entries child WHERE child.parent_entry_id = e.id AND child.is_published = 1) AS child_count
         FROM book_entries e
         WHERE e.book_id = ? AND e.id = ? AND e.is_published = 1`,
        bookId,
        entryId,
    );
    return row ? mapEntry(row) : null;
}

export async function getBookEntryText(
    db: SQLiteDatabase,
    entryId: number,
    languageCode: string,
): Promise<BookTextBlock[]> {
    const rows = await db.getAllAsync<BookTextBlock>(
        `SELECT line_number AS lineNumber, role, text
         FROM book_entry_text
         WHERE entry_id = ? AND language_code = ?
         ORDER BY line_number, id`,
        entryId,
        languageCode,
    );
    return rows;
}

export async function searchBookEntries(
    db: SQLiteDatabase,
    bookId: number,
    searchText: string,
): Promise<BookEntry[]> {
    const terms = searchText.trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return getBookEntries(db, bookId);

    // Quote each word so punctuation or FTS operators in the search field are harmless.
    const matchQuery = terms.map((term) => `"${term.replace(/"/g, '""')}"*`).join(" AND ");
    const rows = await db.getAllAsync<EntryRow>(
        `SELECT e.id, e.book_id, e.parent_entry_id, e.slug, e.entry_type, e.title,
                e.summary, e.position, e.word_count,
                (SELECT COUNT(*) FROM book_entries child WHERE child.parent_entry_id = e.id AND child.is_published = 1) AS child_count
         FROM book_search s
         JOIN book_entries e ON e.id = CAST(s.entry_id AS INTEGER)
         WHERE book_search MATCH ? AND CAST(s.book_id AS INTEGER) = ? AND e.is_published = 1
         ORDER BY e.position, e.title COLLATE NOCASE`,
        matchQuery,
        bookId,
    );
    return rows.map(mapEntry);
}
