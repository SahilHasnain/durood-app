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
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const RING_SIZE = 180;
const RING_STROKE_WIDTH = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

function formatCompactNumber(value: number): string {
    if (value >= 10000000) {
        const crores = value / 10000000;
        return crores % 1 === 0 ? `${crores}Cr` : `${crores.toFixed(1)}Cr`;
    }
    if (value >= 100000) {
        const lakhs = value / 100000;
        return lakhs % 1 === 0 ? `${lakhs}L` : `${lakhs.toFixed(1)}L`;
    }
    if (value >= 1000) {
        const thousands = value / 1000;
        return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return value.toString();
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
    const plannerData = useTasbeehStore((state) => state.plannerData);
    const loadPlannerData = useTasbeehStore((state) => state.loadPlannerData);

    useFocusEffect(
        useCallback(() => {
            const activeUserId = user?.id;
            if (progressInitialized && initializedUserId === activeUserId) return;

            loadProgressData(activeUserId);
            if (!plannerData) {
                loadPlannerData(activeUserId);
            }
        }, [user?.id, progressInitialized, initializedUserId, loadProgressData, plannerData, loadPlannerData])
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
                {plannerData && (
                    <View style={styles.heroCard}>
                        <Text style={styles.heroEyebrow}>
                            Journey to {formatCompactNumber(plannerData.totalGoal)}
                        </Text>
                        <View style={styles.ringContainer}>
                            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                                <Circle
                                    cx={RING_SIZE / 2}
                                    cy={RING_SIZE / 2}
                                    r={RING_RADIUS}
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth={RING_STROKE_WIDTH}
                                    fill="none"
                                />
                                <Circle
                                    cx={RING_SIZE / 2}
                                    cy={RING_SIZE / 2}
                                    r={RING_RADIUS}
                                    stroke="#10b981"
                                    strokeWidth={RING_STROKE_WIDTH}
                                    strokeLinecap="round"
                                    strokeDasharray={RING_CIRCUMFERENCE}
                                    strokeDashoffset={
                                        RING_CIRCUMFERENCE -
                                        (Math.min((progressStats.lifetimeTotal / plannerData.totalGoal) * 100, 100) / 100) *
                                        RING_CIRCUMFERENCE
                                    }
                                    fill="none"
                                    transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                                />
                            </Svg>
                            <View style={styles.ringInner}>
                                <Text style={styles.ringPercent}>
                                    {Math.min((progressStats.lifetimeTotal / plannerData.totalGoal) * 100, 100).toFixed(1)}%
                                </Text>
                                <Text style={styles.ringLabel}>Complete</Text>
                            </View>
                        </View>
                        <View style={styles.heroStats}>
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatValue}>
                                    {formatCompactNumber(progressStats.lifetimeTotal)}
                                </Text>
                                <Text style={styles.heroStatLabel}>Completed</Text>
                            </View>
                            <View style={styles.heroDivider} />
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatValue}>
                                    {formatCompactNumber(Math.max(0, plannerData.totalGoal - progressStats.lifetimeTotal))}
                                </Text>
                                <Text style={styles.heroStatLabel}>Remaining</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.quickStatsRow}>
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>{progressStats.currentStreak}</Text>
                        <Text style={styles.quickStatLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>{formatNumber(progressStats.averagePerDay)}</Text>
                        <Text style={styles.quickStatLabel}>Avg/Day</Text>
                    </View>
                    <View style={styles.quickStatDivider} />
                    <View style={styles.quickStat}>
                        <Text style={styles.quickStatValue}>{formatNumber(progressStats.bestDay)}</Text>
                        <Text style={styles.quickStatLabel}>Best Day</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today</Text>
                    <View style={styles.periodCard}>
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>Sessions</Text>
                            <Text style={styles.periodValue}>
                                {progressStats.todaySessions}
                            </Text>
                        </View>
                        <View style={styles.periodDivider} />
                        <View style={styles.periodRow}>
                            <Text style={styles.periodLabel}>Total</Text>
                            <Text style={styles.periodValue}>
                                {formatNumber(progressStats.todayCount)}
                            </Text>
                        </View>
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
    quickStatsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(18, 18, 20, 0.8)",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    quickStat: {
        flex: 1,
        alignItems: "center",
    },
    quickStatValue: {
        fontSize: 24,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    quickStatLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    quickStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(255,255,255,0.1)",
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
    heroCard: {
        backgroundColor: "rgba(16,185,129,0.08)",
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.12)",
        marginBottom: 24,
        alignItems: "center",
    },
    heroEyebrow: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: theme.colors.text.secondary,
        marginBottom: 20,
    },
    ringContainer: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    ringInner: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },
    ringPercent: {
        fontSize: 36,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    ringLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginTop: 4,
    },
    heroStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 24,
    },
    heroStat: {
        alignItems: "center",
    },
    heroStatValue: {
        fontSize: 24,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    heroStatLabel: {
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
    heroDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
});
