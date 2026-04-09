import { CustomVideoPlayer } from "@/components/CustomVideoPlayer";
import { config } from "@/config/appwrite";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { getProgress, saveProgress } from "@/services/progressTracking";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { VideoPlayer } from "expo-video";
import React from "react";
import {
    AppState,
    StatusBar,
    StyleSheet,
    View
} from "react-native";
import { withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VideoScreen() {
    const params = useLocalSearchParams<{
        videoId: string;
        title?: string;
        duroodId?: string;
    }>();

    const [videoPlaying, setVideoPlaying] = React.useState(false);
    const [videoDuration, setVideoDuration] = React.useState(0);
    const [initialPosition, setInitialPosition] = React.useState(0);
    const lastSavedProgressRef = React.useRef<number>(0);
    const videoRef = React.useRef<VideoPlayer>(null);
    const playingRef = React.useRef(false);
    const duroodIdRef = React.useRef<string | undefined>(undefined);
    const videoDurationRef = React.useRef(0);

    const videoId = params.videoId;
    const duroodId = params.duroodId;

    const videoUrl = `${config.endpoint}/storage/buckets/${config.storageBucketId}/files/${videoId}/view?project=${config.projectId}`;

    const { translateY: tabBarTranslateY, tabBarHeight } = useTabBarVisibility();

    // Hide tab bar when this screen is focused
    useFocusEffect(
        React.useCallback(() => {
            tabBarTranslateY.value = withTiming(tabBarHeight + 50, {
                duration: 300,
            });

            return () => {
                tabBarTranslateY.value = withTiming(0, {
                    duration: 300,
                });

                const player = videoRef.current;
                if (!player) {
                    return;
                }

                try {
                    if (player.playing) {
                        player.pause();
                    }

                    if (duroodIdRef.current && videoDurationRef.current > 0) {
                        saveProgress(
                            duroodIdRef.current,
                            player.currentTime,
                            videoDurationRef.current,
                        ).catch((error) => {
                            console.error("Error saving progress on blur:", error);
                        });
                    }
                } catch (error) {
                    console.log("Player already released on blur");
                }
            };
        }, [tabBarTranslateY, tabBarHeight]),
    );

    React.useEffect(() => {
        playingRef.current = videoPlaying;
    }, [videoPlaying]);

    React.useEffect(() => {
        duroodIdRef.current = duroodId;
    }, [duroodId]);

    React.useEffect(() => {
        videoDurationRef.current = videoDuration;
    }, [videoDuration]);

    React.useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            if (nextState === "active") {
                return;
            }

            const player = videoRef.current;
            if (!player) {
                return;
            }

            try {
                if (player.playing) {
                    player.pause();
                }

                if (duroodIdRef.current && videoDurationRef.current > 0) {
                    saveProgress(
                        duroodIdRef.current,
                        player.currentTime,
                        videoDurationRef.current,
                    ).catch((error) => {
                        console.error("Error saving progress on app background:", error);
                    });
                }
            } catch (error) {
                console.log("Player already released on app background");
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Load saved progress and resume automatically when applicable
    React.useEffect(() => {
        const loadSavedProgress = async () => {
            if (!duroodId) {
                return;
            }

            try {
                const progress = await getProgress(duroodId);
                if (progress && progress.progress > 0) {
                    const percentage = (progress.progress / progress.duration) * 100;
                    if (percentage >= 5 && percentage <= 95) {
                        setInitialPosition(progress.progress);
                        lastSavedProgressRef.current = progress.progress;
                        console.log(`Auto-resuming from ${progress.progress}s (${percentage.toFixed(1)}%)`);
                    }
                }
            } catch (error) {
                console.error("Failed to load saved progress:", error);
            }
        };

        loadSavedProgress();
    }, [duroodId, videoId]);

    // Cleanup: save progress when screen unmounts
    React.useEffect(() => {
        return () => {
            const player = videoRef.current;
            const currentDuroodId = duroodIdRef.current;
            const currentDuration = videoDurationRef.current;

            if (currentDuroodId && currentDuration > 0 && player) {
                try {
                    const currentTime = player.currentTime;
                    saveProgress(currentDuroodId, currentTime, currentDuration).catch((error) => {
                        console.error("Error saving progress on unmount:", error);
                    });
                } catch (error) {
                    console.log("Player already released on unmount");
                }
            }
        };
    }, []);

    return (
        <>
            <StatusBar
                barStyle="light-content"
                backgroundColor={theme.colors.background.primary}
                translucent
            />

            <SafeAreaView edges={[]} style={styles.container}>
                <View style={styles.videoContainer}>
                    <CustomVideoPlayer
                        ref={videoRef}
                        videoUrl={videoUrl}
                        onTimeUpdate={async (currentTime, duration) => {
                            if (duration > 0 && videoDuration !== duration) {
                                setVideoDuration(duration);
                            }

                            if (
                                duroodId &&
                                playingRef.current &&
                                duration > 0 &&
                                Math.abs(currentTime - lastSavedProgressRef.current) >= 10
                            ) {
                                await saveProgress(duroodId, currentTime, duration);
                                lastSavedProgressRef.current = currentTime;
                            }
                        }}
                        onEnd={() => {
                            setVideoPlaying(false);

                            if (duroodId && videoDuration > 0) {
                                saveProgress(duroodId, videoDuration, videoDuration).catch((error) => {
                                    console.error("Error saving progress on end:", error);
                                });
                            }
                        }}
                        initialPosition={initialPosition}
                        autoPlay={true}
                        minimal={false}
                        loop={false}
                    />
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    videoContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
});
