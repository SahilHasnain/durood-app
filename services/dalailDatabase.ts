import type { SQLiteDatabase } from "expo-sqlite";

export type DalailTextLine = {
    lineNumber: number;
    arabic: string;
    english: string;
};

export type DalailPart = {
    partNumber: number;
    day: string;
    title: string;
    description: string;
};

export type DalailDua = {
    id: number;
    name: string;
    title: string;
    titleArabic: string;
};

type PartRow = {
    part_number: number;
    part_day: string;
    part_title: string;
    part_description: string;
};

type LineRow = {
    line_number: number;
    arabic: string | null;
    english: string | null;
};

type DuaRow = {
    id: number;
    dua_name: string;
    dua_title: string;
    dua_title_arabic: string;
};

type DuaLineRow = {
    line_number: number;
    arabic: string | null;
    english: string | null;
};

function stripMarkup(value: string | null): string {
    return (value ?? "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .trim();
}

export async function getDalailParts(db: SQLiteDatabase): Promise<DalailPart[]> {
    const rows = await db.getAllAsync<PartRow>(
        "SELECT part_number, part_day, part_title, part_description FROM parts_info WHERE is_deleted = 0 ORDER BY part_number"
    );
    return rows.map((row) => ({
        partNumber: row.part_number,
        day: row.part_day,
        title: row.part_title,
        description: row.part_description,
    }));
}

export async function getDalailPartLines(db: SQLiteDatabase, partNumber: number): Promise<DalailTextLine[]> {
    const rows = await db.getAllAsync<LineRow>(
        `SELECT line_number,
                MAX(CASE WHEN classes = 'arabicText' THEN txt END) AS arabic,
                MAX(CASE WHEN classes = 'trans' THEN txt END) AS english
         FROM parts_text
         WHERE part_number = ? AND is_deleted = 0
         GROUP BY line_number
         ORDER BY line_number`,
        partNumber
    );
    return rows
        .map((row) => ({
            lineNumber: row.line_number,
            arabic: stripMarkup(row.arabic),
            english: stripMarkup(row.english),
        }))
        .filter((line) => line.arabic || line.english);
}

export async function getDalailDuas(db: SQLiteDatabase): Promise<DalailDua[]> {
    const rows = await db.getAllAsync<DuaRow>(
        "SELECT id, dua_name, dua_title, dua_title_arabic FROM duas_info WHERE is_deleted = 0 ORDER BY id"
    );
    return rows.map((row) => ({
        id: row.id,
        name: row.dua_name,
        title: row.dua_title,
        titleArabic: row.dua_title_arabic,
    }));
}

export async function getDalailDuaLines(db: SQLiteDatabase, duaId: number): Promise<DalailTextLine[]> {
    const rows = await db.getAllAsync<DuaLineRow>(
        `SELECT line_number,
                MAX(CASE WHEN classes = 'arabicText' THEN txt END) AS arabic,
                MAX(CASE WHEN classes = 'trans' THEN txt END) AS english
         FROM duas_text
         WHERE dua_id = ? AND is_deleted = 0
         GROUP BY line_number
         ORDER BY line_number`,
        duaId
    );
    return rows
        .map((row) => ({
            lineNumber: row.line_number,
            arabic: stripMarkup(row.arabic),
            english: stripMarkup(row.english),
        }))
        .filter((line) => line.arabic || line.english);
}
