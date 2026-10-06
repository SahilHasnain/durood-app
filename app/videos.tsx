import EmptyState from "@/components/EmptyState";
import { SimpleHeader } from "@/components/SimpleHeader";
import { VideoCard } from "@/components/VideoCard";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useDuroodVideos } from "@/hooks/useDuroodVideos";
import { getProgress, getRecentlyWatchedVideoIds } from "@/services/progressTracking";
import { Durood } from "@/types";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    Platform,
    useWindowDimensions,
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface VideoProgress {
    percentage: number;
}

export default function HomeScreen() {
    const router = useRouter();
    const { videos, loading, error, hasMore, loadMore, refresh } = useDuroodVideos();
    const [progressData, setProgressData] = useState<Record<string, VideoProgress>>({});
    const headerTranslateY = useSharedValue(0);

    const { showTabBar } = useTabBarVisibility();
    const { width } = useWindowDimensions();
    const { theme: activeTheme } = useAppearance();
    const styles = createStyles(activeTheme);
    const isDesktopWeb = Platform.OS === "web" && width >= 1200;
    const columnCount = isDesktopWeb ? 3 : Platform.OS === "web" && width >= 768 ? 2 : 1;

    // Load progress data
    React.useEffect(() => {
        const loadProgress = async () => {
            const progress: Record<string, VideoProgress> = {};
            const watchedVideoIds = new Set(await getRecentlyWatchedVideoIds());
            for (const video of videos) {
                const videoProgress = await getProgress(video.$id);
                if (videoProgress && videoProgress.progress > 0) {
                    const percentage = Math.min(
                        (videoProgress.progress / videoProgress.duration) * 100,
                        100
                    );
                    progress[video.$id] = { percentage };
                } else if (watchedVideoIds.has(video.$id)) {
                    progress[video.$id] = { percentage: 100 };
                }
            }
            setProgressData(progress);
        };
        if (videos.length > 0) {
            loadProgress();
        }
    }, [videos]);

    useFocusEffect(
        useCallback(() => {
            showTabBar();
            headerTranslateY.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.ease),
            });
            refresh();
        }, [headerTranslateY, showTabBar, refresh])
    );

    const handleVideoPress = useCallback((video: Durood) => {
        router.push({
            pathname: "/video",
            params: {
                videoId: video.videoId,
                title: video.title,
                duroodId: video.$id,
            },
        });
    }, [router]);

    const renderVideo = useCallback(
        ({ item }: { item: Durood }) => {
            const progress = progressData[item.$id];
            const progressPercentage = progress ? progress.percentage : undefined;

            return (
                <View style={columnCount > 1 ? styles.gridItem : undefined}>
                    <VideoCard
                        video={item}
                        onPress={() => handleVideoPress(item)}
                        progressPercentage={progressPercentage}
                    />
                </View>
            );
        },
        [columnCount, handleVideoPress, progressData]
    );

    const renderFooter = () => {
        if (!loading || videos.length === 0) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={activeTheme.colors.accent.secondary} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading && videos.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={activeTheme.colors.accent.secondary} />
                    <Text style={styles.emptyText}>Loading videos...</Text>
                </View>
            );
        }
        if (error) {
            return (
                <EmptyState
                    message="Unable to load videos. Check your connection."
                    iconName="alert-circle"
                    actionLabel="Retry"
                    onAction={refresh}
                />
            );
        }
        return (
            <EmptyState message="No videos available yet. Check back soon!" iconName="film" />
        );
    };

    return (
        <SafeAreaView edges={[]} style={styles.container}>
            <SimpleHeader translateY={headerTranslateY} />
            <FlatList
                data={videos}
                renderItem={renderVideo}
                keyExtractor={(item) => item.$id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                numColumns={columnCount}
                columnWrapperStyle={columnCount > 1 ? styles.columnWrapper : undefined}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                onEndReached={() => {
                    if (hasMore && !loading) {
                        loadMore();
                    }
                }}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={loading && videos.length > 0}
                        onRefresh={refresh}
                        colors={[activeTheme.colors.accent.secondary]}
                        tintColor={activeTheme.colors.accent.secondary}
                    />
                }
                removeClippedSubviews
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={10}
            />
        </SafeAreaView>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    contentContainer: {
        flexGrow: 1,
        paddingTop: 88,
        paddingBottom: 120,
        paddingHorizontal: 16,
        alignSelf: "center",
        width: "100%",
        maxWidth: 1200,
    },
    columnWrapper: {
        gap: 20,
    },
    gridItem: {
        flex: 1,
        minWidth: 0,
    },
    emptyContainer: {
        height: SCREEN_HEIGHT - 200,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    footer: {
        paddingVertical: 20,
        alignItems: "center",
    },
});
}
