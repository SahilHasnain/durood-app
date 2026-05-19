import { LineChart } from "@/components/LineChart";
import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
    ActivityIndicator,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

export default function Progress() {
    const HEADER_HEIGHT = 60;
    const { tabBarHeight } = useTabBarVisibility();
    const { user } = useAuth();
    const headerTranslateY = useSharedValue(0);

    const progressStats = useTasbeehStore((state) => state.progressStats);
    const progressLoading = useTasbeehStore((state) => state.progressLoading);
    const progressInitialized = useTasbeehStore((state) => state.progressInitialized);
    const initializedUserId = useTasbeehStore((state) => state.initializedUserId);
    const loadProgressData = useTasbeehStore((state) => state.loadProgressData);

    useFocusEffect(
        useCallback(() => {
            if (!user?.id) return;
            if (progressInitialized && initializedUserId === user.id) return;

            loadProgressData(user.id);
        }, [user?.id, progressInitialized, initializedUserId, loadProgressData])
    );

    if (progressLoading || !progressStats) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <SimpleHeader translateY={headerTranslateY} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.main} />
                    <Text style={styles.loadingText}>Loading progress...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <View pointerEvents="none" style={styles.backgroundLayer}>
                <ImageBackground
                    source={require("../assets/images/gumbad.png")}
                    resizeMode="cover"
                    style={styles.backgroundImage}
                    imageStyle={styles.backgroundImageAsset}
                >
                    <View style={styles.backgroundTint} />
                </ImageBackground>
            </View>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: HEADER_HEIGHT + 8,
                        paddingBottom: tabBarHeight + 16,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Progress</Text>
                    <Text style={styles.sectionSubtitle}>Track your journey to 1 Crore</Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={styles.statGlow} />
                        <Text style={styles.statValue}>{formatNumber(progressStats.lifetimeTotal)}</Text>
                        <Text style={styles.statLabel}>Lifetime Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statGlow} />
                        <Text style={styles.statValue}>{progressStats.currentStreak}</Text>
                        <Text style={styles.statLabel}>Current Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statGlow} />
                        <Text style={styles.statValue}>{formatNumber(progressStats.averagePerDay)}</Text>
                        <Text style={styles.statLabel}>Avg Per Day</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statGlow} />
                        <Text style={styles.statValue}>{formatNumber(progressStats.bestDay)}</Text>
                        <Text style={styles.statLabel}>Best Day</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Last 30 Days</Text>
                    <View style={styles.chartCard}>
                        <LineChart data={progressStats.dailyHistory} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Period Totals</Text>
                    <View style={styles.periodCard}>
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>This Week</Text>
                            <Text style={styles.periodValue}>
                                {formatNumber(progressStats.weeklyTotal)}
                            </Text>
                        </View>
                        <View style={styles.periodDivider} />
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>This Month</Text>
                            <Text style={styles.periodValue}>
                                {formatNumber(progressStats.monthlyTotal)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Streaks</Text>
                    <View style={styles.periodCard}>
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>Current Streak</Text>
                            <Text style={styles.periodValue}>{progressStats.currentStreak} days</Text>
                        </View>
                        <View style={styles.periodDivider} />
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>Longest Streak</Text>
                            <Text style={styles.periodValue}>{progressStats.longestStreak} days</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Projection</Text>
                    <View style={styles.projectionCard}>
                        <Text style={styles.projectionLabel}>At current pace, finish by</Text>
                        <Text style={styles.projectionDate}>{progressStats.estimatedFinishDate}</Text>
                        <Text style={styles.projectionDistance}>
                            About {progressStats.estimatedFinishDistance} from now
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    backgroundLayer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    backgroundImageAsset: {
        opacity: 0.18,
    },
    backgroundTint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(5, 7, 9, 0.72)",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        minWidth: "47%",
        backgroundColor: "rgba(20, 20, 22, 0.76)",
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        overflow: "hidden",
    },
    statGlow: {
        position: "absolute",
        top: -30,
        right: -24,
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: "rgba(16,185,129,0.08)",
    },
    statValue: {
        fontSize: 28,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 13,
        color: "rgba(255,255,255,0.62)",
    },
    chartCard: {
        backgroundColor: "rgba(18, 18, 20, 0.82)",
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    emptyChart: {
        height: 180,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyChartText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text.secondary,
        marginBottom: 4,
    },
    emptyChartSubtext: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
    },
    periodCard: {
        backgroundColor: "rgba(18, 18, 20, 0.8)",
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    periodRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    periodLabel: {
        fontSize: 15,
        color: theme.colors.text.secondary,
    },
    periodValue: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    periodDivider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
        marginVertical: 16,
    },
    projectionCard: {
        backgroundColor: "rgba(16,185,129,0.08)",
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.18)",
        alignItems: "center",
    },
    projectionLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: 8,
    },
    projectionDate: {
        fontSize: 24,
        fontWeight: "700",
        color: "#10b981",
    },
    projectionDistance: {
        marginTop: 8,
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
});
