import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const STORAGE_KEY = "dalail:bookmarks";

export type DalailBookmark = {
    id: string;
    page: number;
    label?: string;
    createdAt: string;
};

export function useDalailBookmarks() {
    const [bookmarks, setBookmarks] = useState<DalailBookmark[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function loadBookmarks() {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (!mounted) return;
                const parsed = stored ? JSON.parse(stored) as DalailBookmark[] : [];
                setBookmarks(parsed.sort((a, b) => a.page - b.page));
            } finally {
                if (mounted) setIsLoaded(true);
            }
        }

        void loadBookmarks();

        return () => {
            mounted = false;
        };
    }, []);

    const addBookmark = async (page: number, label?: string) => {
        const nextBookmark: DalailBookmark = {
            id: `dalail-bookmark-${Date.now()}`,
            page,
            label,
            createdAt: new Date().toISOString(),
        };
        const nextBookmarks = [...bookmarks, nextBookmark].sort((a, b) => a.page - b.page);
        setBookmarks(nextBookmarks);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookmarks));
    };

    const removeBookmark = async (id: string) => {
        const nextBookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
        setBookmarks(nextBookmarks);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookmarks));
    };

    const getBookmarkForPage = (page: number) => bookmarks.find((bookmark) => bookmark.page === page);
    const isBookmarked = (page: number) => Boolean(getBookmarkForPage(page));

    return {
        bookmarks,
        isLoaded,
        addBookmark,
        removeBookmark,
        getBookmarkForPage,
        isBookmarked,
    };
}
