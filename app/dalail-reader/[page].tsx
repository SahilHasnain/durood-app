import { DalailZoomableImage } from "@/components/DalailZoomableImage";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import {
    DALAIL_ASSET_MANIFEST,
    DALAIL_TITLE,
    clampDalailPage,
    getDalailSectionForPage,
} from "@/data/dalail";
import { useDalailBookmarks } from "@/hooks/useDalailBookmarks";
import { useDalailProgress } from "@/hooks/useDalailProgress";
import { useResolvedDalailPage } from "@/hooks/useResolvedDalailPage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type ViewToken,
} from "react-native";
import { withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = IMAGE_WIDTH / 0.68;

function DalailReaderPage({
    page,
    onZoomChange,
    headerOffset,
}: {
    page: number;
    onZoomChange: (isZoomed: boolean) => void;
    headerOffset: number;
}) {
    const { asset, isLoading } = useResolvedDalailPage(page);
    const [hasLoadError, setHasLoadError] = useState(false);

    useEffect(() => {
        setHasLoadError(false);
    }, [asset?.uri, page]);

    if (asset?.source && !hasLoadError) {
        return (
            <View style={[styles.pageSurface, { paddingTop: headerOffset }]}> 
                <DalailZoomableImage
                    source={asset.source}
                    width={IMAGE_WIDTH}
                    height={IMAGE_HEIGHT}
                    onZoomChange={onZoomChange}
                    onError={() => setHasLoadError(true)}
                />
            </View>
        );
    }

    return (
        <View style={[styles.pageFallback, { paddingTop: headerOffset }]}> 
            {isLoading ? <ActivityIndicator color="#10b981" size="large" /> : null}
            <Text style={styles.fallbackTitle}>{isLoading ? "Opening Dalail page..." : `Page ${page} not ready yet`}</Text>
            <Text style={styles.fallbackText}>
                {isLoading
                    ? "The reader is fetching the page image."
                    : "The reader is ready; this page will appear after the Dalail image assets finish uploading."}
            </Text>
        </View>
    );
}

export default function DalailReaderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ page?: string }>();
    const insets = useSafeAreaInsets();
    const { translateY: tabBarTranslateY, tabBarHeight } = useTabBarVisibility();
    const initialPage = clampDalailPage(Number(params.page ?? 1) || 1);
    const pages = useRef(Array.from({ length: DALAIL_ASSET_MANIFEST.totalPages }, (_, index) => index + 1)).current;
    const flatListRef = useRef<FlatList<number>>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { saveProgress, markWirdComplete, isWirdCompleteToday } = useDalailProgress();
    const { isBookmarked, getBookmarkForPage, addBookmark, removeBookmark } = useDalailBookmarks();

    const [currentPage, setCurrentPage] = useState(initialPage);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isJumpVisible, setIsJumpVisible] = useState(false);
    const [pageInput, setPageInput] = useState(String(initialPage));
    const [completeMessage, setCompleteMessage] = useState<string | null>(null);

    const currentSection = getDalailSectionForPage(currentPage);
    const pageInSection = currentPage - currentSection.startPage + 1;
    const sectionPages = currentSection.endPage - currentSection.startPage + 1;
    const currentBookmarked = isBookmarked(currentPage);
    const currentWirdComplete = isWirdCompleteToday(currentSection.id);
    const bookProgress = (currentPage / DALAIL_ASSET_MANIFEST.totalPages) * 100;
    const headerOffset = insets.top + 60;

    useEffect(() => {
        tabBarTranslateY.value = withTiming(tabBarHeight + 50, { duration: 200 });
        return () => {
            tabBarTranslateY.value = withTiming(0, { duration: 200 });
        };
    }, [tabBarHeight, tabBarTranslateY]);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            void saveProgress(currentPage);
        }, 250);

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [currentPage, saveProgress]);

    const moveToPage = useCallback((page: number, animated = true) => {
        const safePage = clampDalailPage(page);
        setCurrentPage(safePage);
        setPageInput(String(safePage));
        flatListRef.current?.scrollToIndex({ index: safePage - 1, animated });
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const page = viewableItems[0]?.item;
        if (typeof page === "number") {
            setCurrentPage(page);
            setPageInput(String(page));
        }
    }).current;

    const toggleBookmark = async () => {
        if (currentBookmarked) {
            const bookmark = getBookmarkForPage(currentPage);
            if (bookmark) await removeBookmark(bookmark.id);
        } else {
            await addBookmark(currentPage, currentSection.title);
        }
    };

    const submitJump = () => {
        moveToPage(Number(pageInput) || currentPage);
        setIsJumpVisible(false);
    };

    const completeCurrentWird = async () => {
        await markWirdComplete(currentSection.id);
        setCompleteMessage(`${currentSection.title} marked complete`);
        setTimeout(() => setCompleteMessage(null), 2500);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <FlatList
                ref={flatListRef}
                data={pages}
                keyExtractor={(page) => String(page)}
                renderItem={({ item }) => (
                    <DalailReaderPage
                        page={item}
                        onZoomChange={setIsZoomed}
                        headerOffset={headerOffset}
                    />
                )}
                horizontal
                pagingEnabled
                initialScrollIndex={initialPage - 1}
                getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={!isZoomed}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                onScrollToIndexFailed={({ index }) => {
                    setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: false }), 100);
                }}
            />

            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}> 
                <Pressable style={styles.iconButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={22} color={theme.colors.text.primary} />
                </Pressable>
                <View style={styles.titleWrap}>
                    <Text style={styles.readerTitle}>{DALAIL_TITLE}</Text>
                    <Text style={styles.readerMeta} numberOfLines={1}>
                        {currentSection.title} • Page {pageInSection} of {sectionPages}
                    </Text>
                </View>
                <Pressable style={styles.iconButton} onPress={toggleBookmark}>
                    <Ionicons name={currentBookmarked ? "bookmark" : "bookmark-outline"} size={21} color={currentBookmarked ? "#10b981" : theme.colors.text.primary} />
                </Pressable>
            </View>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}> 
                <View style={styles.footerMetaRow}>
                    <View style={styles.footerTextWrap}>
                        <Text style={styles.footerMeta} numberOfLines={1}>
                            Page {currentPage} / {DALAIL_ASSET_MANIFEST.totalPages}
                        </Text>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${bookProgress}%` }]} />
                        </View>
                    </View>
                    <Pressable style={styles.jumpButton} onPress={() => setIsJumpVisible(true)}>
                        <Ionicons name="search-outline" size={17} color="#03140d" />
                        <Text style={styles.jumpButtonText}>Jump</Text>
                    </Pressable>
                </View>
                {currentPage >= currentSection.endPage - 1 && typeof currentSection.weekday === "number" && (
                    <Pressable
                        style={[styles.completeButton, currentWirdComplete && styles.completeButtonDone]}
                        onPress={completeCurrentWird}
                    >
                        <Ionicons name={currentWirdComplete ? "checkmark-circle" : "checkmark-circle-outline"} size={18} color={currentWirdComplete ? "#10b981" : "#03140d"} />
                        <Text style={[styles.completeButtonText, currentWirdComplete && styles.completeButtonDoneText]}>
                            {currentWirdComplete ? "Wird Complete" : "Mark Wird Complete"}
                        </Text>
                    </Pressable>
                )}
            </View>

            {completeMessage && (
                <View style={styles.toast}>
                    <Text style={styles.toastText}>{completeMessage}</Text>
                </View>
            )}

            <Modal visible={isJumpVisible} transparent animationType="fade" onRequestClose={() => setIsJumpVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setIsJumpVisible(false)}>
                    <Pressable style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Jump to Page</Text>
                        <TextInput
                            value={pageInput}
                            onChangeText={setPageInput}
                            keyboardType="number-pad"
                            placeholder="Page number"
                            placeholderTextColor={theme.colors.text.tertiary}
                            style={styles.pageInput}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalSecondaryButton} onPress={() => setIsJumpVisible(false)}>
                                <Text style={styles.modalSecondaryText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.modalPrimaryButton} onPress={submitJump}>
                                <Text style={styles.modalPrimaryText}>Open</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#050505",
    },
    pageSurface: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: "#050505",
    },
    pageFallback: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 34,
        gap: 12,
        backgroundColor: "#050505",
    },
    fallbackTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: theme.colors.text.primary,
        textAlign: "center",
    },
    fallbackText: {
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.text.secondary,
        textAlign: "center",
    },
    topBar: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingBottom: 12,
        backgroundColor: "rgba(0,0,0,0.84)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    titleWrap: {
        flex: 1,
    },
    readerTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    readerMeta: {
        marginTop: 2,
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    bottomBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingTop: 12,
        gap: 10,
        backgroundColor: "rgba(0,0,0,0.86)",
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.08)",
    },
    footerMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    footerTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    progressTrack: {
        marginTop: 8,
        height: 4,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#10b981",
    },
    footerMeta: {
        marginTop: 3,
        fontSize: 14,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    jumpButton: {
        minHeight: 42,
        paddingHorizontal: 16,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        backgroundColor: "#10b981",
    },
    jumpButtonText: {
        fontSize: 14,
        fontWeight: "900",
        color: "#03140d",
    },
    completeButton: {
        minHeight: 46,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        backgroundColor: "#10b981",
    },
    completeButtonDone: {
        backgroundColor: "rgba(16,185,129,0.14)",
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.24)",
    },
    completeButtonText: {
        fontSize: 14,
        fontWeight: "900",
        color: "#03140d",
    },
    completeButtonDoneText: {
        color: "#10b981",
    },
    toast: {
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 126,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: "center",
        backgroundColor: "rgba(16,185,129,0.96)",
    },
    toastText: {
        fontSize: 13,
        fontWeight: "900",
        color: "#03140d",
    },
    modalBackdrop: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(0,0,0,0.72)",
    },
    modalCard: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 24,
        padding: 20,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: theme.colors.text.primary,
        marginBottom: 14,
    },
    pageInput: {
        minHeight: 52,
        borderRadius: 16,
        paddingHorizontal: 14,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: "800",
    },
    modalActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 16,
    },
    modalSecondaryButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    modalSecondaryText: {
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    modalPrimaryButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10b981",
    },
    modalPrimaryText: {
        fontWeight: "900",
        color: "#03140d",
    },
});
