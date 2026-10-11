import { SimpleHeader } from "@/components/SimpleHeader";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { BookEntry, getBook, getBookEntries, searchBookEntries } from "@/services/booksDatabase";
import { getBookBookmarks, getBooksProgress } from "@/services/booksProgress";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const HEADER_HEIGHT = 60;

export default function BookContentsScreen() {
    const db = useSQLiteContext();
    const router = useRouter();
    const params = useLocalSearchParams<{ bookId?: string }>();
    const bookId = Number(params.bookId ?? 0);
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 1200;
    const { theme } = useAppearance();
    const styles = createStyles(theme);
    const { tabBarHeight } = useTabBarVisibility();
    const headerTranslateY = useSharedValue(0);
    const [book, setBook] = useState<Awaited<ReturnType<typeof getBook>>>(null);
    const [entries, setEntries] = useState<BookEntry[]>([]);
    const [savedEntries, setSavedEntries] = useState<BookEntry[]>([]);
    const [lastEntryId, setLastEntryId] = useState<number | null>(null);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBook = useCallback(async () => {
        if (!Number.isInteger(bookId) || bookId <= 0) {
            setError("This book could not be found.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [bookRecord, rootEntries, bookmarks, progress] = await Promise.all([
                getBook(db, bookId),
                getBookEntries(db, bookId),
                getBookBookmarks(),
                getBooksProgress(),
            ]);
            if (!bookRecord) throw new Error("This book is not available.");
            setBook(bookRecord);
            setEntries(rootEntries);
            setLastEntryId(progress[String(bookId)]?.entryId ?? null);
            const savedIds = bookmarks.filter((item) => item.bookId === bookId).map((item) => item.entryId);
            setSavedEntries(rootEntries.filter((entry) => savedIds.includes(entry.id)));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to open this book.");
        } finally {
            setLoading(false);
        }
    }, [bookId, db]);

    useFocusEffect(useCallback(() => {
        headerTranslateY.value = 0;
        void loadBook();
    }, [headerTranslateY, loadBook]));

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const result = await searchBookEntries(db, bookId, query);
                if (!cancelled) setEntries(result);
            } catch (searchError) {
                if (!cancelled) setError(searchError instanceof Error ? searchError.message : "Search is unavailable.");
            }
        }, 160);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [bookId, db, query]);

    const openEntry = (entry: BookEntry) => router.push(`/books/${bookId}/${entry.id}` as never);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView
                contentContainerStyle={[styles.content, isDesktop && styles.desktopContent, { paddingTop: HEADER_HEIGHT + 16, paddingBottom: tabBarHeight + 48 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Pressable style={styles.backLink} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={17} color={theme.colors.primary.main} />
                    <Text style={styles.backText}>Library</Text>
                </Pressable>

                {loading && (
                    <View style={styles.stateCard}><ActivityIndicator size="large" color={theme.colors.primary.main} /><Text style={styles.mutedText}>Loading book...</Text></View>
                )}
                {!loading && error && (
                    <View style={styles.stateCard}>
                        <Ionicons name="alert-circle-outline" size={28} color={theme.colors.semantic.error} />
                        <Text style={styles.stateTitle}>Unable to open book</Text>
                        <Text style={styles.mutedText}>{error}</Text>
                    </View>
                )}
                {!loading && !error && book && (
                    <>
                        <View style={styles.bookHero}>
                            <View style={styles.heroIcon}><Ionicons name="book" size={26} color={theme.colors.primary.main} /></View>
                            <View style={styles.heroText}>
                                <Text style={styles.eyebrow}>{book.languageCode.toUpperCase()} · {book.contentType.toUpperCase()}</Text>
                                <Text style={styles.title}>{book.title}</Text>
                                {book.author ? <Text style={styles.author}>by {book.author}</Text> : null}
                                {book.description ? <Text style={styles.description}>{book.description}</Text> : null}
                                <Text style={styles.countText}>{book.entryCount} {book.entryCount === 1 ? "story" : "stories"}</Text>
                            </View>
                        </View>

                        {lastEntryId !== null && (
                            <Pressable style={styles.continueButton} onPress={() => router.push(`/books/${bookId}/${lastEntryId}` as never)}>
                                <View style={styles.continueIcon}><Ionicons name="play" size={15} color={theme.colors.semantic.onSuccess} /></View>
                                <View style={styles.continueCopy}>
                                    <Text style={styles.continueCaption}>PICK UP WHERE YOU LEFT OFF</Text>
                                    <Text style={styles.continueTitle}>Continue reading</Text>
                                </View>
                                <Ionicons name="arrow-forward" size={18} color={theme.colors.primary.main} />
                            </Pressable>
                        )}

                        {savedEntries.length > 0 && (
                            <View style={styles.savedSection}>
                                <View style={styles.sectionHeading}>
                                    <Ionicons name="bookmark" size={16} color={theme.colors.primary.main} />
                                    <Text style={styles.sectionTitle}>Saved stories</Text>
                                    <Text style={styles.sectionCount}>{savedEntries.length}</Text>
                                </View>
                                {savedEntries.map((entry) => (
                                    <EntryRow key={`saved-${entry.id}`} entry={entry} onPress={() => openEntry(entry)} styles={styles} theme={theme} saved />
                                ))}
                            </View>
                        )}

                        <View style={styles.sectionHeading}>
                            <Text style={styles.sectionTitle}>Contents</Text>
                            <Text style={styles.sectionCount}>{entries.length}</Text>
                        </View>
                        <View style={styles.searchBox}>
                            <Ionicons name="search-outline" size={18} color={theme.colors.text.tertiary} />
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search stories"
                                placeholderTextColor={theme.colors.text.tertiary}
                                style={styles.searchInput}
                                accessibilityLabel="Search stories in this book"
                            />
                            {query.length > 0 && <Pressable onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={theme.colors.text.tertiary} /></Pressable>}
                        </View>

                        {entries.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Ionicons name="search-outline" size={25} color={theme.colors.text.tertiary} />
                                <Text style={styles.mutedText}>{query ? "No stories match your search." : "No published entries yet."}</Text>
                            </View>
                        ) : entries.map((entry) => (
                            <EntryRow
                                key={entry.id}
                                entry={entry}
                                onPress={() => openEntry(entry)}
                                styles={styles}
                                theme={theme}
                                saved={savedEntries.some((saved) => saved.id === entry.id)}
                                continueReading={entry.id === lastEntryId}
                            />
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function EntryRow({
    entry,
    onPress,
    styles,
    theme,
    saved = false,
    continueReading = false,
}: {
    entry: BookEntry;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
    theme: ReturnType<typeof import("@/constants/theme").createTheme>;
    saved?: boolean;
    continueReading?: boolean;
}) {
    return (
        <Pressable style={({ pressed }) => [styles.entryCard, pressed && styles.entryPressed]} onPress={onPress}>
            <View style={styles.entryNumber}><Text style={styles.entryNumberText}>{String(entry.position).padStart(2, "0")}</Text></View>
            <View style={styles.entryCopy}>
                <View style={styles.entryTitleLine}>
                    <Text style={styles.entryTitle} numberOfLines={2}>{entry.title}</Text>
                    {saved && <Ionicons name="bookmark" size={14} color={theme.colors.primary.main} />}
                </View>
                {entry.summary ? <Text style={styles.entrySummary} numberOfLines={2}>{entry.summary}</Text> : null}
                <View style={styles.entryMeta}>
                    {entry.childCount > 0 ? <Text style={styles.entryMetaText}>{entry.childCount} sections</Text> : entry.wordCount ? <Text style={styles.entryMetaText}>{Math.max(1, Math.ceil(entry.wordCount / 200))} min read</Text> : null}
                    {continueReading && <Text style={styles.resumeBadge}>CONTINUE</Text>}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.text.tertiary} />
        </Pressable>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background.primary },
        content: { flexGrow: 1, paddingHorizontal: 18, gap: 13 },
        desktopContent: { width: "100%", maxWidth: 1060, alignSelf: "center", paddingHorizontal: 32 },
        backLink: { alignSelf: "flex-start", minHeight: 34, flexDirection: "row", alignItems: "center", gap: 3, paddingRight: 10 },
        backText: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "800" },
        bookHero: { flexDirection: "row", gap: 15, padding: 20, borderRadius: 22, backgroundColor: theme.colors.accentSurface, borderWidth: 1, borderColor: theme.colors.accentBorder },
        heroIcon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: theme.colors.surface.primary },
        heroText: { flex: 1, minWidth: 0, gap: 6 },
        eyebrow: { color: theme.colors.primary.main, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
        title: { color: theme.colors.text.primary, fontSize: 25, lineHeight: 31, fontWeight: "900" },
        author: { color: theme.colors.text.secondary, fontSize: 13, fontWeight: "600" },
        description: { color: theme.colors.text.secondary, fontSize: 13, lineHeight: 20 },
        countText: { color: theme.colors.primary.main, fontSize: 12, fontWeight: "800", marginTop: 3 },
        continueButton: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15, borderRadius: 17, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.accentBorder },
        continueIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary.main },
        continueCopy: { flex: 1, gap: 3 },
        continueCaption: { color: theme.colors.text.tertiary, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
        continueTitle: { color: theme.colors.text.primary, fontSize: 14, fontWeight: "800" },
        savedSection: { gap: 9, padding: 13, borderRadius: 18, backgroundColor: theme.colors.surface.secondary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        sectionHeading: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 },
        sectionTitle: { flex: 1, color: theme.colors.text.primary, fontSize: 17, fontWeight: "900" },
        sectionCount: { minWidth: 25, height: 25, textAlign: "center", textAlignVertical: "center", overflow: "hidden", paddingHorizontal: 6, borderRadius: 12, backgroundColor: theme.colors.surface.primary, color: theme.colors.text.secondary, fontSize: 11, fontWeight: "800" },
        searchBox: { minHeight: 45, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, borderRadius: 14, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        searchInput: { flex: 1, minWidth: 0, paddingVertical: 9, color: theme.colors.text.primary, fontSize: 13 },
        entryCard: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 17, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        entryPressed: { opacity: 0.8 },
        entryNumber: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: theme.colors.accentSurface },
        entryNumberText: { color: theme.colors.primary.main, fontSize: 12, fontWeight: "900" },
        entryCopy: { flex: 1, minWidth: 0, gap: 4 },
        entryTitleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
        entryTitle: { flex: 1, color: theme.colors.text.primary, fontSize: 14, lineHeight: 19, fontWeight: "800" },
        entrySummary: { color: theme.colors.text.secondary, fontSize: 11, lineHeight: 16 },
        entryMeta: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 15 },
        entryMetaText: { color: theme.colors.text.tertiary, fontSize: 10, fontWeight: "700" },
        resumeBadge: { color: theme.colors.primary.main, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
        emptyCard: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 8, padding: 20, borderRadius: 17, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        stateCard: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10, padding: 24, borderRadius: 20, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        stateTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "800" },
        mutedText: { color: theme.colors.text.secondary, fontSize: 13, lineHeight: 19, textAlign: "center" },
    });
}
