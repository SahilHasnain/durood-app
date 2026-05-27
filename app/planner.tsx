import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const RING_SIZE = 180;
const RING_STROKE_WIDTH = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MILESTONES = [
    { label: "1 Lakh", value: 100000, emoji: "📿" },
    { label: "10 Lakh", value: 1000000, emoji: "🌙" },
    { label: "50 Lakh", value: 5000000, emoji: "✨" },
    { label: "1 Crore", value: 10000000, emoji: "☪️" },
];

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
    const progressPercent = totalGoal > 0 ? Math.min((lifetimeTotal / totalGoal) * 100, 100) : 0;
    const progressOffset = RING_CIRCUMFERENCE - (progressPercent / 100) * RING_CIRCUMFERENCE;

    const daysToFinish = dailyTarget > 0 ? Math.ceil(remainingGoal / dailyTarget) : 0;
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysToFinish);

    const nextMilestone =
        MILESTONES.find((milestone) => lifetimeTotal < milestone.value) ??
        MILESTONES[MILESTONES.length - 1];
    const nextMilestoneRemaining = Math.max(0, nextMilestone.value - lifetimeTotal);
    const daysToNextMilestone =
        dailyTarget > 0 ? Math.ceil(nextMilestoneRemaining / dailyTarget) : 0;

    // Calculate pace status
    const averagePerDay = progressStats?.averagePerDay ?? 0;
    const requiredDailyPace = dailyTarget;
    const paceDifference = averagePerDay - requiredDailyPace;
    const isPaceAhead = paceDifference > 0;
    const isPaceOnTrack = Math.abs(paceDifference) < requiredDailyPace * 0.1; // Within 10%
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
                <View style={styles.heroCard}>
                    <Text style={styles.heroEyebrow}>
                        Journey to {formatCompactNumber(totalGoal)}
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
                                strokeDashoffset={progressOffset}
                                fill="none"
                                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                            />
                        </Svg>
                        <View style={styles.ringInner}>
                            <Text style={styles.ringPercent}>{progressPercent.toFixed(1)}%</Text>
                            <Text style={styles.ringLabel}>Complete</Text>
                        </View>
                    </View>
                    <View style={styles.heroStats}>
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatValue}>{formatCompactNumber(lifetimeTotal)}</Text>
                            <Text style={styles.heroStatLabel}>Completed</Text>
                        </View>
                        <View style={styles.heroDivider} />
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatValue}>{formatCompactNumber(remainingGoal)}</Text>
                            <Text style={styles.heroStatLabel}>Remaining</Text>
                        </View>
                    </View>
                </View>

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
                        <TouchableOpacity
                            style={[styles.button, updating && styles.buttonDisabled]}
                            onPress={handleUpdateDailyTarget}
                            disabled={updating}
                        >
                            <Text style={styles.buttonText}>
                                {updating ? "Updating..." : "Set Daily Target"}
                            </Text>
                        </TouchableOpacity>

                        {dailyTarget > 0 && (
                            <View style={styles.projectionCard}>
                                <Text style={styles.projectionEyebrow}>Your projection</Text>
                                <Text style={styles.projectionValue}>{formatNumber(dailyTarget)}/day</Text>
                                <Text style={styles.projectionText}>
                                    You&apos;ll reach {formatCompactNumber(totalGoal)} in about
                                </Text>
                                <Text style={styles.projectionDuration}>
                                    {formatDuration(daysToFinish)}
                                </Text>
                                <Text style={styles.projectionDate}>
                                    by {formatDateLabel(finishDate)}
                                </Text>
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
        opacity: 0.15,
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
});
