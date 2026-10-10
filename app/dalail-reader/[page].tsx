import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { getDalailSectionForPage } from "@/data/dalail";
import { useDalailProgress } from "@/hooks/useDalailProgress";
import { useAppearance } from "@/contexts/AppearanceContext";
import {
    getDalailDuaLines,
    getDalailDuas,
    getDalailPartLines,
    type DalailTextLine,
} from "@/services/dalailDatabase";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useSQLiteContext } from "expo-sqlite";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const OPENING_PAGE_END = 86;

type ReaderMode = "arabic" | "translation" | "both";

const READER_MODES: { key: ReaderMode; label: string }[] = [
    { key: "arabic", label: "Arabic" },
    { key: "translation", label: "Translation" },
    { key: "both", label: "Both" },
];

type ReaderContent = {
    title: string;
    subtitle: string;
    lines: DalailTextLine[];
    partNumber?: number;
    isArabicSubtitle?: boolean;
};

function TextLine({ line, isDesktop, fontsLoaded, mode }: { line: DalailTextLine; isDesktop: boolean; fontsLoaded: boolean; mode: ReaderMode }) {
    const { theme: activeTheme } = useAppearance();
    const styles = createStyles(activeTheme);

    return (
        <View style={[styles.lineCard, isDesktop && mode === "both" && styles.desktopLineCard]}>
            {mode !== "translation" && (
                <Text style={[styles.arabicText, fontsLoaded && styles.arabicFont, isDesktop && mode === "both" && styles.desktopArabicText]}>{line.arabic}</Text>
            )}
            {mode !== "arabic" && (
                <Text style={[styles.englishText, isDesktop && mode === "both" && styles.desktopEnglishText]}>{line.english}</Text>
            )}
        </View>
    );
}

