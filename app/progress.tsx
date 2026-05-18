import { LineChart } from "@/components/LineChart";
import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import * as TasbeehService from "@/services/tasbeehService";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

interface DailyRecord {
    date: string;
    count: number;
    target: number;
}

interface ProgressStats {
    lifetimeTotal: number;
    currentStreak: number;
    longestStreak: number;
    averagePerDay: number;
    bestDay: number;
    todayCount: number;
    todayTarget: number;
    weeklyTotal: number;
    monthlyTotal: number;
    estimatedFinishDate: string;
    estimatedFinishDistance: string;
    dailyHistory: DailyRecord[];
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

function formatTimeFromNow(totalDays: number): string {
    if (totalDays <= 0) return "today";

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);

    if (years <= 0) {
        return months > 0
            ? `${months} month${months === 1 ? "" : "s"}`
            : `${totalDays} day${totalDays === 1 ? "" : "s"}`;
    }

    if (months <= 0) {
        return `${years} year${years === 1 ? "" : "s"}`;
    }

    return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
}

export default function Progress() {
    const HEADER_HEIGHT = 60;
    const { tabBarHeight } = useTabBarVisibility();
    const { user } = useAuth();
    const headerTranslateY = useSharedValue(0);

    const [stats, setStats] = useState<ProgressStats>({
        lifetimeTotal: 0,
        currentStreak: 0,
        longestStreak: 0,
        averagePerDay: 0,
        bestDay: 0,
        todayCount: 0,
        todayTarget: 100,
        weeklyTotal: 0,
        monthlyTotal: 0,
        estimatedFinishDate: "—",
        estimatedFinishDistance: "?",
        dailyHistory: [],
    });
    const [loading, setLoading] = useState(true);

    const loadProgressData = useCallback(async () => {
        try {
            setLoading(true);
            const [goal, history] = await Promise.all([
                TasbeehService.getUserGoal(user?.id),
                TasbeehService.getDailyHistory(30, user?.id),
            ]);

            const lifetimeTotal = goal?.lifetimeTotal ?? 0;
            const currentStreak = goal?.currentStreak ?? 0;
            const longestStreak = goal?.longestStreak ?? 0;

            // Calculate stats from history
            const weeklyTotal = history
                .slice(0, 7)
                .reduce((sum, record) => sum + record.count, 0);

            const monthlyTotal = history.reduce((sum, record) => sum + record.count, 0);

            const bestDay =
                history.length > 0 ? Math.max(...history.map((r) => r.count)) : 0;

            const averagePerDay =
                history.length > 0 ? Math.round(lifetimeTotal / history.length) : 0;

            // Estimate finish date
            const remainingGoal = 10000000 - lifetimeTotal;
            const estimatedDays =
                averagePerDay > 0 ? Math.ceil(remainingGoal / averagePerDay) : 0;
            const finishDate = new Date();
            finishDate.setDate(finishDate.getDate() + estimatedDays);
            const estimatedFinishDate =
                averagePerDay > 0
                    ? finishDate.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })
                    : "—";

            const estimatedFinishDistance =
                averagePerDay > 0 ? formatTimeFromNow(estimatedDays) : "?";
            // Convert history to daily records
            const dailyHistory = history.map((record) => ({
                date: record.date,
                count: record.count,
                target: record.target,
            }));

            setStats({
                lifetimeTotal,
                currentStreak,
                longestStreak,
                averagePerDay,
                bestDay,
                todayCount: history[0]?.count ?? 0,
                todayTarget: history[0]?.target ?? 100,
                weeklyTotal,
                monthlyTotal,
                estimatedFinishDate,
                estimatedFinishDistance,
                dailyHistory,
            });
            setLoading(false);
        } catch (error) {
            console.error("Failed to load progress data:", error);
            setLoading(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            loadProgressData();
        }, [loadProgressData])
    );

    if (loading) {
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
                        <Text style={styles.statValue}>{formatNumber(stats.lifetimeTotal)}</Text>
                        <Text style={styles.statLabel}>Lifetime Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statGlow} />
                        <Text style={styles.statValue}>{stats.currentStreak}</Text>
                        <Text style={styles.statLabel}>Current Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statGlow} />
                        <Text style={styles.statValue}>{formatNumber(stats.averagePerDay)}</Text>
                        <Text style={styles.statLabel}>Avg Per Day</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={styles.statGlow} />
                        <Text style={styles.statValue}>{formatNumber(stats.bestDay)}</Text>
                        <Text style={styles.statLabel}>Best Day</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Last 30 Days</Text>
                    <View style={styles.chartCard}>
                        <LineChart data={stats.dailyHistory} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Period Totals</Text>
                    <View style={styles.periodCard}>
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>This Week</Text>
                            <Text style={styles.periodValue}>
                                {formatNumber(stats.weeklyTotal)}
                            </Text>
                        </View>
                        <View style={styles.periodDivider} />
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>This Month</Text>
                            <Text style={styles.periodValue}>
                                {formatNumber(stats.monthlyTotal)}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Streaks</Text>
                    <View style={styles.periodCard}>
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>Current Streak</Text>
                            <Text style={styles.periodValue}>{stats.currentStreak} days</Text>
                        </View>
                        <View style={styles.periodDivider} />
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>Longest Streak</Text>
                            <Text style={styles.periodValue}>{stats.longestStreak} days</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Projection</Text>
                    <View style={styles.projectionCard}>
                        <Text style={styles.projectionLabel}>At current pace, finish by</Text>
                        <Text style={styles.projectionDate}>{stats.estimatedFinishDate}</Text>
                        <Text style={styles.projectionDistance}>
                            About {stats.estimatedFinishDistance} from now
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
