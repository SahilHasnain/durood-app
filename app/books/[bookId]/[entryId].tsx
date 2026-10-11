import { useAppearance } from "@/contexts/AppearanceContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { BookEntry, getBook, getBookEntries, getBookEntry, getBookEntryText, type BookTextBlock } from "@/services/booksDatabase";
import { isBookEntryBookmarked, saveBookProgress, toggleBookBookmark } from "@/services/booksProgress";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type ReaderData = {
    book: NonNullable<Awaited<ReturnType<typeof getBook>>>;
    entry: BookEntry;
    children: BookEntry[];
    siblings: BookEntry[];
    blocks: BookTextBlock[];
};

export default function BookEntryScreen() {
    const db = useSQLiteContext();
    const router = useRouter();
    const params = useLocalSearchParams<{ bookId?: string; entryId?: string }>();
    const bookId = Number(params.bookId ?? 0);
    const entryId = Number(params.entryId ?? 0);
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 1200;
    const { theme } = useAppearance();
    const styles = createStyles(theme);
    const { translateY: tabBarTranslateY, tabBarHeight } = useTabBarVisibility();
    const [data, setData] = useState<ReaderData | null>(null);
    const [bookmarked, setBookmarked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollProgress = useSharedValue(0);
    const progressFillStyle = useAnimatedStyle(() => ({ width: `${scrollProgress.value * 100}%` }));
    const scrollHandler = useAnimatedScrollHandler((event) => {
        const maxOffset = event.contentSize.height - event.layoutMeasurement.height;
        scrollProgress.value = maxOffset > 0 ? Math.max(0, Math.min(1, event.contentOffset.y / maxOffset)) : 0;
    });

    const loadEntry = useCallback(async () => {
        if (!Number.isInteger(bookId) || bookId <= 0 || !Number.isInteger(entryId) || entryId <= 0) {
            setError("This reading selection is unavailable.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [book, entry, bookmarkedNow] = await Promise.all([
                getBook(db, bookId),
                getBookEntry(db, bookId, entryId),
                isBookEntryBookmarked(bookId, entryId),
            ]);
            if (!book || !entry) throw new Error("This story is not available.");
            const [children, siblings, translatedBlocks] = await Promise.all([
                getBookEntries(db, bookId, entry.id),
                getBookEntries(db, bookId, entry.parentEntryId),
                getBookEntryText(db, entry.id, book.languageCode),
            ]);
            const blocks = translatedBlocks.length || book.languageCode === "en"
                ? translatedBlocks
                : await getBookEntryText(db, entry.id, "en");
            await saveBookProgress(bookId, entryId);
            setData({ book, entry, children, siblings, blocks });
            setBookmarked(bookmarkedNow);
            scrollProgress.value = 0;
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to open this story.");
        } finally {
            setLoading(false);
        }
    }, [bookId, db, entryId, scrollProgress]);

    useFocusEffect(useCallback(() => {
        tabBarTranslateY.value = withTiming(tabBarHeight + 50, { duration: 180 });
        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            router.back();
            return true;
        });
        void loadEntry();
        return () => {
            subscription.remove();
            tabBarTranslateY.value = withTiming(0, { duration: 180 });
        };
    }, [loadEntry, router, tabBarHeight, tabBarTranslateY]));

    const siblingIndex = useMemo(
        () => data?.siblings.findIndex((item) => item.id === entryId) ?? -1,
        [data?.siblings, entryId],
    );
    const previousEntry = siblingIndex > 0 ? data?.siblings[siblingIndex - 1] : undefined;
    const nextEntry = siblingIndex >= 0 ? data?.siblings[siblingIndex + 1] : undefined;
    const progressPercent = data && siblingIndex >= 0 && data.siblings.length
        ? Math.round(((siblingIndex + 1) / data.siblings.length) * 100)
        : 0;

    const changeBookmark = async () => {
        const next = await toggleBookBookmark(bookId, entryId);
        setBookmarked(next);
    };

    const goToEntry = (entry: BookEntry) => router.replace(`/books/${bookId}/${entry.id}` as never);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={[styles.toolbar, isDesktop && styles.desktopToolbar, { paddingTop: insets.top ? 6 : 12 }]}>
                <Pressable style={styles.iconButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to book">
                    <Ionicons name="chevron-back" size={22} color={theme.colors.text.primary} />
                </Pressable>
                <Text style={styles.toolbarBookTitle} numberOfLines={1}>{data?.book.title ?? "Book"}</Text>
                <Pressable style={[styles.iconButton, bookmarked && styles.bookmarkActive]} onPress={() => void changeBookmark()} accessibilityRole="button" accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark story"}>
                    <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={19} color={bookmarked ? theme.colors.primary.main : theme.colors.text.primary} />
                </Pressable>
            </View>
            <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, progressFillStyle]} /></View>

            {loading && <View style={styles.stateCard}><ActivityIndicator size="large" color={theme.colors.primary.main} /><Text style={styles.mutedText}>Preparing your reading...</Text></View>}
            {!loading && error && (
                <View style={styles.stateCard}>
                    <Ionicons name="alert-circle-outline" size={29} color={theme.colors.semantic.error} />
                    <Text style={styles.stateTitle}>Unable to open this story</Text>
                    <Text style={styles.mutedText}>{error}</Text>
                    <Pressable style={styles.retryButton} onPress={() => void loadEntry()}><Text style={styles.retryText}>Try again</Text></Pressable>
                </View>
            )}
            {!loading && !error && data && (
                <Animated.ScrollView
                    contentContainerStyle={[styles.content, isDesktop && styles.desktopContent, { paddingBottom: 44 }]}
                    showsVerticalScrollIndicator={false}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                >
                    <View style={styles.articleHeader}>
                        <Text style={styles.articleEyebrow}>{data.entry.entryType.toUpperCase()} {siblingIndex >= 0 ? `· ${siblingIndex + 1} OF ${data.siblings.length}` : ""}</Text>
                        <Text style={styles.articleTitle}>{data.entry.title}</Text>
                        {data.entry.summary ? <Text style={styles.articleSummary}>{data.entry.summary}</Text> : null}
                        {data.entry.wordCount ? (
                            <View style={styles.readTime}><Ionicons name="time-outline" size={14} color={theme.colors.text.tertiary} /><Text style={styles.readTimeText}>{Math.max(1, Math.ceil(data.entry.wordCount / 200))} min read</Text></View>
                        ) : null}
                    </View>

                    {data.children.length > 0 ? (
                        <View style={styles.contentsCard}>
                            <Text style={styles.contentsTitle}>In this section</Text>
                            {data.children.map((child) => (
                                <Pressable key={child.id} style={styles.childRow} onPress={() => goToEntry(child)}>
                                    <Text style={styles.childPosition}>{String(child.position).padStart(2, "0")}</Text>
                                    <Text style={styles.childTitle}>{child.title}</Text>
                                    <Ionicons name="chevron-forward" size={17} color={theme.colors.text.tertiary} />
                                </Pressable>
                            ))}
                        </View>
                    ) : data.blocks.length > 0 ? (
                        <View style={styles.articleBody}>
                            {data.blocks.map((block) => (
                                <Text key={`${block.lineNumber}-${block.role}`} style={block.role === "heading" ? styles.bodyHeading : styles.bodyParagraph}>
                                    {cleanMarkdown(block.text)}
                                </Text>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.stateCard}><Text style={styles.mutedText}>Text for this entry is not available in this language yet.</Text></View>
                    )}

                    <View style={styles.readerFooter}>
                        <Text style={styles.footerProgress}>{siblingIndex >= 0 ? `${siblingIndex + 1} of ${data.siblings.length} · ${progressPercent}%` : "Keep reading at your own pace"}</Text>
                        <View style={styles.navigationRow}>
                            <Pressable
                                style={[styles.navButton, !previousEntry && styles.navButtonDisabled]}
                                disabled={!previousEntry}
                                onPress={() => previousEntry && goToEntry(previousEntry)}
                            >
                                <Ionicons name="arrow-back" size={16} color={previousEntry ? theme.colors.primary.main : theme.colors.text.tertiary} />
                                <Text style={[styles.navButtonText, !previousEntry && styles.navButtonTextDisabled]}>Previous</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.navButton, styles.nextButton, !nextEntry && styles.navButtonDisabled]}
                                disabled={!nextEntry}
                                onPress={() => nextEntry && goToEntry(nextEntry)}
                            >
                                <Text style={[styles.navButtonText, !nextEntry && styles.navButtonTextDisabled]}>Next</Text>
                                <Ionicons name="arrow-forward" size={16} color={nextEntry ? theme.colors.primary.main : theme.colors.text.tertiary} />
                            </Pressable>
                        </View>
                    </View>
                </Animated.ScrollView>
            )}
        </SafeAreaView>
    );
}