export default function DalailTextReaderScreen() {
    const db = useSQLiteContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 1200;
    const { theme: activeTheme } = useAppearance();
    const styles = createStyles(activeTheme);
    const { translateY: tabBarTranslateY, tabBarHeight } = useTabBarVisibility();
    const [fontsLoaded] = useFonts({
        NotoNaskhArabic: require("../../assets/fonts/NotoNaskhArabic.ttf"),
        Amiri: require("../../assets/fonts/Amiri-Regular.ttf"),
    });
    const params = useLocalSearchParams<{ page?: string }>();
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const section = getDalailSectionForPage(page);
    const { saveProgress, markWirdComplete, isWirdCompleteToday } = useDalailProgress();
    const [content, setContent] = useState<ReaderContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<ReaderMode>("both");

    const scrollProgress = useSharedValue(0);
    const scrollHandler = useAnimatedScrollHandler((event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event;
        const maxOffset = contentSize.height - layoutMeasurement.height;
        scrollProgress.value = maxOffset > 0 ? Math.max(0, Math.min(1, contentOffset.y / maxOffset)) : 0;
    });
    const progressFillStyle = useAnimatedStyle(() => ({
        width: `${scrollProgress.value * 100}%`,
    }));

    const isOpening = page <= OPENING_PAGE_END;
    const isComplete = isWirdCompleteToday(section.id);

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
                    if (!cancelled) setContent({ title: opening.title, subtitle: opening.titleArabic, lines, isArabicSubtitle: true });
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

    const closeReader = useCallback(() => router.replace("/dalail" as never), [router]);

    useFocusEffect(
        useCallback(() => {
            tabBarTranslateY.value = withTiming(tabBarHeight + 50, { duration: 200 });
            const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
                closeReader();
                return true;
            });
            return () => {
                subscription.remove();
                tabBarTranslateY.value = withTiming(0, { duration: 200 });
            };
        }, [closeReader, tabBarHeight, tabBarTranslateY])
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={[styles.toolbar, isDesktop && styles.desktopToolbar, { paddingTop: insets.top ? 8 : 16 }]}>
                <Pressable style={styles.iconButton} onPress={closeReader} accessibilityLabel="Close reader">
                    <Ionicons name="chevron-back" size={22} color={activeTheme.colors.text.primary} />
                </Pressable>
                <Pressable style={styles.imageButton} onPress={() => router.push(`/dalail-image/${page}` as never)} accessibilityLabel="Open Urdu pages">
                     <Ionicons name="image-outline" size={17} color={activeTheme.colors.primary.main} />
                    <Text style={styles.imageButtonText}>Urdu</Text>
                </Pressable>
            </View>

            <View style={[styles.modeControlRow, isDesktop && styles.desktopModeControlRow]}>
                <Text style={styles.modeControlLabel}>Mode</Text>
                <View style={styles.modeSelectorRow}>
                    {READER_MODES.map((readMode) => (
                        <Pressable
                            key={readMode.key}
                            style={[styles.modeOption, mode === readMode.key && styles.modeOptionActive]}
                            onPress={() => setMode(readMode.key)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: mode === readMode.key }}
                        >
                            <Text style={[styles.modeOptionText, mode === readMode.key && styles.modeOptionTextActive]}>{readMode.label}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, progressFillStyle]} />
            </View>

            <Animated.ScrollView
                contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
                {isLoading && (
                    <View style={styles.stateCard}>
                         <ActivityIndicator color={activeTheme.colors.primary.main} size="large" />
                        <Text style={styles.stateText}>Preparing the text reader...</Text>
                    </View>
                )}
                {error && <Text style={styles.errorText}>{error}</Text>}
                {!isLoading && !error && content?.lines.map((line) => <TextLine key={`${content.partNumber ?? "dua"}-${line.lineNumber}`} line={line} isDesktop={isDesktop} fontsLoaded={fontsLoaded} mode={mode} />)}

                {!isLoading && !error && content && (
                    <View style={styles.footerCard}>
                        {!isOpening && (
                            <Pressable style={[styles.completeButton, isComplete && styles.completeButtonDone]} onPress={() => markWirdComplete(section.id)}>
                                 <Ionicons name={isComplete ? "checkmark-circle" : "checkmark-circle-outline"} size={18} color={isComplete ? activeTheme.colors.primary.main : activeTheme.colors.semantic.onSuccess} />
                                <Text style={[styles.completeButtonText, isComplete && styles.completeButtonDoneText]}>
                                    {isComplete ? "Wird Complete" : "Mark Wird Complete"}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </Animated.ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    toolbar: { minHeight: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    desktopToolbar: { width: "100%", maxWidth: 1120, alignSelf: "center", paddingHorizontal: 32 },
    iconButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.colors.semantic.whiteControl },
    imageButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: theme.colors.semantic.whiteControl },
    imageButtonText: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "800" },
    content: { padding: 16, paddingBottom: 48, gap: 12 },
    desktopContent: { width: "100%", maxWidth: 1120, alignSelf: "center", paddingHorizontal: 32, paddingBottom: 64, gap: 16 },
    progressTrack: { height: 3, backgroundColor: theme.colors.semantic.whiteControl, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: theme.colors.primary.main },
    modeControlRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 4 },
    desktopModeControlRow: { alignSelf: "center", width: "100%", maxWidth: 1120, paddingHorizontal: 32 },
    modeControlLabel: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
    modeSelectorRow: { flex: 1, flexDirection: "row", padding: 3, borderRadius: 14, backgroundColor: theme.colors.semantic.whiteControl, borderWidth: 1, borderColor: theme.colors.border.subtle },
    modeOption: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 11 },
    modeOptionActive: { backgroundColor: theme.colors.surface.elevated },
    modeOptionText: { color: theme.colors.text.secondary, fontSize: 13, fontWeight: "700" },
    modeOptionTextActive: { color: theme.colors.primary.main, fontWeight: "900" },
    lineCard: { padding: 18, borderRadius: 20, backgroundColor: theme.colors.background.secondary, borderWidth: 1, borderColor: theme.colors.border.subtle, gap: 14 },
    desktopLineCard: { flexDirection: "row-reverse", alignItems: "stretch", padding: 0, gap: 0, overflow: "hidden" },
    arabicText: { color: theme.colors.text.primary, fontSize: 24, lineHeight: 43, textAlign: "right", writingDirection: "rtl" },
    arabicFont: { fontFamily: "NotoNaskhArabic" },
    desktopArabicText: { flex: 1, padding: 24, maxWidth: "50%", borderLeftWidth: 1, borderLeftColor: theme.colors.border.subtle },
    englishText: { color: theme.colors.text.secondary, fontSize: 16, lineHeight: 25 },
    desktopEnglishText: { flex: 1, padding: 24, alignSelf: "flex-start", maxWidth: "50%" },
    stateCard: { paddingVertical: 60, alignItems: "center", gap: 14 },
    stateText: { color: theme.colors.text.secondary, fontSize: 14 },
    errorText: { color: theme.colors.semantic.error, padding: 20, textAlign: "center" },
    footerCard: { alignItems: "center", gap: 12, padding: 20 },
    completeButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.primary.main },
    completeButtonDone: { backgroundColor: theme.colors.semantic.successSurface, borderWidth: 1, borderColor: theme.colors.semantic.successBorderStrong },
    completeButtonText: { color: theme.colors.semantic.onSuccess, fontSize: 14, fontWeight: "900" },
    completeButtonDoneText: { color: theme.colors.primary.main },
});
}
