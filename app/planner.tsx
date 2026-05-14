import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const LIFETIME_TOTAL_KEY = "tasbeeh_lifetime_total";
const DAILY_TARGET_KEY = "tasbeeh_target";
const DEFAULT_TOTAL_GOAL = 10000000;

const MILESTONES = [
    { label: "1 Lakh", value: 100000 },
    { label: "10 Lakh", value: 1000000 },
    { label: "25 Lakh", value: 2500000 },
    { label: "50 Lakh", value: 5000000 },
    { label: "1 Crore", value: 10000000 },
];

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
    const [calculationResult, setCalculationResult] = useState<string | null>(null);

    const loadLifetimeTotal = useCallback(async () => {
        try {
            const [lifetimeStr, targetStr] = await Promise.all([
                AsyncStorage.getItem(LIFETIME_TOTAL_KEY),
                AsyncStorage.getItem(DAILY_TARGET_KEY),
            ]);
            const total = lifetimeStr ? parseInt(lifetimeStr, 10) : 0;
            const target = targetStr ? parseInt(targetStr, 10) : 100;
            setLifetimeTotal(total);
            setDailyTarget(target);
        } catch (error) {
            console.error("Failed to load data:", error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadLifetimeTotal();
        }, [loadLifetimeTotal])
    );

    useEffect(() => {
        loadLifetimeTotal();
    }, [loadLifetimeTotal]);

    const remainingGoal = Math.max(0, DEFAULT_TOTAL_GOAL - lifetimeTotal);

    const calculateFromDaily = () => {
        const daily = parsePositiveInt(dailyAmount);
        if (!daily) {
            setCalculationResult("Please enter a valid daily amount");
            return;
        }

        const daysNeeded = Math.ceil(remainingGoal / daily);
        const finishDate = new Date();
        finishDate.setDate(finishDate.getDate() + daysNeeded);

        setCalculationResult(
            `At ${formatNumber(daily)} per day, you'll finish in ${formatNumber(daysNeeded)} days (${formatDateLabel(finishDate)})`
        );
    };

    const calculateFromDate = () => {
        const parsed = parseDateInput(targetDate);
        if (!parsed) {
            setCalculationResult("Please enter a valid date (YYYY-MM-DD)");
            return;
        }

        const daysUntil = getDaysUntil(parsed);
        if (daysUntil <= 0) {
            setCalculationResult("Target date must be in the future");
            return;
        }

        const requiredDaily = Math.ceil(remainingGoal / daysUntil);
        setCalculationResult(
            `To finish by ${formatDateLabel(parsed)}, you need ${formatNumber(requiredDaily)} per day for ${formatNumber(daysUntil)} days`
        );
    };

    const updateDailyTarget = async () => {
        const newTarget = parsePositiveInt(newDailyTarget);
        if (!newTarget) {
            setCalculationResult("Please enter a valid target");
            return;
        }

        try {
            await AsyncStorage.setItem(DAILY_TARGET_KEY, newTarget.toString());
            setDailyTarget(newTarget);
            setNewDailyTarget("");
            setCalculationResult(`Daily target updated to ${formatNumber(newTarget)}`);
        } catch (error) {
            console.error("Failed to update target:", error);
            setCalculationResult("Failed to update target");
        }
    };

    const applyCalculatedTarget = async (calculatedDaily: number) => {
        try {
            await AsyncStorage.setItem(DAILY_TARGET_KEY, calculatedDaily.toString());
            setDailyTarget(calculatedDaily);
            setCalculationResult(`Daily target set to ${formatNumber(calculatedDaily)}`);
        } catch (error) {
            console.error("Failed to set target:", error);
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

        return `${formatNumber(remaining)} remaining • ${formatNumber(daysNeeded)} days at ${formatNumber(daily)}/day (${formatDateLabel(finishDate)})`;
    };

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
                    <Text style={styles.sectionTitle}>Planning Tools</Text>
                    <Text style={styles.sectionSubtitle}>
                        Calculate your path to 1 Crore
                    </Text>
                </View>

                {/* Current Progress */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Current Progress</Text>
                    <Text style={styles.cardValue}>{formatNumber(lifetimeTotal)}</Text>
                    <Text style={styles.cardSubtext}>
                        {formatNumber(remainingGoal)} remaining to reach 1 Crore
                    </Text>
                </View>

                {/* Daily Target Adjustment */}
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
                        >
                            <Text style={styles.calculateButtonText}>Update Target</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calculator 1: From Daily Amount */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Calculate Finish Date</Text>
                    <View style={styles.calculatorCard}>
                        <Text style={styles.calculatorLabel}>
                            If I do this much per day:
                        </Text>
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
                            >
                                <Text style={styles.calculateButtonText}>Apply as Target</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Calculator 2: From Target Date */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Calculate Daily Target</Text>
                    <View style={styles.calculatorCard}>
                        <Text style={styles.calculatorLabel}>
                            If I want to finish by:
                        </Text>
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
                            >
                                <Text style={styles.calculateButtonText}>Apply as Target</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Result Display */}
                {calculationResult && (
                    <View style={styles.resultCard}>
                        <Text style={styles.resultText}>{calculationResult}</Text>
                    </View>
                )}

                {/* Milestone Planner */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Milestone Planner</Text>
                    <Text style={styles.sectionSubtitle}>
                        Track your journey to each milestone
                    </Text>
                    <View style={styles.milestonesContainer}>
                        {MILESTONES.map((milestone) => {
                            const isAchieved = lifetimeTotal >= milestone.value;
                            const progress = Math.min(
                                (lifetimeTotal / milestone.value) * 100,
                                100
                            );

                            return (
                                <View key={milestone.value} style={styles.milestoneCard}>
                                    <View style={styles.milestoneHeader}>
                                        <Text style={styles.milestoneLabel}>
                                            {milestone.label}
                                        </Text>
                                        {isAchieved && (
                                            <Text style={styles.achievedBadge}>✓ Achieved</Text>
                                        )}
                                    </View>
                                    <View style={styles.progressBarContainer}>
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${progress}%`,
                                                    backgroundColor: isAchieved
                                                        ? "#10b981"
                                                        : theme.colors.primary.main,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.milestoneDetails}>
                                        {calculateMilestone(milestone.value)}
                                    </Text>
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
    card: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
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
    },
    calculatorCard: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
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
    calculateButton: {
        backgroundColor: theme.colors.primary.main,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        flex: 1,
    },
    calculateButtonSecondary: {
        backgroundColor: theme.colors.surface.elevated,
        borderWidth: 1,
        borderColor: theme.colors.border.secondary,
    },
    calculateButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
    },
    resultCard: {
        backgroundColor: theme.colors.surface.elevated,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border.secondary,
        marginBottom: 24,
    },
    resultText: {
        fontSize: 15,
        color: theme.colors.text.primary,
        lineHeight: 22,
        textAlign: "center",
    },
    milestonesContainer: {
        marginTop: 16,
        gap: 16,
    },
    milestoneCard: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    milestoneHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    milestoneLabel: {
        fontSize: 18,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    achievedBadge: {
        fontSize: 13,
        fontWeight: "600",
        color: "#10b981",
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 4,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    milestoneDetails: {
        fontSize: 13,
        color: theme.colors.text.secondary,
        lineHeight: 18,
    },
});
