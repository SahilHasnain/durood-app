import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const DEFAULT_TOTAL_GOAL = 10000000;
const RING_SIZE = 180;
const RING_STROKE_WIDTH = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MILESTONES = [
    { label: "1 Lakh", value: 100000, emoji: "🎯" },
    { label: "10 Lakh", value: 1000000, emoji: "🚀" },
    { label: "50 Lakh", value: 5000000, emoji: "⭐" },
    { label: "1 Crore", value: 10000000, emoji: "🏆" },
];

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

function formatCompactNumber(value: number): string {
    if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
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
    const headerTranslateY = useSharedValue(0);

    const [lifetimeTotal, setLifetimeTotal] = useState(0);
    const [dailyTarget, setDailyTarget] = useState(100);
    const [dailyInput, setDailyInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const goal = await TasbeehService.getUserGoal();
            setLifetimeTotal(goal?.lifetimeTotal ?? 0);
            setDailyTarget(goal?.dailyTarget ?? 100);
            setDailyInput((goal?.dailyTarget ?? 100).toString());
            setLoading(false);
        } catch (error) {
            console.error("Failed to load data:", error);
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const remainingGoal = Math.max(0, DEFAULT_TOTAL_GOAL - lifetimeTotal);
    const progressPercent = Math.min((lifetimeTotal / DEFAULT_TOTAL_GOAL) * 100, 100);
    const progressOffset = RING_CIRCUMFERENCE - (progressPercent / 100) * RING_CIRCUMFERENCE;

    // Calculate finish date based on current daily target
    const daysToFinish = dailyTarget > 0 ? Math.ceil(remainingGoal / dailyTarget) : 0;
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysToFinish);

    // Find next milestone
    const nextMilestone = MILESTONES.find((m) => lifetimeTotal < m.value) ?? MILESTONES[MILESTONES.length - 1];
    const nextMilestoneRemaining = Math.max(0, nextMilestone.value - lifetimeTotal);
    const daysToNextMilestone = dailyTarget > 0 ? Math.ceil(nextMilestoneRemaining / dailyTarget) : 0;

    const updateDailyTarget = async () => {
        const newTarget = parseInt(dailyInput.replace(/,/g, ""), 10);
        if (!newTarget || newTarget <= 0) return;

        try {
            setUpdating(true);
            await TasbeehService.createOrUpdateUserGoal({
                dailyTarget: newTarget,
            });
            setDailyTarget(newTarget);
            setUpdating(false);
        } catch (error) {
            console.error("Failed to update target:", error);
            setUpdating(false);
        }
    };

    if (loading) {
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
                {/* Hero Progress Ring */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroEyebrow}>Journey to 1 Crore</Text>
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

                {/* Daily Target Calculator */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Set Your Daily Pace</Text>
                    <View style={styles.calculatorCard}>
                        <Text style={styles.calculatorLabel}>I can do this much per day:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 1000"
                            placeholderTextColor={theme.colors.text.tertiary}
                            value={dailyInput}
                            onChangeText={setDailyInput}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={[styles.button, updating && styles.buttonDisabled]}
                            onPress={updateDailyTarget}
                            disabled={updating}
                        >
                            <Text style={styles.buttonText}>
                                {updating ? "Updating..." : "Set Daily Target"}
                            </Text>
                        </TouchableOpacity>

                        {dailyTarget > 0 && (
                            <View style={styles.projectionCard}>
                                <Text style={styles.projectionEyebrow}>Your projection</Text>
                                <Text style={styles.projectionValue}>
                                    {formatNumber(dailyTarget)}/day
                                </Text>
                                <Text style={styles.projectionText}>
                                    You'll reach 1 Crore in about
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

                {/* Next Milestone */}
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

                {/* All Milestones */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>All Milestones</Text>
                    <View style={styles.milestonesGrid}>
                        {MILESTONES.map((milestone) => {
                            const isAchieved = lifetimeTotal >= milestone.value;
                            const remaining = Math.max(0, milestone.value - lifetimeTotal);
                            const daysToMilestone = dailyTarget > 0 ? Math.ceil(remaining / dailyTarget) : 0;

                            return (
                                <View
                                    key={milestone.value}
                                    style={[
                                        styles.milestoneGridItem,
                                        isAchieved && styles.milestoneGridItemAchieved,
                                    ]}
                                >
                                    <Text style={styles.milestoneGridEmoji}>{milestone.emoji}</Text>
                                    <Text style={styles.milestoneGridLabel}>{milestone.label}</Text>
                                    {isAchieved ? (
                                        <Text style={styles.milestoneGridStatus}>✓ Done</Text>
                                    ) : (
                                        <>
                                            <Text style={styles.milestoneGridRemaining}>
                                                {formatCompactNumber(remaining)}
                                            </Text>
                                            {dailyTarget > 0 && (
                                                <Text style={styles.milestoneGridDuration}>
                                                    {formatDuration(daysToMilestone)}
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </View>
                            );
                        })}
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
        borderColor: "rgba(16,185,129,0.15)",
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
        borderColor: theme.colors.border.primary,
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
        borderColor: theme.colors.border.primary,
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
        borderTopColor: theme.colors.border.primary,
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
        borderColor: theme.colors.border.primary,
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
    milestonesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    milestoneGridItem: {
        flex: 1,
        minWidth: "47%",
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        alignItems: "center",
    },
    milestoneGridItemAchieved: {
        backgroundColor: "rgba(16,185,129,0.08)",
        borderColor: "rgba(16,185,129,0.15)",
    },
    milestoneGridEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    milestoneGridLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 8,
        textAlign: "center",
    },
    milestoneGridStatus: {
        fontSize: 13,
        fontWeight: "600",
        color: "#10b981",
    },
    milestoneGridRemaining: {
        fontSize: 16,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    milestoneGridDuration: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        textAlign: "center",
    },
});
