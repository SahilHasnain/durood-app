import AsyncStorage from "@react-native-async-storage/async-storage";

const PROGRESS_KEY = "books:reading-progress:v1";
const BOOKMARKS_KEY = "books:bookmarks:v1";

export type BookReadingProgress = {
    entryId: number;
    updatedAt: string;
};

export type BookBookmark = {
    bookId: number;
    entryId: number;
    createdAt: string;
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
    try {
        const stored = await AsyncStorage.getItem(key);
        return stored ? JSON.parse(stored) as T : fallback;
    } catch {
        return fallback;
    }
}

export async function getBooksProgress(): Promise<Record<string, BookReadingProgress>> {
    return readJson(PROGRESS_KEY, {});
}

export async function saveBookProgress(bookId: number, entryId: number): Promise<void> {
    const progress = await getBooksProgress();
    progress[String(bookId)] = { entryId, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export async function getBookBookmarks(): Promise<BookBookmark[]> {
    return readJson(BOOKMARKS_KEY, []);
}

export async function toggleBookBookmark(bookId: number, entryId: number): Promise<boolean> {
    const bookmarks = await getBookBookmarks();
    const index = bookmarks.findIndex((item) => item.bookId === bookId && item.entryId === entryId);
    if (index >= 0) {
        bookmarks.splice(index, 1);
        await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
        return false;
    }
    bookmarks.push({ bookId, entryId, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return true;
}

export async function isBookEntryBookmarked(bookId: number, entryId: number): Promise<boolean> {
    const bookmarks = await getBookBookmarks();
    return bookmarks.some((item) => item.bookId === bookId && item.entryId === entryId);
}
