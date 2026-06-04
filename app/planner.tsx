import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const GOAL_PRESETS = [
    { label: "1L", value: 100000 },
    { label: "10L", value: 1000000 },
    { label: "50L", value: 5000000 },
    { label: "1Cr", value: 10000000 },
];

const DATE_PRESETS = [
    { label: "3 mo", days: 90 },
    { label: "6 mo", days: 180 },
    { label: "1 yr", days: 365 },
    { label: "2 yr", days: 730 },
];

const DAILY_PRESETS = [100, 500, 1000, 3000];

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(Math.max(0, Math.round(value)));
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

function parseAmount(value: string): number {
    return parseInt(value.replace(/,/g, ""), 10) || 0;
}

function formatInput(value: string): string {
    const cleaned = value.replace(/[^0-9]/g, "");
    return cleaned ? formatNumber(parseInt(cleaned, 10)) : "";
}

function addDays(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

function daysBetween(targetDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    return Math.max(1, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

function formatDuration(days: number): string {
    if (days <= 0) return "today";
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remainingDays = days % 30;

    if (years > 0) return months > 0 ? `${years}y ${months}mo` : `${years}y`;
    if (months > 0) return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months}mo`;
    return `${days}d`;
}

export default function Planner() {
    const HEADER_HEIGHT = 60;
    const { tabBarHeight } = useTabBarVisibility();
    const { user } = useAuth();
    const headerTranslateY = useSharedValue(0);

    const plannerData = useTasbeehStore((state) => state.plannerData);
    const plannerLoading = useTasbeehStore((state) => state.plannerLoading);
    const plannerInitialized = useTasbeehStore((state) => state.plannerInitialized);
    const progressStats = useTasbeehStore((state) => state.progressStats);
    const initializedUserId = useTasbeehStore((state) => state.initializedUserId);
    const loadPlannerData = useTasbeehStore((state) => state.loadPlannerData);
    const loadProgressData = useTasbeehStore((state) => state.loadProgressData);
    const updateDailyTarget = useTasbeehStore((state) => state.updateDailyTarget);
    const updateTotalGoal = useTasbeehStore((state) => state.updateTotalGoal);

    const [mode, setMode] = useState<"date" | "pace">("date");
    const [goalInput, setGoalInput] = useState("");
    const [dailyInput, setDailyInput] = useState("");
    const [targetDate, setTargetDate] = useState(addDays(365));
    const [updating, setUpdating] = useState(false);

    useFocusEffect(
        useCallback(() => {
            const activeUserId = user?.id;
            if (!plannerInitialized || initializedUserId !== activeUserId) {
                void loadPlannerData(activeUserId);
            }
            if (!progressStats) {
                void loadProgressData(activeUserId);
            }
        }, [
            user?.id,
            plannerInitialized,
            initializedUserId,
            loadPlannerData,
            progressStats,
            loadProgressData,
        ])
    );

    useEffect(() => {
        if (!plannerData) return;
        setGoalInput(formatNumber(plannerData.totalGoal));
        setDailyInput(formatNumber(plannerData.dailyTarget));
    }, [plannerData]);

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

    const lifetimeTotal = progressStats?.lifetimeTotal ?? plannerData.lifetimeTotal;
    const currentAvg = progressStats?.averagePerDay ?? 0;
    const goal = parseAmount(goalInput) || plannerData.totalGoal;
    const remaining = Math.max(0, goal - lifetimeTotal);
    const targetDays = daysBetween(targetDate);
    const calculatedDailyTarget = mode === "date"
        ? Math.ceil(remaining / targetDays)
        : parseAmount(dailyInput);
    const finishDays = calculatedDailyTarget > 0 ? Math.ceil(remaining / calculatedDailyTarget) : 0;
    const finishDate = addDays(finishDays);
    const paceGap = calculatedDailyTarget - currentAvg;
    const completionPercent = goal > 0 ? Math.min((lifetimeTotal / goal) * 100, 100) : 0;

    const handleUpdatePlan = async () => {
        if (goal <= 0 || calculatedDailyTarget <= 0) {
            Alert.alert("Check plan", "Enter a goal and daily target first.");
            return;
        }

        try {
            setUpdating(true);
            await updateTotalGoal(goal, user?.id);
            await updateDailyTarget(calculatedDailyTarget, user?.id);
            setDailyInput(formatNumber(calculatedDailyTarget));
            Alert.alert("Plan updated", "Your planner is ready.");
        } catch (error) {
            console.error("Failed to update plan:", error);
            Alert.alert("Update failed", "Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: HEADER_HEIGHT + 8, paddingBottom: tabBarHeight + 32 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.heroCard}>
                    <Text style={styles.eyebrow}>Your Plan</Text>
                    <Text style={styles.heroTitle}>{formatNumber(calculatedDailyTarget)}/day</Text>
                    <Text style={styles.heroSubtitle}>
                        {mode === "date"
                            ? `to finish by ${formatDate(targetDate)}`
                            : `finishes around ${formatDate(finishDate)}`}
                    </Text>

                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
                    </View>
                    <View style={styles.heroStats}>
                        <Text style={styles.heroStat}>{formatCompactNumber(lifetimeTotal)} done</Text>
                        <Text style={styles.heroStat}>{formatCompactNumber(remaining)} left</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Goal</Text>
                    <View style={styles.presetRow}>
                        {GOAL_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset.value}
                                style={[styles.presetButton, goal === preset.value && styles.presetButtonActive]}
                                onPress={() => setGoalInput(formatNumber(preset.value))}
                            >
                                <Text style={[styles.presetText, goal === preset.value && styles.presetTextActive]}>
                                    {preset.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={styles.input}
                        value={goalInput}
                        onChangeText={(text) => setGoalInput(formatInput(text))}
                        keyboardType="numeric"
                        placeholder="Custom lifetime goal"
                        placeholderTextColor={theme.colors.text.tertiary}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Build Plan</Text>
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.modeButton, mode === "date" && styles.modeButtonActive]}
                            onPress={() => setMode("date")}
                        >
                            <Text style={[styles.modeText, mode === "date" && styles.modeTextActive]}>Finish Date</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeButton, mode === "pace" && styles.modeButtonActive]}
                            onPress={() => setMode("pace")}
                        >
                            <Text style={[styles.modeText, mode === "pace" && styles.modeTextActive]}>Daily Pace</Text>
                        </TouchableOpacity>
                    </View>

                    {mode === "date" ? (
                        <>
                            <Text style={styles.helperText}>Choose when you want to complete the goal.</Text>
                            <View style={styles.presetRow}>
                                {DATE_PRESETS.map((preset) => {
                                    const isActive = daysBetween(targetDate) === preset.days;
                                    return (
                                        <TouchableOpacity
                                            key={preset.days}
                                            style={[styles.presetButton, isActive && styles.presetButtonActive]}
                                            onPress={() => setTargetDate(addDays(preset.days))}
                                        >
                                            <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                                                {preset.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.helperText}>Set what you can realistically do every day.</Text>
                            <View style={styles.presetRow}>
                                {DAILY_PRESETS.map((preset) => (
                                    <TouchableOpacity
                                        key={preset}
                                        style={[styles.presetButton, calculatedDailyTarget === preset && styles.presetButtonActive]}
                                        onPress={() => setDailyInput(formatNumber(preset))}
                                    >
                                        <Text style={[styles.presetText, calculatedDailyTarget === preset && styles.presetTextActive]}>
                                            {formatCompactNumber(preset)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                style={styles.input}
                                value={dailyInput}
                                onChangeText={(text) => setDailyInput(formatInput(text))}
                                keyboardType="numeric"
                                placeholder="Custom daily target"
                                placeholderTextColor={theme.colors.text.tertiary}
                            />
                        </>
                    )}
                </View>

                <View style={styles.previewCard}>
                    <Text style={styles.sectionTitle}>Impact Preview</Text>
                    <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Daily target</Text>
                        <Text style={styles.previewValue}>{formatNumber(calculatedDailyTarget)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Estimated finish</Text>
                        <Text style={styles.previewValue}>{formatDuration(finishDays)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Versus current avg</Text>
                        <Text style={[styles.previewValue, paceGap > 0 ? styles.warningText : styles.goodText]}>
                            {paceGap > 0 ? `+${formatNumber(paceGap)}/day` : "On pace"}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.primaryButton, updating && styles.primaryButtonDisabled]}
                    onPress={handleUpdatePlan}
                    disabled={updating}
                    activeOpacity={0.85}
                >
                    <Text style={styles.primaryButtonText}>{updating ? "Updating..." : "Update Plan"}</Text>
                </TouchableOpacity>
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
    heroCard: {
        borderRadius: 28,
        padding: 24,
        backgroundColor: "rgba(16,185,129,0.1)",
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.22)",
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.7,
        textTransform: "uppercase",
        color: theme.colors.text.secondary,
        marginBottom: 10,
    },
    heroTitle: {
        fontSize: 42,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    heroSubtitle: {
        marginTop: 6,
        fontSize: 15,
        color: theme.colors.text.secondary,
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        marginTop: 24,
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#10b981",
    },
    heroStats: {
        marginTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    heroStat: {
        fontSize: 13,
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
        marginBottom: 14,
    },
    helperText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: 12,
    },
    presetRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    presetButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    presetButtonActive: {
        backgroundColor: "rgba(16,185,129,0.16)",
        borderColor: "#10b981",
    },
    presetText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    presetTextActive: {
        color: "#10b981",
    },
    input: {
        borderRadius: 16,
        padding: 16,
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        color: theme.colors.text.primary,
        fontSize: 16,
    },
    modeToggle: {
        flexDirection: "row",
        padding: 4,
        borderRadius: 16,
        backgroundColor: theme.colors.background.secondary,
        marginBottom: 16,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    modeButtonActive: {
        backgroundColor: "#10b981",
    },
    modeText: {
        fontSize: 14,
        fontWeight: "700",
        color: theme.colors.text.secondary,
    },
    modeTextActive: {
        color: "#ffffff",
    },
    previewCard: {
        borderRadius: 24,
        padding: 18,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
    },
    previewRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    previewLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    previewValue: {
        fontSize: 16,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.07)",
        marginVertical: 14,
    },
    goodText: {
        color: "#10b981",
    },
    warningText: {
        color: "#f59e0b",
    },
    primaryButton: {
        minHeight: 56,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10b981",
        marginTop: 4,
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    primaryButtonText: {
        fontSize: 17,
        fontWeight: "800",
        color: "#ffffff",
    },
});
