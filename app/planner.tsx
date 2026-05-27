import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const GOAL_PRESETS = [
    { label: "1L", value: 100000, fullLabel: "1 Lakh" },
    { label: "10L", value: 1000000, fullLabel: "10 Lakh" },
    { label: "50L", value: 5000000, fullLabel: "50 Lakh" },
    { label: "1Cr", value: 10000000, fullLabel: "1 Crore" },
];

const DAILY_PRESETS = [
    { label: "100", value: 100 },
    { label: "500", value: 500 },
    { label: "1000", value: 1000 },
    { label: "3000", value: 3000 },
];

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

function formatDateLabel(date: Date): string {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatDuration(totalDays: number): string {
    if (totalDays <= 0) return "today";

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    if (years > 0) {
        return months > 0 ? `${years}y ${months}mo` : `${years} year${years === 1 ? "" : "s"}`;
    }
    if (months > 0) {
        return days > 0 ? `${months}mo ${days}d` : `${months} month${months === 1 ? "" : "s"}`;
    }
    return `${totalDays} day${totalDays === 1 ? "" : "s"}`;
}

export default function Planner() {
    const HEADER_HEIGHT = 60;
    const { tabBarHeight } = useTabBarVisibility();
    const { user } = useAuth();
    const headerTranslateY = useSharedValue(0);

    const plannerData = useTasbeehStore((state) => state.plannerData);
    const plannerLoading = useTasbeehStore((state) => state.plannerLoading);
    const plannerInitialized = useTasbeehStore((state) => state.plannerInitialized);
    const initializedUserId = useTasbeehStore((state) => state.initializedUserId);
    const loadPlannerData = useTasbeehStore((state) => state.loadPlannerData);
    const updateDailyTarget = useTasbeehStore((state) => state.updateDailyTarget);
    const updateTotalGoal = useTasbeehStore((state) => state.updateTotalGoal);
    const progressStats = useTasbeehStore((state) => state.progressStats);
    const loadProgressData = useTasbeehStore((state) => state.loadProgressData);

    const [dailyInput, setDailyInput] = useState("");
    const [goalInput, setGoalInput] = useState("");
    const [updating, setUpdating] = useState(false);
    const [planningMode, setPlanningMode] = useState<"target" | "date">("target");
    const [targetDate, setTargetDate] = useState<Date>(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

    const handleDailyInputChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned) {
            const formatted = formatNumber(parseInt(cleaned, 10));
            setDailyInput(formatted);
        } else {
            setDailyInput("");
        }
    };

    const handleGoalInputChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned) {
            const formatted = formatNumber(parseInt(cleaned, 10));
            setGoalInput(formatted);
        } else {
            setGoalInput("");
        }
    };

    const handlePresetGoal = (value: number) => {
        setGoalInput(formatNumber(value));
    };

    const handlePresetDaily = (value: number) => {
        setDailyInput(formatNumber(value));
    };

    const handleDateChange = (days: number) => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        setTargetDate(newDate);
    };

    const calculateDailyFromDate = (): number => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        const daysUntil = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        return Math.ceil(remainingGoal / daysUntil);
    };

    const calculateFinishDate = (daily: number): Date => {
        const days = calculateDaysToFinish(daily);
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    };

    const calculateDaysToFinish = (daily: number): number => {
        return daily > 0 ? Math.ceil(remainingGoal / daily) : 0;
    };

    useFocusEffect(
        useCallback(() => {
            const activeUserId = user?.id;

            if (plannerInitialized && initializedUserId === activeUserId) {
                if (plannerData) {
                    setDailyInput(plannerData.dailyTarget.toString());
                    setGoalInput(plannerData.totalGoal.toString());
                }
            } else {
                void loadPlannerData(activeUserId);
            }

            if (!progressStats) {
                void loadProgressData(activeUserId);
            }
        }, [user?.id, plannerInitialized, initializedUserId, plannerData, loadPlannerData, progressStats, loadProgressData])
    );

    const handleUpdateDailyTarget = async () => {
        const newTarget = parseInt(dailyInput.replace(/,/g, ""), 10);
        if (!newTarget || newTarget <= 0) return;

        try {
            setUpdating(true);
            await updateDailyTarget(newTarget, user?.id);
        } catch (error) {
            console.error("Failed to update target:", error);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateLifetimeGoal = async () => {
        const newGoal = parseInt(goalInput.replace(/,/g, ""), 10);
        if (!newGoal || newGoal <= 0) return;

        try {
            setUpdating(true);
            await updateTotalGoal(newGoal, user?.id);
        } catch (error) {
            console.error("Failed to update goal:", error);
        } finally {
            setUpdating(false);
        }
    };

    if (plannerLoading || !plannerData) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <SimpleHeader translateY={headerTranslateY} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.main} />
                    <Text style={styles.loadingText}>Loading planner...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const { lifetimeTotal, totalGoal, dailyTarget } = plannerData;
    const remainingGoal = Math.max(0, totalGoal - lifetimeTotal);

    const nextMilestone = [
        { label: "1 Lakh", value: 100000, emoji: "📿" },
        { label: "10 Lakh", value: 1000000, emoji: "🌙" },
        { label: "50 Lakh", value: 5000000, emoji: "✨" },
        { label: "1 Crore", value: 10000000, emoji: "☪️" },
    ].find((milestone) => lifetimeTotal < milestone.value) ?? { label: "1 Crore", value: 10000000, emoji: "☪️" };
    const nextMilestoneRemaining = Math.max(0, nextMilestone.value - lifetimeTotal);
    const daysToNextMilestone =
        dailyTarget > 0 ? Math.ceil(nextMilestoneRemaining / dailyTarget) : 0;

    // Calculate pace status
    const averagePerDay = progressStats?.averagePerDay ?? 0;
    const requiredDailyPace = dailyTarget;
    const paceDifference = averagePerDay - requiredDailyPace;
    const isPaceAhead = paceDifference > 0;
    const isPaceOnTrack = Math.abs(paceDifference) < requiredDailyPace * 0.1; // Within 10%
    const daysToFinish = dailyTarget > 0 ? Math.ceil(remainingGoal / dailyTarget) : 0;
    const daysSavedOrLost = requiredDailyPace > 0 ? Math.floor((paceDifference * daysToFinish) / requiredDailyPace) : 0;

    let paceStatus: "ahead" | "ontrack" | "behind" = "ontrack";
    if (!isPaceOnTrack) {
        paceStatus = isPaceAhead ? "ahead" : "behind";
    }

    const paceColor = paceStatus === "ahead" ? "#10b981" : paceStatus === "behind" ? "#ef4444" : "#f59e0b";
    const paceEmoji = paceStatus === "ahead" ? "🚀" : paceStatus === "behind" ? "⚠️" : "✅";
    const paceLabel = paceStatus === "ahead" ? "Ahead of Schedule" : paceStatus === "behind" ? "Behind Schedule" : "On Track";

    // Calculate pace indicator
    const last30Days = progressStats?.dailyHistory.slice(-30) || [];
    const daysWithData = last30Days.filter((d) => d.count > 0).length;
    const totalCompleted = last30Days.reduce((sum, d) => sum + d.count, 0);
    const actualAverage = daysWithData > 0 ? Math.round(totalCompleted / daysWithData) : 0;
    const targetAverage = dailyTarget;
    const pacePercentage = targetAverage > 0 ? Math.round((actualAverage / targetAverage) * 100) : 0;
    const daysAheadBehind = targetAverage > 0 ? Math.round((actualAverage - targetAverage) * daysWithData / targetAverage) : 0;

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
                {progressStats && dailyTarget > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Schedule Status</Text>
                        <View style={[styles.paceCard, { borderColor: paceColor + "30" }]}>
                            <View style={styles.paceHeader}>
                                <Text style={styles.paceEmoji}>{paceEmoji}</Text>
                                <View style={styles.paceInfo}>
                                    <Text style={[styles.paceLabel, { color: paceColor }]}>{paceLabel}</Text>
                                    {paceStatus !== "ontrack" && (
                                        <Text style={styles.paceDays}>
                                            {Math.abs(daysSavedOrLost)} day{Math.abs(daysSavedOrLost) !== 1 ? "s" : ""}{" "}
                                            {paceStatus === "ahead" ? "ahead" : "behind"}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.paceStats}>
                                <View style={styles.paceStat}>
                                    <Text style={styles.paceStatLabel}>Your Avg</Text>
                                    <Text style={styles.paceStatValue}>{formatCompactNumber(averagePerDay)}/day</Text>
                                </View>
                                <View style={styles.paceStatDivider} />
                                <View style={styles.paceStat}>
                                    <Text style={styles.paceStatLabel}>Target</Text>
                                    <Text style={styles.paceStatValue}>{formatCompactNumber(requiredDailyPace)}/day</Text>
                                </View>
                            </View>
                            {paceStatus === "behind" && paceDifference < 0 && (
                                <View style={styles.paceInsight}>
                                    <Text style={styles.paceInsightText}>
                                        💡 Speed up by {formatCompactNumber(Math.abs(paceDifference))}/day to stay on track
                                    </Text>
                                </View>
                            )}
                            {paceStatus === "ahead" && paceDifference > 0 && (
                                <View style={styles.paceInsight}>
                                    <Text style={styles.paceInsightText}>
                                        💡 You can slow down by {formatCompactNumber(paceDifference)}/day and still finish on time
                                    </Text>
                                </View>
                            )}
                            {paceStatus === "ontrack" && (
                                <View style={styles.paceInsight}>
                                    <Text style={styles.paceInsightText}>
                                        💡 Keep up the great work! You&apos;re right on schedule
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {progressStats && progressStats.currentStreak > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Streak</Text>
                        <View style={styles.streakCard}>
                            <View style={styles.streakHeader}>
                                <Text style={styles.streakEmoji}>🔥</Text>
                                <View style={styles.streakInfo}>
                                    <Text style={styles.streakCount}>{progressStats.currentStreak}</Text>
                                    <Text style={styles.streakLabel}>Day Streak</Text>
                                </View>
                            </View>
                            <View style={styles.streakDivider} />
                            <View style={styles.streakMessage}>
                                <Text style={styles.streakMessageText}>
                                    🎯 Don&apos;t break your {progressStats.currentStreak}-day streak!
                                </Text>
                                <Text style={styles.streakMessageSubtext}>
                                    Complete your daily target to keep it going
                                </Text>
                            </View>
                            {progressStats.longestStreak > progressStats.currentStreak && (
                                <View style={styles.streakBest}>
                                    <Text style={styles.streakBestLabel}>Your Best:</Text>
                                    <Text style={styles.streakBestValue}>{progressStats.longestStreak} days</Text>
                                </View>
                            )}
                            {progressStats.currentStreak >= progressStats.longestStreak && progressStats.currentStreak >= 7 && (
                                <View style={styles.streakBadge}>
                                    <Text style={styles.streakBadgeText}>🏆 Personal Record!</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Lifetime Goal</Text>
                    <View style={styles.calculatorCard}>
                        <Text style={styles.calculatorLabel}>Choose a preset or enter custom:</Text>
                        <View style={styles.presetContainer}>
                            {GOAL_PRESETS.map((preset) => (
                                <TouchableOpacity
                                    key={preset.value}
                                    style={[
                                        styles.presetButton,
                                        goalInput === formatNumber(preset.value) && styles.presetButtonActive,
                                    ]}
                                    onPress={() => handlePresetGoal(preset.value)}
                                >
                                    <Text
                                        style={[
                                            styles.presetButtonText,
                                            goalInput === formatNumber(preset.value) &&
                                            styles.presetButtonTextActive,
                                        ]}
                                    >
                                        {preset.label}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.presetButtonSubtext,
                                            goalInput === formatNumber(preset.value) &&
                                            styles.presetButtonSubtextActive,
                                        ]}
                                    >
                                        {preset.fullLabel}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Or enter custom amount"
                            placeholderTextColor={theme.colors.text.tertiary}
                            value={goalInput}
                            onChangeText={handleGoalInputChange}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={[styles.button, updating && styles.buttonDisabled]}
                            onPress={handleUpdateLifetimeGoal}
                            disabled={updating}
                        >
                            <Text style={styles.buttonText}>
                                {updating ? "Updating..." : "Set Lifetime Goal"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Set Your Daily Pace</Text>
                    <View style={styles.calculatorCard}>
                        <View style={styles.modeToggle}>
                            <TouchableOpacity
                                style={[styles.modeButton, planningMode === "target" && styles.modeButtonActive]}
                                onPress={() => setPlanningMode("target")}
                            >
                                <Text style={[styles.modeButtonText, planningMode === "target" && styles.modeButtonTextActive]}>
                                    By Daily Target
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeButton, planningMode === "date" && styles.modeButtonActive]}
                                onPress={() => setPlanningMode("date")}
                            >
                                <Text style={[styles.modeButtonText, planningMode === "date" && styles.modeButtonTextActive]}>
                                    By Finish Date
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {planningMode === "target" ? (
                            <>
                                <Text style={styles.calculatorLabel}>Choose a preset or enter custom:</Text>
                                <View style={styles.presetContainer}>
                                    {DAILY_PRESETS.map((preset) => (
                                        <TouchableOpacity
                                            key={preset.value}
                                            style={[
                                                styles.presetButton,
                                                dailyInput === formatNumber(preset.value) && styles.presetButtonActive,
                                            ]}
                                            onPress={() => handlePresetDaily(preset.value)}
                                        >
                                            <Text
                                                style={[
                                                    styles.presetButtonText,
                                                    dailyInput === formatNumber(preset.value) &&
                                                    styles.presetButtonTextActive,
                                                ]}
                                            >
                                                {preset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Or enter custom amount"
                                    placeholderTextColor={theme.colors.text.tertiary}
                                    value={dailyInput}
                                    onChangeText={handleDailyInputChange}
                                    keyboardType="numeric"
                                />

                                {dailyInput && parseInt(dailyInput.replace(/,/g, ""), 10) > 0 && (
                                    <View style={styles.dateResultCard}>
                                        <Text style={styles.dateResultLabel}>You&apos;ll finish by</Text>
                                        <Text style={styles.dateResultValue}>
                                            {formatDateLabel(calculateFinishDate(parseInt(dailyInput.replace(/,/g, ""), 10)))}
                                        </Text>
                                        <View style={styles.dateResultDivider} />
                                        <Text style={styles.dateResultTarget}>
                                            {formatDuration(calculateDaysToFinish(parseInt(dailyInput.replace(/,/g, ""), 10)))}
                                        </Text>
                                        <Text style={styles.dateResultLabel}>from now</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.button, updating && styles.buttonDisabled]}
                                    onPress={handleUpdateDailyTarget}
                                    disabled={updating}
                                >
                                    <Text style={styles.buttonText}>
                                        {updating ? "Updating..." : "Set Daily Target"}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.calculatorLabel}>When do you want to finish?</Text>
                                <View style={styles.datePresetContainer}>
                                    <TouchableOpacity
                                        style={styles.datePresetButton}
                                        onPress={() => handleDateChange(30)}
                                    >
                                        <Text style={styles.datePresetText}>1 Month</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.datePresetButton}
                                        onPress={() => handleDateChange(90)}
                                    >
                                        <Text style={styles.datePresetText}>3 Months</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.datePresetButton}
                                        onPress={() => handleDateChange(180)}
                                    >
                                        <Text style={styles.datePresetText}>6 Months</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.datePresetButton}
                                        onPress={() => handleDateChange(365)}
                                    >
                                        <Text style={styles.datePresetText}>1 Year</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateResultCard}>
                                    <Text style={styles.dateResultLabel}>Target Date</Text>
                                    <Text style={styles.dateResultValue}>{formatDateLabel(targetDate)}</Text>
                                    <View style={styles.dateResultDivider} />
                                    <Text style={styles.dateResultLabel}>Required Daily Target</Text>
                                    <Text style={styles.dateResultTarget}>{formatNumber(calculateDailyFromDate())}/day</Text>
                                    <TouchableOpacity
                                        style={[styles.button, { marginTop: 16 }, updating && styles.buttonDisabled]}
                                        onPress={async () => {
                                            const calculatedTarget = calculateDailyFromDate();
                                            setDailyInput(formatNumber(calculatedTarget));
                                            try {
                                                setUpdating(true);
                                                await updateDailyTarget(calculatedTarget, user?.id);
                                            } catch (error) {
                                                console.error("Failed to update target:", error);
                                            } finally {
                                                setUpdating(false);
                                            }
                                        }}
                                        disabled={updating}
                                    >
                                        <Text style={styles.buttonText}>
                                            {updating ? "Updating..." : "Set This Target"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {dailyTarget > 0 && planningMode === "target" && (
                            <View style={styles.currentTargetInfo}>
                                <Text style={styles.currentTargetLabel}>Current target: {formatNumber(dailyTarget)}/day</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Next Milestone</Text>
                    <View style={styles.milestoneCard}>
                        <View style={styles.milestoneHeader}>
                            <Text style={styles.milestoneEmoji}>{nextMilestone.emoji}</Text>
                            <View style={styles.milestoneInfo}>
                                <Text style={styles.milestoneLabel}>{nextMilestone.label}</Text>
                                <Text style={styles.milestoneValue}>
                                    {formatNumber(nextMilestone.value)}
                                </Text>
                            </View>
                        </View>
                        {nextMilestoneRemaining > 0 ? (
                            <>
                                <Text style={styles.milestoneRemaining}>
                                    {formatNumber(nextMilestoneRemaining)} remaining
                                </Text>
                                {dailyTarget > 0 && (
                                    <Text style={styles.milestoneDuration}>
                                        About {formatDuration(daysToNextMilestone)} at current pace
                                    </Text>
                                )}
                            </>
                        ) : (
                            <Text style={styles.milestoneAchieved}>🎉 Milestone achieved!</Text>
                        )}
                    </View>
                </View>
            </ScrollView >
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
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
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 12,
    },
    calculatorCard: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    calculatorLabel: {
        fontSize: 15,
        color: theme.colors.text.secondary,
        marginBottom: 12,
    },
    input: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: theme.colors.text.primary,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 12,
    },
    button: {
        backgroundColor: theme.colors.primary.main,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    projectionCard: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.06)",
        alignItems: "center",
    },
    projectionEyebrow: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: theme.colors.text.tertiary,
        marginBottom: 8,
    },
    projectionValue: {
        fontSize: 28,
        fontWeight: "800",
        color: theme.colors.text.primary,
        marginBottom: 12,
    },
    projectionText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: 4,
    },
    projectionDuration: {
        fontSize: 20,
        fontWeight: "700",
        color: "#10b981",
        marginBottom: 4,
    },
    projectionDate: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
    },
    milestoneCard: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    milestoneHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginBottom: 12,
    },
    milestoneEmoji: {
        fontSize: 40,
    },
    milestoneInfo: {
        flex: 1,
    },
    milestoneLabel: {
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    milestoneValue: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    milestoneRemaining: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    milestoneDuration: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    milestoneAchieved: {
        fontSize: 16,
        fontWeight: "600",
        color: "#10b981",
    },
    presetContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
    },
    presetButton: {
        flex: 1,
        minWidth: "22%",
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.06)",
    },
    presetButtonActive: {
        backgroundColor: "rgba(16,185,129,0.15)",
        borderColor: "#10b981",
    },
    presetButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    presetButtonTextActive: {
        color: "#10b981",
    },
    presetButtonSubtext: {
        fontSize: 11,
        color: theme.colors.text.tertiary,
        marginTop: 2,
    },
    presetButtonSubtextActive: {
        color: "#10b981",
    },
    paceCard: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
    },
    paceHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    paceEmoji: {
        fontSize: 32,
    },
    paceInfo: {
        flex: 1,
    },
    paceLabel: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 2,
    },
    paceDays: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    paceStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginBottom: 16,
    },
    paceStat: {
        flex: 1,
        alignItems: "center",
    },
    paceStatLabel: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
        marginBottom: 4,
    },
    paceStatValue: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    paceStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    paceInsight: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 12,
        padding: 12,
    },
    paceInsightText: {
        fontSize: 13,
        color: theme.colors.text.secondary,
        lineHeight: 18,
    },
    streakCard: {
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: "rgba(239, 68, 68, 0.2)",
    },
    streakHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    streakEmoji: {
        fontSize: 48,
    },
    streakInfo: {
        flex: 1,
    },
    streakCount: {
        fontSize: 40,
        fontWeight: "800",
        color: "#ef4444",
        lineHeight: 44,
    },
    streakLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text.secondary,
    },
    streakDivider: {
        height: 1,
        backgroundColor: "rgba(239, 68, 68, 0.15)",
        marginVertical: 16,
    },
    streakMessage: {
        marginBottom: 12,
    },
    streakMessageText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    streakMessageSubtext: {
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
    streakBest: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(255,255,255,0.03)",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    streakBestLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    streakBestValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#ef4444",
    },
    streakBadge: {
        backgroundColor: "rgba(251, 191, 36, 0.15)",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        alignItems: "center",
    },
    streakBadgeText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#fbbf24",
    },
    modeToggle: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    modeButtonActive: {
        backgroundColor: theme.colors.primary.main,
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text.primary,
    },
    modeButtonTextActive: {
        color: "#FFFFFF",
    },
    datePresetContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
    },
    datePresetButton: {
        flex: 1,
        minWidth: "22%",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    datePresetText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    dateResultCard: {
        backgroundColor: "rgba(16,185,129,0.08)",
        borderRadius: 16,
        padding: 20,
        marginTop: 4,
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.2)",
        alignItems: "center",
    },
    dateResultLabel: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: theme.colors.text.tertiary,
        marginBottom: 6,
    },
    dateResultValue: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 16,
    },
    dateResultDivider: {
        width: "100%",
        height: 1,
        backgroundColor: "rgba(255,255,255,0.1)",
        marginBottom: 16,
    },
    dateResultTarget: {
        fontSize: 36,
        fontWeight: "800",
        color: "#10b981",
        marginBottom: 4,
    },
    currentTargetInfo: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.06)",
    },
    currentTargetLabel: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
        textAlign: "center",
    },
});
