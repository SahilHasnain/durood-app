import { useAppearance } from "@/contexts/AppearanceContext";
import { Durood } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

interface VideoCardProps {
    video: Durood;
    onPress: () => void;
    progressPercentage?: number;
}

export const VideoCard: React.FC<VideoCardProps> = ({
    video,
    onPress,
    progressPercentage,
}) => {
    const { theme } = useAppearance();
    const styles = createStyles(theme);
    const [imageError, setImageError] = React.useState(false);
    const [imageLoading, setImageLoading] = React.useState(true);

    return (
        <View>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    marginBottom: 16,
                })}
            >
                <View style={styles.thumbnailContainer}>
                    {imageError || !video.thumbnailUrl ? (
                        <View style={styles.placeholderContainer}>
                            <View style={styles.placeholderIconWrapper}>
                                <Image
                                    source={require("@/assets/images/icon.png")}
                                    style={{ width: 48, height: 48 }}
                                    contentFit="contain"
                                />
                            </View>
                            <Text style={styles.placeholderText}>No Thumbnail</Text>
                        </View>
                    ) : (
                        <>
                            <Image
                                source={{ uri: video.thumbnailUrl }}
                                style={styles.thumbnail}
                                contentFit="cover"
                                onError={() => {
                                    setImageError(true);
                                    setImageLoading(false);
                                }}
                                onLoad={() => setImageLoading(false)}
                                cachePolicy="memory-disk"
                                transition={300}
                            />
                            {imageLoading && (
                                <View style={styles.loadingContainer}>
                                    <Ionicons name="hourglass" size={32} color={theme.colors.semantic.mutedIcon} />
                                </View>
                            )}
                            {!imageLoading && (
                                <View
                                    style={StyleSheet.absoluteFill}
                                    pointerEvents="none"
                                />
                            )}
                        </>
                    )}

                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
                    </View>

                    {progressPercentage !== undefined && progressPercentage > 0 && (
                        <View style={styles.progressBarContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    { width: `${progressPercentage}%` },
                                ]}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.titleRow}>
                        <View style={styles.titleContainer}>
                            <View style={styles.titleWrapper}>
                                <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                                    {video.title}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Pressable>
        </View>
    );
};

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
return StyleSheet.create({
    thumbnailContainer: {
        width: "100%",
        height: 200,
        backgroundColor: theme.colors.background.tertiary,
        position: "relative",
    },
    thumbnail: {
        width: "100%",
        height: 200,
    },
    placeholderContainer: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background.tertiary,
    },
    placeholderIconWrapper: {
        padding: 12,
        borderRadius: 9999,
        backgroundColor: theme.colors.accentActive,
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: "500",
        color: theme.colors.text.tertiary,
    },
    loadingContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.background.tertiary,
    },
    durationBadge: {
        position: "absolute",
        bottom: 10,
        right: 10,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.overlay,
    },
    durationText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
        color: theme.colors.text.primary,
    },
    progressBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: theme.colors.semantic.whiteOverlay,
    },
    progressBar: {
        height: "100%",
        backgroundColor: theme.colors.accent.secondary,
    },
    infoContainer: {
        paddingHorizontal: 8,
        paddingTop: 12,
    },
    titleRow: {
        flexDirection: "row",
        gap: 12,
    },
    titleContainer: {
        flex: 1,
    },
    titleWrapper: {
        marginBottom: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: "500",
        lineHeight: 18,
        color: theme.colors.text.primary,
    },
});
}