function cleanMarkdown(value: string): string {
    return value
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim();
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background.primary },
        toolbar: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
        desktopToolbar: { width: "100%", maxWidth: 900, alignSelf: "center", paddingHorizontal: 32 },
        iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.colors.surface.control },
        bookmarkActive: { backgroundColor: theme.colors.accentSurface, borderWidth: 1, borderColor: theme.colors.accentBorder },
        toolbarBookTitle: { flex: 1, color: theme.colors.text.secondary, fontSize: 13, fontWeight: "700", textAlign: "center" },
        progressTrack: { height: 3, backgroundColor: theme.colors.surface.control, overflow: "hidden" },
        progressFill: { height: "100%", backgroundColor: theme.colors.primary.main },
        content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, gap: 20 },
        desktopContent: { width: "100%", maxWidth: 820, alignSelf: "center", paddingHorizontal: 32, paddingTop: 34, gap: 25 },
        articleHeader: { gap: 11, paddingBottom: 17, borderBottomWidth: 1, borderBottomColor: theme.colors.border.subtle },
        articleEyebrow: { color: theme.colors.primary.main, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
        articleTitle: { color: theme.colors.text.primary, fontSize: 30, lineHeight: 38, fontWeight: "900" },
        articleSummary: { color: theme.colors.text.secondary, fontSize: 15, lineHeight: 24 },
        readTime: { flexDirection: "row", alignItems: "center", gap: 5 },
        readTimeText: { color: theme.colors.text.tertiary, fontSize: 11, fontWeight: "700" },
        articleBody: { gap: 17 },
        bodyParagraph: { color: theme.colors.text.primary, fontSize: 17, lineHeight: 29 },
        bodyHeading: { color: theme.colors.primary.main, fontSize: 18, lineHeight: 26, fontWeight: "800", marginTop: 5 },
        contentsCard: { padding: 15, borderRadius: 18, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle, gap: 4 },
        contentsTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "900", marginBottom: 6 },
        childRow: { minHeight: 47, flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: theme.colors.border.subtle },
        childPosition: { color: theme.colors.primary.main, fontSize: 11, fontWeight: "900" },
        childTitle: { flex: 1, color: theme.colors.text.primary, fontSize: 13, fontWeight: "700" },
        readerFooter: { gap: 11, marginTop: 8 },
        footerProgress: { color: theme.colors.text.tertiary, fontSize: 11, fontWeight: "700", textAlign: "center" },
        navigationRow: { flexDirection: "row", gap: 10 },
        navButton: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.colors.accentSurface, borderWidth: 1, borderColor: theme.colors.accentBorder },
        nextButton: { backgroundColor: theme.colors.primary.main, borderColor: theme.colors.primary.main },
        navButtonDisabled: { opacity: 0.55, backgroundColor: theme.colors.surface.secondary, borderColor: theme.colors.border.subtle },
        navButtonText: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "800" },
        navButtonTextDisabled: { color: theme.colors.text.tertiary },
        stateCard: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
        stateTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "800" },
        mutedText: { color: theme.colors.text.secondary, fontSize: 13, lineHeight: 20, textAlign: "center" },
        retryButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11, backgroundColor: theme.colors.primary.main },
        retryText: { color: theme.colors.semantic.onSuccess, fontSize: 13, fontWeight: "800" },
    });
}
