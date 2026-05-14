import KeyboardSpacer from "@/components/KeyboardSpacer";
import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    ImageBackground,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const TASBEEH_PROGRESS_COLOR = "#10b981";
const DAILY_COUNT_KEY = "tasbeeh_count";
const DAILY_TARGET_KEY = "tasbeeh_target";
const LAST_ACTIVE_DATE_KEY = "tasbeeh_last_active_date";
const LIFETIME_TOTAL_KEY = "tasbeeh_lifetime_total";
const STREAK_KEY = "tasbeeh_streak";

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
}

function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
    ).padStart(2, "0")}`;
}

function getYesterdayKey(): string {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
    ).padStart(2, "0")}`;
}

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Home() {
    const HEADER_HEIGHT = 60;
    const RING_SIZE = 200;
    const RING_STROKE_WIDTH = 8;
    const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

    const [count, setCount] = useState(0);
    const [target, setTarget] = useState(100);
    const [lifetimeTotal, setLifetimeTotal] = useState(0);
    const [streak, setStreak] = useState(0);
    const [manualAddValue, setManualAddValue] = useState("");
    const [showManualSheet, setShowManualSheet] = useState(false);
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionPaused, setSessionPaused] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);
    const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
    const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(RING_CIRCUMFERENCE)).current;
    const [animatedProgressOffset, setAnimatedProgressOffset] = useState(RING_CIRCUMFERENCE);

    const { translateY: tabBarTranslateY, tabBarHeight, showTabBar } = useTabBarVisibility();
    const insets = useSafeAreaInsets();
    const headerTranslateY = useSharedValue(0);

    const todayKey = getTodayKey();
    const todaysRemaining = Math.max(0, target - count);
    const progress = target > 0 ? Math.min((count / target) * 100, 100) : 0;
    const isComplete = count >= target;
    const progressOffset = RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;

    const projectedTodayCompleted = count + sessionCount;
    const sessionProgress = target > 0 ? Math.min((projectedTodayCompleted / target) * 100, 100) : 0;
    const sessionProgressOffset = RING_CIRCUMFERENCE - (sessionProgress / 100) * RING_CIRCUMFERENCE;

    useFocusEffect(
        useCallback(() => {
            showTabBar();
            headerTranslateY.value = withTiming(0, { duration: 300 });
        }, [headerTranslateY, showTabBar])
    );

    useEffect(() => {
        if (!sessionActive || sessionPaused || !sessionStartedAt) return;
        const interval = setInterval(() => {
            setSessionElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionActive, sessionPaused, sessionStartedAt]);

    const loadData = useCallback(async () => {
        try {
            const [savedCount, savedTarget, savedLastActiveDate, savedLifetimeTotal, savedStreak] =
                await Promise.all([
                    AsyncStorage.getItem(DAILY_COUNT_KEY),
                    AsyncStorage.getItem(DAILY_TARGET_KEY),
                    AsyncStorage.getItem(LAST_ACTIVE_DATE_KEY),
                    AsyncStorage.getItem(LIFETIME_TOTAL_KEY),
                    AsyncStorage.getItem(STREAK_KEY),
                ]);

            const savedCountValue = savedCount ? Number.parseInt(savedCount, 10) : 0;
            const savedTargetValue = savedTarget ? Number.parseInt(savedTarget, 10) : 100;
            const savedLifetimeValue = savedLifetimeTotal
                ? Number.parseInt(savedLifetimeTotal, 10)
                : savedCountValue;
            let savedStreakValue = savedStreak ? Number.parseInt(savedStreak, 10) : 0;

            if (savedLastActiveDate && savedLastActiveDate !== todayKey) {
                if (savedLastActiveDate !== getYesterdayKey()) {
                    savedStreakValue = 0;
                }
                setCount(0);
            } else {
                setCount(savedCountValue);
            }

            setTarget(savedTargetValue);
            setLifetimeTotal(savedLifetimeValue);
            setStreak(savedStreakValue);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    }, [todayKey]);

    const saveData = useCallback(async () => {
        try {
            const historyStr = await AsyncStorage.getItem("tasbeeh_daily_history");
            const dailyHistory: Array<{ date: string; count: number; target: number }> = historyStr
                ? JSON.parse(historyStr)
                : [];

            const todayIndex = dailyHistory.findIndex((r) => r.date === todayKey);
            if (todayIndex >= 0) {
                dailyHistory[todayIndex] = { date: todayKey, count, target };
            } else {
                dailyHistory.push({ date: todayKey, count, target });
            }

            const recentHistory = dailyHistory.slice(-90);

            await Promise.all([
                AsyncStorage.setItem(DAILY_COUNT_KEY, count.toString()),
                AsyncStorage.setItem(DAILY_TARGET_KEY, target.toString()),
                AsyncStorage.setItem(LIFETIME_TOTAL_KEY, lifetimeTotal.toString()),
                AsyncStorage.setItem(STREAK_KEY, streak.toString()),
                AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayKey),
                AsyncStorage.setItem("tasbeeh_daily_history", JSON.stringify(recentHistory)),
            ]);
        } catch (error) {
            console.error("Failed to save data", error);
        }
    }, [count, lifetimeTotal, streak, target, todayKey]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        saveData();
    }, [saveData]);

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: showManualSheet ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [showManualSheet, slideAnim]);

    useEffect(() => {
        const listenerId = progressAnim.addListener(({ value }) => {
            setAnimatedProgressOffset(value);
        });
        return () => {
            progressAnim.removeListener(listenerId);
        };
    }, [progressAnim]);

    useEffect(() => {
        progressAnim.stopAnimation();
        Animated.spring(progressAnim, {
            toValue: sessionActive ? sessionProgressOffset : progressOffset,
            useNativeDriver: false,
            damping: 16,
            stiffness: 170,
            mass: 0.9,
            overshootClamping: true,
        }).start();
    }, [progressAnim, progressOffset, sessionActive, sessionProgressOffset]);

    const applyIncrement = useCallback(
        (amount: number) => {
            if (amount <= 0) return;
            setCount((prev) => {
                const nextCount = prev + amount;
                if (prev < target && nextCount >= target) {
                    setStreak((current) => current + 1);
                }
                return nextCount;
            });
            setLifetimeTotal((prev) => prev + amount);
        },
        [target]
    );

    const beginSession = useCallback(() => {
        tabBarTranslateY.value = withTiming(tabBarHeight + 50, { duration: 300 });
        headerTranslateY.value = withTiming(-(HEADER_HEIGHT + insets.top + 20), { duration: 300 });
        setShowManualSheet(false);
        setSessionActive(true);
        setSessionPaused(false);
        if (!sessionStartedAt) {
            setSessionStartedAt(Date.now());
            setSessionElapsedSeconds(0);
            setSessionCount(0);
        }
    }, [headerTranslateY, insets.top, sessionStartedAt, tabBarHeight, tabBarTranslateY]);

    const addToSession = useCallback(async () => {
        if (!sessionActive || sessionPaused) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.error("Haptics failed", error);
        }
        setSessionCount((prev) => prev + 1);
    }, [sessionActive, sessionPaused]);

    const endSession = useCallback(() => {
        if (!sessionActive) return;
        const finalCount = sessionCount;
        if (finalCount > 0) {
            applyIncrement(finalCount);
        }
        setSessionActive(false);
        setSessionPaused(false);
        setSessionCount(0);
        setSessionStartedAt(null);
        setSessionElapsedSeconds(0);
        showTabBar();
        headerTranslateY.value = withTiming(0, { duration: 300 });
        tabBarTranslateY.value = withTiming(0, { duration: 300 });
    }, [applyIncrement, headerTranslateY, sessionActive, sessionCount, showTabBar, tabBarTranslateY]);

    const pauseOrResumeSession = () => {
        if (!sessionActive) return;
        setSessionPaused((prev) => !prev);
    };

    const handleManualAdd = () => {
        const amount = parseInt(manualAddValue.replace(/,/g, ""), 10);
        if (!amount || amount <= 0) return;
        applyIncrement(amount);
        setManualAddValue("");
        setShowManualSheet(false);
        Keyboard.dismiss();
    };

    if (sessionActive) {
        return (
            <SafeAreaView
                style={styles.sessionContainer}
                edges={["top", "bottom"]}
            >
                <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTimer}>{formatDuration(sessionElapsedSeconds)}</Text>
                    <Text style={styles.sessionCount}>{formatNumber(sessionCount)}</Text>
                </View>

                <Pressable style={styles.sessionTapArea} onPress={addToSession}>
                    <View style={styles.sessionRing}>
                        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke={theme.colors.border.primary}
                                strokeWidth={RING_STROKE_WIDTH}
                                fill="none"
                                opacity={0.3}
                            />
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke={TASBEEH_PROGRESS_COLOR}
                                strokeWidth={RING_STROKE_WIDTH}
                                strokeLinecap="round"
                                strokeDasharray={RING_CIRCUMFERENCE}
                                strokeDashoffset={animatedProgressOffset}
                                fill="none"
                                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                            />
                        </Svg>
                        <Text style={styles.sessionTapHint}>Tap to count</Text>
                    </View>
                </Pressable>

                <View style={styles.sessionActions}>
                    <TouchableOpacity onPress={pauseOrResumeSession} style={styles.sessionButton}>
                        <Text style={styles.sessionButtonText}>{sessionPaused ? "Resume" : "Pause"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={endSession} style={[styles.sessionButton, styles.sessionButtonEnd]}>
                        <Text style={[styles.sessionButtonText, styles.sessionButtonEndText]}>End Session</Text>
                    </TouchableOpacity>
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
                    <LinearGradient
                        colors={["rgba(10, 10, 15, 0.18)", "rgba(10, 10, 15, 0.72)", "rgba(10, 10, 15, 0.96)"]}
                        locations={[0, 0.45, 1]}
                        style={StyleSheet.absoluteFillObject}
                    />
                </ImageBackground>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: HEADER_HEIGHT + insets.top + 16, paddingBottom: tabBarHeight + 16 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Lifetime</Text>
                            <Text style={styles.summaryValue}>{formatNumber(lifetimeTotal)}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Streak</Text>
                            <Text style={styles.summaryValue}>{streak} days</Text>
                        </View>
                    </View>
                </View>

                {/* Counter Ring */}
                <TouchableOpacity activeOpacity={0.85} onPress={beginSession} style={styles.counterContainer}>
                    <View style={[styles.progressRing, isComplete && styles.progressRingComplete]}>
                        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke={theme.colors.border.primary}
                                strokeWidth={RING_STROKE_WIDTH}
                                fill="none"
                                opacity={0.55}
                            />
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke={TASBEEH_PROGRESS_COLOR}
                                strokeWidth={RING_STROKE_WIDTH}
                                strokeLinecap="round"
                                strokeDasharray={RING_CIRCUMFERENCE}
                                strokeDashoffset={animatedProgressOffset}
                                fill="none"
                                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                            />
                        </Svg>
                        <View style={styles.progressInner}>
                            <Text style={styles.count}>{formatNumber(count)}</Text>
                            <Text style={styles.targetText}>of {formatNumber(target)}</Text>
                            <Text style={styles.tapHint}>Tap to start session</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity onPress={beginSession} style={[styles.actionButton, styles.actionButtonPrimary]}>
                        <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>Start Session</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowManualSheet(true)} style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Manual Add</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Manual Add Sheet */}
            {showManualSheet && (
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setShowManualSheet(false)}
                />
            )}

            <Animated.View
                style={[
                    styles.bottomSheet,
                    { paddingBottom: tabBarHeight },
                    {
                        transform: [
                            {
                                translateY: slideAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [400, 0],
                                }),
                            },
                        ],
                    },
                ]}
                pointerEvents={showManualSheet ? "auto" : "none"}
            >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Manual Add</Text>
                <TextInput
                    style={styles.input}
                    value={manualAddValue}
                    onChangeText={setManualAddValue}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    placeholderTextColor={theme.colors.text.tertiary}
                />
                <TouchableOpacity onPress={handleManualAdd} style={styles.sheetButton}>
                    <Text style={styles.sheetButtonText}>Add</Text>
                </TouchableOpacity>
                <KeyboardSpacer />
            </Animated.View>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        alignItems: "center",
    },
    summaryCard: {
        width: "100%",
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        marginBottom: 24,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.border.primary,
    },
    summaryLabel: {
        fontSize: 13,
        color: theme.colors.text.secondary,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    counterContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    progressRing: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    progressRingComplete: {
        opacity: 1,
    },
    progressInner: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
    },
    count: {
        fontSize: 48,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    targetText: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        marginBottom: 8,
    },
    tapHint: {
        fontSize: 13,
        color: theme.colors.text.tertiary,
    },
    statusCard: {
        width: "100%",
        backgroundColor: theme.colors.surface.secondary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    statusCardComplete: {
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "rgba(16, 185, 129, 0.3)",
    },
    statusText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        textAlign: "center",
    },
    statusTextComplete: {
        color: "#10b981",
    },
    quickAddRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 24,
        flexWrap: "wrap",
        justifyContent: "center",
    },
    quickAddChip: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    quickAddChipText: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text.primary,
    },
    actionRow: {
        width: "100%",
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    actionButtonPrimary: {
        backgroundColor: theme.colors.primary.main,
        borderColor: theme.colors.primary.main,
    },
    actionButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: theme.colors.text.primary,
    },
    actionButtonTextPrimary: {
        color: "#FFFFFF",
    },
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    bottomSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface.elevated,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: theme.colors.border.primary,
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 16,
    },
    input: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: theme.colors.text.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        marginBottom: 16,
    },
    sheetButton: {
        backgroundColor: theme.colors.primary.main,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    sheetButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    sessionContainer: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
        justifyContent: "space-between",
        paddingHorizontal: 24,
    },
    sessionHeader: {
        alignItems: "center",
        paddingTop: 40,
    },
    sessionTimer: {
        fontSize: 18,
        color: theme.colors.text.secondary,
        marginBottom: 16,
    },
    sessionCount: {
        fontSize: 64,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    sessionTapArea: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    sessionRing: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
    },
    sessionTapHint: {
        position: "absolute",
        fontSize: 16,
        color: theme.colors.text.tertiary,
    },
    sessionActions: {
        flexDirection: "row",
        gap: 12,
        paddingBottom: 24,
    },
    sessionButton: {
        flex: 1,
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    sessionButtonEnd: {
        backgroundColor: theme.colors.primary.main,
        borderColor: theme.colors.primary.main,
    },
    sessionButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text.primary,
    },
    sessionButtonEndText: {
        color: "#FFFFFF",
    },
});
