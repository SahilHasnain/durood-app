import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import * as TasbeehService from "@/services/tasbeehService";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line } from "react-native-svg";

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
    dailyHistory: DailyRecord[];
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

export default function Progress() {
    const HEADER_HEIGHT = 60;
    const insets = useSafeAreaInsets();
    const { tabBarHeight } = useTabBarVisibility();
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
        dailyHistory: [],
    });
    const [loading, setLoading] = useState(true);

    const loadProgressData = useCallback(async () => {
        try {
            setLoading(true);
            const [goal, history] = await Promise.all([
                TasbeehService.getUserGoal(),
                TasbeehService.getDailyHistory(30),
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
                dailyHistory,
            });
            setLoading(false);
        } catch (error) {
            console.error("Failed to load progress data:", error);
            setLoading(false);
        }
    }, []);

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
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: HEADER_HEIGHT + insets.top + 16,
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
                        <Text style={styles.statValue}>{formatNumber(stats.lifetimeTotal)}</Text>
                        <Text style={styles.statLabel}>Lifetime Total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.currentStreak}</Text>
                        <Text style={styles.statLabel}>Current Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{formatNumber(stats.averagePerDay)}</Text>
                        <Text style={styles.statLabel}>Avg Per Day</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{formatNumber(stats.bestDay)}</Text>
                        <Text style={styles.statLabel}>Best Day</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Last 30 Days</Text>
                    <View style={styles.chartCard}>
                        <DailyChart data={stats.dailyHistory} />
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
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function DailyChart({ data }: { data: DailyRecord[] }) {
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - 64;
    const chartHeight = 180;
    const padding = 20;

    if (data.length === 0) {
        return (
            <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No data yet</Text>
                <Text style={styles.emptyChartSubtext}>
                    Start counting to see your progress
                </Text>
            </View>
        );
    }

    const maxValue = Math.max(...data.map((d) => d.count), 100);
    const barWidth = (chartWidth - padding * 2) / data.length;
    const barSpacing = barWidth * 0.2;
    const actualBarWidth = barWidth - barSpacing;

    return (
        <Svg width={chartWidth} height={chartHeight}>
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding + (chartHeight - padding * 2) * (1 - ratio);
                return (
                    <Line
                        key={ratio}
                        x1={padding}
                        y1={y}
                        x2={chartWidth - padding}
                        y2={y}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                    />
                );
            })}

            {data.map((record, index) => {
                const barHeight = (record.count / maxValue) * (chartHeight - padding * 2);
                const x = padding + index * barWidth + barSpacing / 2;
                const y = chartHeight - padding - barHeight;

                return (
                    <Circle
                        key={record.date}
                        cx={x + actualBarWidth / 2}
                        cy={y + barHeight}
                        r={3}
                        fill={record.count >= record.target ? "#10b981" : "#FF6B6B"}
                    />
                );
            })}
        </Svg>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
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
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    statValue: {
        fontSize: 28,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
    chartCard: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
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
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
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
        backgroundColor: theme.colors.border.primary,
        marginVertical: 16,
    },
    projectionCard: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
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
});
