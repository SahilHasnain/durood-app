import { CustomBarChart } from "@/components/CustomBarChart";
import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

function formatCompactNumber(value: number): string {
    const formatDecimal = (amount: number) => amount.toFixed(1).replace(/\.0$/, "");

    if (value >= 10000000) {
        const crores = value / 10000000;
        return `${formatDecimal(crores)}Cr`;
    }
    if (value >= 100000) {
        const lakhs = value / 100000;
        return `${formatDecimal(lakhs)}L`;
    }
    if (value >= 1000) {
        const thousands = value / 1000;
        return `${formatDecimal(thousands)}K`;
    }
    return value.toString();
}

export default function Progress() {
    const HEADER_HEIGHT = 60;
    const { tabBarHeight, showTabBar } = useTabBarVisibility();
    const { user } = useAuth();
    const headerTranslateY = useSharedValue(0);

    const progressStats = useTasbeehStore((state) => state.progressStats);
    const progressLoading = useTasbeehStore((state) => state.progressLoading);
    const plannerData = useTasbeehStore((state) => state.plannerData);

    useFocusEffect(
        useCallback(() => {
            showTabBar();

            const activeUserId = user?.id;
            const state = useTasbeehStore.getState();
            if (!state.progressInitialized || state.initializedUserId !== activeUserId) {
                void state.loadProgressData(activeUserId);
            } else {
                void state.refreshProgressData(activeUserId);
            }
            if (!state.plannerData) {
                void state.loadPlannerData(activeUserId);
            } else {
                void state.refreshPlannerData(activeUserId);
            }
        }, [user?.id, showTabBar])
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

    const totalGoal = plannerData?.totalGoal ?? Math.max(progressStats.lifetimeTotal, 100000);
    const remaining = Math.max(0, totalGoal - progressStats.lifetimeTotal);
    const completionPercent = totalGoal > 0
        ? Math.min((progressStats.lifetimeTotal / totalGoal) * 100, 100)
        : 0;
    const todayRemaining = Math.max(0, progressStats.todayTarget - progressStats.todayCount);


    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: HEADER_HEIGHT + 8, paddingBottom: tabBarHeight + 48 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.summaryCard}>
                    <Text style={styles.eyebrow}>Journey Progress</Text>
                    <Text style={styles.percentText}>{completionPercent.toFixed(1)}%</Text>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
                    </View>
                    <View style={styles.summaryNumbersCard}>
                        <View style={styles.summaryNumberItem}>
                            <Text style={styles.summaryNumberLabel}>Completed</Text>
                            <Text
                                style={styles.summaryNumberValue}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {formatNumber(progressStats.lifetimeTotal)}
                            </Text>
                        </View>
                        <View style={styles.summaryNumberDivider} />
                        <View style={styles.summaryNumberItem}>
                            <Text style={styles.summaryNumberLabel}>Goal</Text>
                            <Text
                                style={styles.summaryNumberValue}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {formatNumber(totalGoal)}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.summaryText}>{formatCompactNumber(remaining)} remaining</Text>
                </View>

                <View style={styles.statRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{progressStats.currentStreak}</Text>
                        <Text style={styles.statLabel}>Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{formatCompactNumber(progressStats.averagePerDay)}</Text>
                        <Text style={styles.statLabel}>Month Avg</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{formatCompactNumber(progressStats.bestDay)}</Text>
                        <Text style={styles.statLabel}>Best Day</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Today</Text>
                    <View style={styles.todayRow}>
                        <View>
                            <Text style={styles.todayValue}>
                                {formatNumber(progressStats.todayCount)} / {formatNumber(progressStats.todayTarget)}
                            </Text>
                            <Text style={styles.mutedText}>
                                {todayRemaining > 0 ? `${formatNumber(todayRemaining)} remaining` : "Daily target complete"}
                            </Text>
                        </View>
                        <View style={styles.sessionPill}>
                            <Text style={styles.sessionPillValue}>{progressStats.todaySessions}</Text>
                            <Text style={styles.sessionPillLabel}>sessions</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.sectionTitle}>This Month</Text>
                        <View style={styles.chipRow}>
                            <Text style={styles.chip}>Week {formatCompactNumber(progressStats.weeklyTotal)}</Text>
                            <Text style={styles.chip}>Month {formatCompactNumber(progressStats.monthlyTotal)}</Text>
                        </View>
                    </View>
                    {progressStats.dailyHistory.length > 0 ? (
                        <CustomBarChart data={progressStats.dailyHistory} />
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.mutedText}>Start counting to see this month here.</Text>
                        </View>
                    )}
                </View>

                <View style={styles.finishCard}>
                    <Text style={styles.finishLabel}>Time Left at This Pace</Text>
                    <Text style={styles.finishValue}>{progressStats.estimatedFinishDistance}</Text>
                    <Text style={styles.finishSub}>Estimated completion: {progressStats.estimatedFinishDate}</Text>
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
        gap: 16,
    },
    summaryCard: {
        borderRadius: 28,
        padding: 24,
        backgroundColor: "rgba(16,185,129,0.09)",
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.2)",
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.7,
        textTransform: "uppercase",
        color: theme.colors.text.secondary,
        marginBottom: 10,
    },
    percentText: {
        fontSize: 46,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    summaryText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: "700",
        color: theme.colors.text.secondary,
        textAlign: "center",
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        marginTop: 22,
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#10b981",
    },
    summaryNumbersCard: {
        marginTop: 16,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    summaryNumberItem: {
        flex: 1,
        gap: 4,
    },
    summaryNumberLabel: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: theme.colors.text.tertiary,
    },
    summaryNumberValue: {
        fontSize: 18,
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    summaryNumberDivider: {
        width: 1,
        height: 34,
        marginHorizontal: 12,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    statRow: {
        flexDirection: "row",
        gap: 10,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        padding: 16,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    statValue: {
        fontSize: 22,
        fontWeight: "800",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    card: {
        borderRadius: 24,
        padding: 18,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    todayRow: {
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    todayValue: {
        fontSize: 24,
        fontWeight: "800",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    mutedText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    sessionPill: {
        minWidth: 82,
        borderRadius: 18,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    sessionPillValue: {
        fontSize: 18,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    sessionPillLabel: {
        fontSize: 11,
        color: theme.colors.text.tertiary,
    },
    chartHeader: {
        gap: 12,
    },
    chipRow: {
        flexDirection: "row",
        gap: 8,
    },
    chip: {
        overflow: "hidden",
        borderRadius: 999,
        paddingVertical: 7,
        paddingHorizontal: 10,
        backgroundColor: "rgba(255,255,255,0.05)",
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: "700",
    },

    emptyChart: {
        height: 140,
        alignItems: "center",
        justifyContent: "center",
    },
    finishCard: {
        borderRadius: 24,
        padding: 22,
        backgroundColor: "rgba(16,185,129,0.08)",
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.16)",
    },
    finishLabel: {
        fontSize: 13,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: theme.colors.text.secondary,
        marginBottom: 8,
    },
    finishValue: {
        fontSize: 32,
        fontWeight: "800",
        color: "#10b981",
    },
    finishSub: {
        marginTop: 8,
        fontSize: 13,
        color: theme.colors.text.tertiary,
    },
});
