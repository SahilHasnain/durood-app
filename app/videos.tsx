import EmptyState from "@/components/EmptyState";
import { VideoCard } from "@/components/VideoCard";
import { theme } from "@/constants/theme";
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
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface VideoProgress {
    percentage: number;
}

export default function VideosScreen() {
    const router = useRouter();
    const { videos, loading, error, hasMore, loadMore, refresh } = useDuroodVideos();
    const [progressData, setProgressData] = useState<Record<string, VideoProgress>>({});
    const { showTabBar } = useTabBarVisibility();

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

    // Show tab bar when screen is focused
    useFocusEffect(
        useCallback(() => {
            showTabBar();
        }, [showTabBar])
    );

    const handleVideoPress = (video: Durood) => {
        router.push({
            pathname: "/video",
            params: {
                videoId: video.videoId,
                title: video.title,
                duroodId: video.$id,
            },
        });
    };

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
        [progressData]
    );

    const renderFooter = () => {
        if (!loading || videos.length === 0) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={theme.colors.primary.main} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading && videos.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.main} />
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
        <SafeAreaView edges={["top"]} style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Durood Videos</Text>
            </View>
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
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={refresh}
                        colors={[theme.colors.primary.main]}
                        tintColor={theme.colors.primary.main}
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
        backgroundColor: theme.colors.background.primary,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.background.secondary,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.text.primary,
    },
    contentContainer: {
        flexGrow: 1,
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 100,
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
