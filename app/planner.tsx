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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_TOTAL_GOAL = 10000000;

const MILESTONES = [
    { label: "1 Lakh", value: 100000 },
    { label: "10 Lakh", value: 1000000 },
    { label: "25 Lakh", value: 2500000 },
    { label: "50 Lakh", value: 5000000 },
    { label: "1 Crore", value: 10000000 },
];

type CalculationResult =
    | {
        type: "pace";
        daily: number;
        duration: string;
        finishDate: string;
    }
    | {
        type: "date";
        targetDate: string;
        duration: string;
        requiredDaily: number;
    }
    | {
        type: "target";
        value: number;
        message: string;
    }
    | {
        type: "error";
        message: string;
    };

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

function formatDateLabel(date: Date): string {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatCompactTimeFromNow(totalDays: number): string {
    if (totalDays <= 0) return "now";

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);

    if (years > 0) {
        return months > 0 ? `${years}y ${months}m` : `${years}y`;
    }

    if (months > 0) {
        return `${months}m`;
    }

    return `${totalDays}d`;
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

function parsePositiveInt(value: string): number | null {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDateInput(value: string): string {
    return value.replace(/[^\d-]/g, "").slice(0, 10);
}

function parseDateInput(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysUntil(targetDate: Date): number {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
    );
    const diffMs = targetDay.getTime() - startOfToday.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function Planner() {
    const HEADER_HEIGHT = 60;
    const insets = useSafeAreaInsets();
    const { tabBarHeight } = useTabBarVisibility();
    const headerTranslateY = useSharedValue(0);

    const [lifetimeTotal, setLifetimeTotal] = useState(0);
    const [dailyTarget, setDailyTarget] = useState(100);
    const [newDailyTarget, setNewDailyTarget] = useState("");
    const [dailyAmount, setDailyAmount] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const goal = await TasbeehService.getUserGoal();
            setLifetimeTotal(goal?.lifetimeTotal ?? 0);
            setDailyTarget(goal?.dailyTarget ?? 100);
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
    const nextMilestone =
        MILESTONES.find((milestone) => lifetimeTotal < milestone.value) ??
        MILESTONES[MILESTONES.length - 1];
    const nextMilestoneProgress = Math.min(
        (lifetimeTotal / nextMilestone.value) * 100,
        100
    );

    const calculateFromDaily = () => {
        const daily = parsePositiveInt(dailyAmount);
        if (!daily) {
            setCalculationResult({ type: "error", message: "Please enter a valid daily amount" });
            return;
        }

        const daysNeeded = Math.ceil(remainingGoal / daily);
        const finishDate = new Date();
        finishDate.setDate(finishDate.getDate() + daysNeeded);

        setCalculationResult({
            type: "pace",
            daily,
            duration: formatTimeFromNow(daysNeeded),
            finishDate: formatDateLabel(finishDate),
        });
    };

    const calculateFromDate = () => {
        const parsed = parseDateInput(targetDate);
        if (!parsed) {
            setCalculationResult({ type: "error", message: "Please enter a valid date (YYYY-MM-DD)" });
            return;
        }

        const daysUntil = getDaysUntil(parsed);
        if (daysUntil <= 0) {
            setCalculationResult({ type: "error", message: "Target date must be in the future" });
            return;
        }

        const requiredDaily = Math.ceil(remainingGoal / daysUntil);
        setCalculationResult({
            type: "date",
            targetDate: formatDateLabel(parsed),
            duration: formatTimeFromNow(daysUntil),
            requiredDaily,
        });
    };

    const updateDailyTarget = async () => {
        const newTarget = parsePositiveInt(newDailyTarget);
        if (!newTarget) {
            setCalculationResult({ type: "error", message: "Please enter a valid target" });
            return;
        }

        try {
            setUpdating(true);
            await TasbeehService.createOrUpdateUserGoal({
                dailyTarget: newTarget,
            });
            setDailyTarget(newTarget);
            setNewDailyTarget("");
            setCalculationResult({
                type: "target",
                value: newTarget,
                message: "Daily target updated",
            });
            setUpdating(false);
        } catch (error) {
            console.error("Failed to update target:", error);
            setCalculationResult({ type: "error", message: "Failed to update target" });
            setUpdating(false);
        }
    };

    const applyCalculatedTarget = async (calculatedDaily: number) => {
        try {
            setUpdating(true);
            await TasbeehService.createOrUpdateUserGoal({
                dailyTarget: calculatedDaily,
            });
            setDailyTarget(calculatedDaily);
            setCalculationResult({
                type: "target",
                value: calculatedDaily,
                message: "Daily target set",
            });
            setUpdating(false);
        } catch (error) {
            console.error("Failed to set target:", error);
            setCalculationResult({ type: "error", message: "Failed to set target" });
            setUpdating(false);
        }
    };

    const calculateMilestone = (milestoneValue: number) => {
        const remaining = Math.max(0, milestoneValue - lifetimeTotal);
        if (remaining === 0) {
            return "Already achieved! 🎉";
        }

        const daily = parsePositiveInt(dailyAmount);
        if (!daily) {
            return `${formatNumber(remaining)} remaining`;
        }

        const daysNeeded = Math.ceil(remaining / daily);
        const finishDate = new Date();
        finishDate.setDate(finishDate.getDate() + daysNeeded);

        return `${formatNumber(remaining)} remaining • about ${formatTimeFromNow(daysNeeded)} at ${formatNumber(daily)}/day • ${formatDateLabel(finishDate)}`;
    };

    const getMilestoneRowMeta = (milestoneValue: number) => {
        const remaining = Math.max(0, milestoneValue - lifetimeTotal);
        const daily = parsePositiveInt(dailyAmount);

        if (remaining === 0) {
            return {
                primary: "Completed",
                secondary: "Milestone achieved",
            };
        }

        if (!daily) {
            return {
                primary: `${formatNumber(remaining)} left`,
                secondary: "Add daily pace for forecast",
            };
        }

        const daysNeeded = Math.ceil(remaining / daily);
        const finishDate = new Date();
        finishDate.setDate(finishDate.getDate() + daysNeeded);

        return {
            primary: `${formatCompactTimeFromNow(daysNeeded)} left`,
            secondary: `${formatDateLabel(finishDate)} at ${formatNumber(daily)}/day`,
        };
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
                        paddingTop: HEADER_HEIGHT + insets.top + 16,
                        paddingBottom: tabBarHeight + 16,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Planning Tools</Text>
                    <Text style={styles.sectionSubtitle}>Calculate your path to 1 Crore</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Current Progress</Text>
                    <Text style={styles.cardValue}>{formatNumber(lifetimeTotal)}</Text>
                    <Text style={styles.cardSubtext}>
                        {formatNumber(remainingGoal)} remaining to reach 1 Crore
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Daily Target</Text>
                    <View style={styles.calculatorCard}>
                        <Text style={styles.calculatorLabel}>
                            Current daily target: {formatNumber(dailyTarget)}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter new daily target"
                            placeholderTextColor={theme.colors.text.tertiary}
                            value={newDailyTarget}
                            onChangeText={setNewDailyTarget}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={styles.calculateButton}
                            onPress={updateDailyTarget}
                            disabled={updating}
                        >
                            <Text style={styles.calculateButtonText}>
                                {updating ? "Updating..." : "Update Target"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Calculate Finish Date</Text>
                    <View style={styles.calculatorCard}>
                        <Text style={styles.calculatorLabel}>If I do this much per day:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 1000"
                            placeholderTextColor={theme.colors.text.tertiary}
                            value={dailyAmount}
                            onChangeText={setDailyAmount}
                            keyboardType="numeric"
                        />
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.calculateButton, styles.calculateButtonSecondary]}
                                onPress={calculateFromDaily}
                            >
                                <Text style={styles.calculateButtonText}>Calculate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.calculateButton}
                                onPress={() => {
                                    const daily = parsePositiveInt(dailyAmount);
                                    if (daily) applyCalculatedTarget(daily);
                                }}
                                disabled={updating}
                            >
                                <Text style={styles.calculateButtonText}>Apply as Target</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Calculate Daily Target</Text>
                    <View style={styles.calculatorCard}>
                        <Text style={styles.calculatorLabel}>If I want to finish by:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD (e.g., 2027-12-31)"
                            placeholderTextColor={theme.colors.text.tertiary}
                            value={targetDate}
                            onChangeText={(text) => setTargetDate(normalizeDateInput(text))}
                            keyboardType="numeric"
                        />
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.calculateButton, styles.calculateButtonSecondary]}
                                onPress={calculateFromDate}
                            >
                                <Text style={styles.calculateButtonText}>Calculate</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.calculateButton}
                                onPress={() => {
                                    const parsed = parseDateInput(targetDate);
                                    if (parsed) {
                                        const daysUntil = getDaysUntil(parsed);
                                        if (daysUntil > 0) {
                                            const requiredDaily = Math.ceil(remainingGoal / daysUntil);
                                            applyCalculatedTarget(requiredDaily);
                                        }
                                    }
                                }}
                                disabled={updating}
                            >
                                <Text style={styles.calculateButtonText}>Apply as Target</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {calculationResult && (
                    <View style={styles.resultCard}>
                        {calculationResult.type === "pace" && (
                            <>
                                <Text style={styles.resultEyebrow}>Projected finish</Text>
                                <Text style={styles.resultHero}>
                                    {formatNumber(calculationResult.daily)}/day
                                </Text>
                                <Text style={styles.resultText}>
                                    You can finish in about {calculationResult.duration}
                                </Text>
                                <Text style={styles.resultAccent}>
                                    on {calculationResult.finishDate}
                                </Text>
                            </>
                        )}

                        {calculationResult.type === "date" && (
                            <>
                                <Text style={styles.resultEyebrow}>Required daily target</Text>
                                <Text style={styles.resultHero}>
                                    {formatNumber(calculationResult.requiredDaily)}/day
                                </Text>
                                <Text style={styles.resultText}>
                                    To finish in about {calculationResult.duration}
                                </Text>
                                <Text style={styles.resultAccent}>
                                    by {calculationResult.targetDate}
                                </Text>
                            </>
                        )}

                        {calculationResult.type === "target" && (
                            <>
                                <Text style={styles.resultEyebrow}>{calculationResult.message}</Text>
                                <Text style={styles.resultHero}>
                                    {formatNumber(calculationResult.value)}/day
                                </Text>
                            </>
                        )}

                        {calculationResult.type === "error" && (
                            <Text style={styles.resultText}>{calculationResult.message}</Text>
                        )}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Milestone Planner</Text>
                    <Text style={styles.sectionSubtitle}>
                        Track your journey to each milestone
                    </Text>
                    <View style={styles.milestonesContainer}>
                        <View style={styles.nextMilestoneCard}>
                            <Text style={styles.nextMilestoneEyebrow}>Next milestone</Text>
                            <View style={styles.nextMilestoneHeader}>
                                <Text style={styles.nextMilestoneLabel}>{nextMilestone.label}</Text>
                                <Text style={styles.nextMilestoneValue}>
                                    {formatNumber(nextMilestone.value)}
                                </Text>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        {
                                            width: `${nextMilestoneProgress}%`,
                                            backgroundColor: "#10b981",
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.nextMilestoneDetails}>
                                {calculateMilestone(nextMilestone.value)}
                            </Text>
                        </View>

                        <View style={styles.milestoneListCard}>
                            <Text style={styles.milestoneListTitle}>All milestones</Text>
                            {MILESTONES.map((milestone) => {
                                if (milestone.value === nextMilestone.value) {
                                    return null;
                                }

                                const isAchieved = lifetimeTotal >= milestone.value;
                                const isFinalGoal = milestone.value === DEFAULT_TOTAL_GOAL;
                                const rowMeta = getMilestoneRowMeta(milestone.value);

                                return (
                                    <View
                                        key={milestone.value}
                                        style={[
                                            styles.milestoneRowCard,
                                            isAchieved && styles.milestoneRowCardAchieved,
                                        ]}
                                    >
                                        <View style={styles.milestoneRowTop}>
                                            <Text style={styles.milestoneRowLabel}>
                                                {milestone.label}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.milestoneRowStatus,
                                                    isAchieved
                                                        ? styles.milestoneRowStatusAchieved
                                                        : isFinalGoal
                                                            ? styles.milestoneRowStatusFinal
                                                            : styles.milestoneRowStatusUpcoming,
                                                ]}
                                            >
                                                {isAchieved
                                                    ? "Achieved"
                                                    : isFinalGoal
                                                        ? "Final goal"
                                                        : "Upcoming"}
                                            </Text>
                                        </View>
                                        <Text style={styles.milestoneRowPrimary}>
                                            {rowMeta.primary}
                                        </Text>
                                        <Text style={styles.milestoneRowDetails}>
                                            {rowMeta.secondary}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
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
    card: {
        backgroundColor: "rgba(18, 18, 20, 0.82)",
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        marginBottom: 24,
        alignItems: "center",
    },
    cardLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 36,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    cardSubtext: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
        textAlign: "center",
    },
    calculatorCard: {
        backgroundColor: "rgba(18, 18, 20, 0.82)",
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    calculatorLabel: {
        fontSize: 15,
        color: theme.colors.text.secondary,
        marginBottom: 12,
    },
    input: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        color: theme.colors.text.primary,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 12,
    },
    calculateButton: {
        backgroundColor: theme.colors.primary.main,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: "center",
        flex: 1,
    },
    calculateButtonSecondary: {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    calculateButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
    },
    resultCard: {
        backgroundColor: "rgba(16,185,129,0.08)",
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.18)",
        marginBottom: 24,
        alignItems: "center",
    },
    resultEyebrow: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: theme.colors.text.secondary,
        marginBottom: 8,
    },
    resultHero: {
        fontSize: 28,
        fontWeight: "800",
        color: theme.colors.text.primary,
        marginBottom: 8,
        textAlign: "center",
    },
    resultText: {
        fontSize: 15,
        color: theme.colors.text.primary,
        lineHeight: 22,
        textAlign: "center",
    },
    resultAccent: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: "700",
        color: "#10b981",
        textAlign: "center",
    },
    milestonesContainer: {
        marginTop: 16,
        gap: 16,
    },
    nextMilestoneCard: {
        backgroundColor: "rgba(16,185,129,0.10)",
        borderRadius: 24,
        padding: 22,
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.18)",
    },
    nextMilestoneEyebrow: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: theme.colors.text.secondary,
        marginBottom: 10,
    },
    nextMilestoneHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 12,
        marginBottom: 14,
    },
    nextMilestoneLabel: {
        fontSize: 24,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    nextMilestoneValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#baf7e6",
    },
    nextMilestoneDetails: {
        marginTop: 12,
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.text.primary,
    },
    milestoneListCard: {
        backgroundColor: "rgba(18, 18, 20, 0.78)",
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    milestoneListTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.secondary,
        marginBottom: 14,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    milestoneRowCard: {
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.06)",
    },
    milestoneRowCardAchieved: {
        opacity: 0.72,
    },
    milestoneRowTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    milestoneRowLabel: {
        fontSize: 17,
        fontWeight: "700",
        color: theme.colors.text.primary,
        flex: 1,
    },
    milestoneRowStatus: {
        fontSize: 12,
        fontWeight: "700",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: "hidden",
    },
    milestoneRowStatusAchieved: {
        color: "#baf7e6",
        backgroundColor: "rgba(16,185,129,0.16)",
    },
    milestoneRowStatusUpcoming: {
        color: theme.colors.text.secondary,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    milestoneRowStatusFinal: {
        color: "#ffdca8",
        backgroundColor: "rgba(255,184,77,0.14)",
    },
    milestoneRowPrimary: {
        marginTop: 8,
        fontSize: 15,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    milestoneRowDetails: {
        marginTop: 4,
        fontSize: 12,
        color: theme.colors.text.tertiary,
        lineHeight: 17,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
});
