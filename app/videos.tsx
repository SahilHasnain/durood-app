import EmptyState from "@/components/EmptyState";
import { SimpleHeader } from "@/components/SimpleHeader";
import { VideoCard } from "@/components/VideoCard";
import { colors } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useDuroodVideos } from "@/hooks/useDuroodVideos";
import { getProgress } from "@/services/progressTracking";
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
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SCROLL_THRESHOLD = 5;
const HEADER_HEIGHT = 60;

interface VideoProgress {
    percentage: number;
}

export default function HomeScreen() {
    const router = useRouter();
    const { videos, loading, error, hasMore, loadMore, refresh } = useDuroodVideos();
    const [progressData, setProgressData] = useState<Record<string, VideoProgress>>({});
    const headerTranslateY = useSharedValue(0);
    const insets = useSafeAreaInsets();
    const previousScrollY = React.useRef(0);
    const lastDirection = React.useRef<"up" | "down">("up");

    const { translateY: tabBarTranslateY, tabBarHeight, showTabBar } = useTabBarVisibility();

    // Load progress data
    React.useEffect(() => {
        const loadProgress = async () => {
            const progress: Record<string, VideoProgress> = {};
            for (const video of videos) {
                const videoProgress = await getProgress(video.$id);
                if (videoProgress && videoProgress.progress > 0) {
                    const percentage = (videoProgress.progress / videoProgress.duration) * 100;
                    progress[video.$id] = { percentage };
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
            previousScrollY.current = 0;
            lastDirection.current = "up";
        }, [headerTranslateY, showTabBar])
    );

    const handleScroll = useCallback((event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;

        if (currentScrollY <= 0) {
            headerTranslateY.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.ease),
            });
            tabBarTranslateY.value = withTiming(0, {
                duration: 300,
                easing: Easing.out(Easing.ease),
            });
            previousScrollY.current = currentScrollY;
            lastDirection.current = "up";
            return;
        }

        const scrollDiff = currentScrollY - previousScrollY.current;
        if (Math.abs(scrollDiff) <= SCROLL_THRESHOLD) {
            return;
        }

        const direction = scrollDiff > 0 ? "down" : "up";
        if (direction !== lastDirection.current) {
            lastDirection.current = direction;

            headerTranslateY.value = withTiming(
                direction === "down" ? -(HEADER_HEIGHT + insets.top + 20) : 0,
                {
                    duration: 300,
                    easing:
                        direction === "down"
                            ? Easing.in(Easing.ease)
                            : Easing.out(Easing.ease),
                }
            );

            tabBarTranslateY.value = withTiming(
                direction === "down" ? tabBarHeight + 50 : 0,
                {
                    duration: 300,
                    easing:
                        direction === "down"
                            ? Easing.in(Easing.ease)
                            : Easing.out(Easing.ease),
                }
            );
        }

        previousScrollY.current = currentScrollY;
    }, [headerTranslateY, insets.top, tabBarHeight, tabBarTranslateY]);

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
                <VideoCard
                    video={item}
                    onPress={() => handleVideoPress(item)}
                    progressPercentage={progressPercentage}
                />
            );
        },
        [handleVideoPress, progressData]
    );

    const renderFooter = () => {
        if (!loading || videos.length === 0) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.accent.secondary} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading && videos.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={colors.accent.secondary} />
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
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                onEndReached={() => {
                    if (hasMore && !loading) {
                        loadMore();
                    }
                }}
                onEndReachedThreshold={0.5}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={refresh}
                        colors={[colors.accent.secondary]}
                        tintColor={colors.accent.secondary}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    contentContainer: {
        flexGrow: 1,
        paddingTop: 88,
        paddingBottom: 120,
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
        color: colors.text.secondary,
    },
    footer: {
        paddingVertical: 20,
        alignItems: "center",
    },
});
