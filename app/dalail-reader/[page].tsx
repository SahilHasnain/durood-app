import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { getDalailSectionForPage, DALAIL_TITLE } from "@/data/dalail";
import { useDalailBookmarks } from "@/hooks/useDalailBookmarks";
import { useDalailProgress } from "@/hooks/useDalailProgress";
import {
    getDalailDuaLines,
    getDalailDuas,
    getDalailPartLines,
    type DalailTextLine,
} from "@/services/dalailDatabase";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const OPENING_PAGE_END = 86;

type ReaderContent = {
    title: string;
    subtitle: string;
    lines: DalailTextLine[];
    partNumber?: number;
};

function TextLine({ line, isDesktop }: { line: DalailTextLine; isDesktop: boolean }) {
    return (
        <View style={[styles.lineCard, isDesktop && styles.desktopLineCard]}>
            <Text style={[styles.arabicText, isDesktop && styles.desktopArabicText]}>{line.arabic}</Text>
            <Text style={[styles.englishText, isDesktop && styles.desktopEnglishText]}>{line.english}</Text>
        </View>
    );
}

export default function DalailTextReaderScreen() {
    const db = useSQLiteContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 1200;
    const headerTranslateY = useSharedValue(0);
    const params = useLocalSearchParams<{ page?: string }>();
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const section = getDalailSectionForPage(page);
    const { saveProgress, markWirdComplete, isWirdCompleteToday } = useDalailProgress();
    const { isBookmarked, getBookmarkForPage, addBookmark, removeBookmark } = useDalailBookmarks();
    const [content, setContent] = useState<ReaderContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isOpening = page <= OPENING_PAGE_END;
    const currentBookmarked = isBookmarked(page);
    const isComplete = isWirdCompleteToday(section.id);
    const pageLabel = isOpening ? "Opening" : `${section.title} · Part ${section.cycleDay}`;

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        async function load() {
            try {
                if (isOpening) {
                    const duas = await getDalailDuas(db);
                    const opening = duas.find((dua) => dua.name === "opening") ?? duas[0];
                    if (!opening) throw new Error("Opening text is unavailable");
                    const lines = await getDalailDuaLines(db, opening.id);
                    if (!cancelled) setContent({ title: opening.title, subtitle: opening.titleArabic, lines });
                } else {
                    const partNumber = section.cycleDay ?? 1;
                    const lines = await getDalailPartLines(db, partNumber);
                    if (!cancelled) {
                        setContent({
                            title: section.title,
                            subtitle: `Part ${partNumber} · Arabic and English`,
                            lines,
                            partNumber,
                        });
                    }
                }
            } catch (loadError) {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to open Dalail text");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void load();
        void saveProgress(page);
        return () => {
            cancelled = true;
        };
    }, [db, isOpening, page, saveProgress, section.cycleDay, section.title]);

    const progressLabel = useMemo(() => {
        if (!content) return "";
        return `${content.lines.length} lines`;
    }, [content]);

    const toggleBookmark = async () => {
        if (currentBookmarked) {
            const bookmark = getBookmarkForPage(page);
            if (bookmark) await removeBookmark(bookmark.id);
        } else {
            await addBookmark(page, pageLabel);
        }
    };

    const closeReader = () => router.replace("/dalail" as never);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <View style={[styles.toolbar, isDesktop && styles.desktopToolbar, { paddingTop: insets.top ? 8 : 16 }]}>
                <Pressable style={styles.iconButton} onPress={closeReader} accessibilityLabel="Close reader">
                    <Ionicons name="chevron-back" size={22} color={theme.colors.text.primary} />
                </Pressable>
                <View style={styles.toolbarTitle}>
                    <Text style={styles.readerTitle}>{DALAIL_TITLE}</Text>
                    <Text style={styles.readerMeta} numberOfLines={1}>{pageLabel}</Text>
                </View>
                <Pressable style={styles.iconButton} onPress={toggleBookmark} accessibilityLabel="Bookmark this reading">
                    <Ionicons name={currentBookmarked ? "bookmark" : "bookmark-outline"} size={21} color={theme.colors.primary.main} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]} showsVerticalScrollIndicator={false}>
                <View style={styles.modeRow}>
                    <View>
                        <Text style={styles.eyebrow}>Text reader</Text>
                        <Text style={styles.title}>{content?.title ?? pageLabel}</Text>
                        <Text style={styles.subtitle}>{content?.subtitle ?? "Arabic with English translation"}</Text>
                    </View>
                    <Pressable style={styles.imageButton} onPress={() => router.push(`/dalail-image/${page}` as never)}>
                        <Ionicons name="image-outline" size={17} color={theme.colors.primary.main} />
                        <Text style={styles.imageButtonText}>Images</Text>
                    </Pressable>
                </View>

                {isLoading && (
                    <View style={styles.stateCard}>
                        <ActivityIndicator color={theme.colors.primary.main} size="large" />
                        <Text style={styles.stateText}>Preparing the text reader...</Text>
                    </View>
                )}
                {error && <Text style={styles.errorText}>{error}</Text>}
                {!isLoading && !error && content?.lines.map((line) => <TextLine key={`${content.partNumber ?? "dua"}-${line.lineNumber}`} line={line} isDesktop={isDesktop} />)}

                {!isLoading && !error && content && (
                    <View style={styles.footerCard}>
                        <Text style={styles.footerText}>{progressLabel}</Text>
                        {!isOpening && (
                            <Pressable style={[styles.completeButton, isComplete && styles.completeButtonDone]} onPress={() => markWirdComplete(section.id)}>
                                <Ionicons name={isComplete ? "checkmark-circle" : "checkmark-circle-outline"} size={18} color={isComplete ? theme.colors.primary.main : theme.colors.semantic.onSuccess} />
                                <Text style={[styles.completeButtonText, isComplete && styles.completeButtonDoneText]}>
                                    {isComplete ? "Wird Complete" : "Mark Wird Complete"}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    toolbar: { minHeight: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 },
    desktopToolbar: { width: "100%", maxWidth: 1120, alignSelf: "center", paddingHorizontal: 32 },
    iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.colors.semantic.whiteControl },
    toolbarTitle: { flex: 1 },
    readerTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "900" },
    readerMeta: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 2 },
    content: { padding: 16, paddingBottom: 48, gap: 12 },
    desktopContent: { width: "100%", maxWidth: 1120, alignSelf: "center", paddingHorizontal: 32, paddingBottom: 64, gap: 16 },
    modeRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: 20, borderRadius: 24, backgroundColor: theme.colors.semantic.successSurface, borderWidth: 1, borderColor: theme.colors.semantic.successBorderStrong },
    eyebrow: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
    title: { color: theme.colors.text.primary, fontSize: 26, fontWeight: "900", marginTop: 8 },
    subtitle: { color: theme.colors.text.secondary, fontSize: 13, marginTop: 5 },
    imageButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: theme.colors.semantic.whiteControl },
    imageButtonText: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "800" },
    lineCard: { padding: 18, borderRadius: 20, backgroundColor: theme.colors.background.secondary, borderWidth: 1, borderColor: theme.colors.border.subtle, gap: 14 },
    desktopLineCard: { flexDirection: "row-reverse", alignItems: "stretch", padding: 0, gap: 0, overflow: "hidden" },
    arabicText: { color: theme.colors.text.primary, fontSize: 24, lineHeight: 43, textAlign: "right", writingDirection: "rtl" },
    desktopArabicText: { flex: 1, padding: 24, maxWidth: "50%", borderLeftWidth: 1, borderLeftColor: theme.colors.border.subtle },
    englishText: { color: theme.colors.text.secondary, fontSize: 16, lineHeight: 25 },
    desktopEnglishText: { flex: 1, padding: 24, alignSelf: "center", maxWidth: "50%" },
    stateCard: { paddingVertical: 60, alignItems: "center", gap: 14 },
    stateText: { color: theme.colors.text.secondary, fontSize: 14 },
    errorText: { color: theme.colors.semantic.error, padding: 20, textAlign: "center" },
    footerCard: { alignItems: "center", gap: 12, padding: 20 },
    footerText: { color: theme.colors.text.secondary, fontSize: 13 },
    completeButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.primary.main },
    completeButtonDone: { backgroundColor: theme.colors.semantic.successSurface, borderWidth: 1, borderColor: theme.colors.semantic.successBorderStrong },
    completeButtonText: { color: theme.colors.semantic.onSuccess, fontSize: 14, fontWeight: "900" },
    completeButtonDoneText: { color: theme.colors.primary.main },
});
