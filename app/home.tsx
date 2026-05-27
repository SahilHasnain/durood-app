import KeyboardSpacer from "@/components/KeyboardSpacer";
import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useTasbeehData } from "@/hooks/useTasbeehData";
import { SessionRecord } from "@/services/tasbeehService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    AppState,
    BackHandler,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const TASBEEH_PROGRESS_COLOR = "#10b981";
const DEFAULT_SESSION_GOAL = 100;
const SESSION_GOAL_KEY = "tasbeeh_session_goal";

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-IN").format(value);
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

    // Use Appwrite hook
    const { count, target, lifetimeTotal, streak, loading, saveData, reload } =
        useTasbeehData();

    const [manualAddValue, setManualAddValue] = useState("");
    const [showManualSheet, setShowManualSheet] = useState(false);
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionPaused, setSessionPaused] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);
    const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
    const [sessionPausedAt, setSessionPausedAt] = useState<number | null>(null);
    const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
    const [preferredSessionGoal, setPreferredSessionGoal] = useState(DEFAULT_SESSION_GOAL);
    const [sessionGoal, setSessionGoal] = useState<number | null>(null);
    const [sessionGoalInput, setSessionGoalInput] = useState("");
    const [showSessionGoalSheet, setShowSessionGoalSheet] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(RING_CIRCUMFERENCE)).current;
    const [animatedProgressOffset, setAnimatedProgressOffset] = useState(RING_CIRCUMFERENCE);

    const { translateY: tabBarTranslateY, tabBarHeight, showTabBar } = useTabBarVisibility();
    const insets = useSafeAreaInsets();
    const headerTranslateY = useSharedValue(0);

    const progress = target > 0 ? ((count % target) / target) * 100 : 0;
    const isComplete = count >= target;
    const progressOffset = RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;

    const effectiveSessionGoal = sessionGoal ?? preferredSessionGoal;
    const displayedSessionCount =
        effectiveSessionGoal > 0 && sessionCount > 0 && sessionCount % effectiveSessionGoal === 0
            ? effectiveSessionGoal
            : effectiveSessionGoal > 0
                ? sessionCount % effectiveSessionGoal
                : sessionCount;
    const sessionProgress = effectiveSessionGoal > 0
        ? (displayedSessionCount / effectiveSessionGoal) * 100
        : 0;
    const sessionProgressOffset = RING_CIRCUMFERENCE - (sessionProgress / 100) * RING_CIRCUMFERENCE;

    useFocusEffect(
        useCallback(() => {
            showTabBar();
            headerTranslateY.value = withTiming(0, { duration: 300 });
            reload();
        }, [headerTranslateY, showTabBar, reload])
    );

    useEffect(() => {
        let mounted = true;

        AsyncStorage.getItem(SESSION_GOAL_KEY)
            .then((savedGoal) => {
                const parsedGoal = savedGoal ? parseInt(savedGoal, 10) : DEFAULT_SESSION_GOAL;
                if (mounted && parsedGoal > 0) {
                    setPreferredSessionGoal(parsedGoal);
                }
            })
            .catch((error) => {
                console.error("Failed to load session goal:", error);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!sessionActive || sessionPaused || !sessionStartedAt) return;
        const interval = setInterval(() => {
            setSessionElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionActive, sessionPaused, sessionStartedAt]);

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
        async (amount: number, sessionRecord?: SessionRecord) => {
            if (amount <= 0) return;
            const newCount = count + amount;
            const newLifetimeTotal = lifetimeTotal + amount;
            const newStreak = count === 0 && newCount > 0 ? streak + 1 : streak;

            const previousGoalCompletions = target > 0 ? Math.floor(count / target) : 0;
            const nextGoalCompletions = target > 0 ? Math.floor(newCount / target) : 0;

            if (nextGoalCompletions > previousGoalCompletions) {
                try {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch (error) {
                    console.error("Haptics failed", error);
                }
            }

            await saveData(
                {
                    count: newCount,
                    lifetimeTotal: newLifetimeTotal,
                    streak: newStreak,
                },
                sessionRecord
            );
        },
        [count, lifetimeTotal, streak, saveData, target]
    );

    const beginSession = useCallback(() => {
        tabBarTranslateY.value = withTiming(tabBarHeight + 50, { duration: 300 });
        headerTranslateY.value = withTiming(-(HEADER_HEIGHT + insets.top + 20), { duration: 300 });
        setShowManualSheet(false);
        setSessionActive(true);
        setSessionPaused(false);
        if (!sessionStartedAt) {
            setSessionStartedAt(Date.now());
            setSessionPausedAt(null);
            setSessionElapsedSeconds(0);
            setSessionCount(0);
            setSessionGoal(null);
            setSessionGoalInput("");
            setShowSessionGoalSheet(false);
        }
    }, [headerTranslateY, insets.top, sessionStartedAt, tabBarHeight, tabBarTranslateY]);

    const resumeSession = useCallback(() => {
        if (!sessionActive || !sessionPaused) return;

        const pausedDuration = sessionPausedAt ? Date.now() - sessionPausedAt : 0;
        if (sessionStartedAt && pausedDuration > 0) {
            setSessionStartedAt(sessionStartedAt + pausedDuration);
        }
        setSessionPausedAt(null);
        setSessionPaused(false);
    }, [sessionActive, sessionPaused, sessionPausedAt, sessionStartedAt]);

    const addToSession = useCallback(async () => {
        if (!sessionActive) return;
        if (sessionPaused) {
            resumeSession();
        }

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.error("Haptics failed", error);
        }

        const newSessionCount = sessionCount + 1;
        setSessionCount(newSessionCount);

        const projectedTotal = count + newSessionCount;

        const previousSessionGoalCompletions =
            effectiveSessionGoal > 0 ? Math.floor(sessionCount / effectiveSessionGoal) : 0;
        const nextSessionGoalCompletions =
            effectiveSessionGoal > 0 ? Math.floor(newSessionCount / effectiveSessionGoal) : 0;
        const completedSessionGoal = nextSessionGoalCompletions > previousSessionGoalCompletions;

        if (completedSessionGoal) {
            try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
                console.error("Haptics failed", error);
            }
            return;
        }

        // Check if daily goal is reached during session.
        if (projectedTotal >= target && target > 0 && projectedTotal % target === 0) {
            try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
                console.error("Haptics failed", error);
            }
        }
    }, [sessionActive, sessionPaused, resumeSession, sessionCount, effectiveSessionGoal, count, target]);

    const endSession = useCallback(async () => {
        if (!sessionActive) return;
        const finalCount = sessionCount;
        const endedAt = Date.now();
        const duration = sessionPaused
            ? sessionElapsedSeconds
            : sessionStartedAt
                ? Math.max(0, Math.floor((endedAt - sessionStartedAt) / 1000))
                : sessionElapsedSeconds;
        const sessionRecord: SessionRecord | undefined = finalCount > 0 && sessionStartedAt
            ? {
                id: `${sessionStartedAt}_${endedAt}`,
                count: finalCount,
                duration,
                goal: effectiveSessionGoal,
                startedAt: new Date(sessionStartedAt).toISOString(),
                endedAt: new Date(endedAt).toISOString(),
            }
            : undefined;

        setSessionActive(false);
        setSessionPaused(false);
        setSessionCount(0);
        setSessionStartedAt(null);
        setSessionPausedAt(null);
        setSessionElapsedSeconds(0);
        setSessionGoal(null);
        setSessionGoalInput("");
        setShowSessionGoalSheet(false);

        showTabBar();
        headerTranslateY.value = withTiming(0, { duration: 300 });
        tabBarTranslateY.value = withTiming(0, { duration: 300 });

        if (finalCount > 0) {
            void applyIncrement(finalCount, sessionRecord);
        }
    }, [
        sessionActive,
        sessionCount,
        sessionPaused,
        sessionElapsedSeconds,
        sessionStartedAt,
        effectiveSessionGoal,
        showTabBar,
        headerTranslateY,
        tabBarTranslateY,
        applyIncrement,
    ]);

    const pauseSession = useCallback(() => {
        if (!sessionActive || sessionPaused) return;
        if (sessionStartedAt) {
            setSessionElapsedSeconds(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
        }
        setSessionPausedAt(Date.now());
        setSessionPaused(true);
    }, [sessionActive, sessionPaused, sessionStartedAt]);

    const pauseOrResumeSession = () => {
        if (!sessionActive) return;
        if (!sessionPaused) {
            pauseSession();
            return;
        }

        resumeSession();
    };

    const handleManualAdd = async () => {
        const amount = parseInt(manualAddValue.replace(/,/g, ""), 10);
        if (!amount || amount <= 0) return;
        await applyIncrement(amount);
        setManualAddValue("");
        setShowManualSheet(false);
        Keyboard.dismiss();
    };

    const handleSetSessionGoal = async () => {
        const nextGoal = parseInt(sessionGoalInput.replace(/,/g, ""), 10);
        if (!nextGoal || nextGoal <= 0) return;
        setPreferredSessionGoal(nextGoal);
        setSessionGoal(nextGoal);
        await AsyncStorage.setItem(SESSION_GOAL_KEY, nextGoal.toString());
        setShowSessionGoalSheet(false);
        Keyboard.dismiss();
    };

    const handleClearSessionGoal = async () => {
        setPreferredSessionGoal(DEFAULT_SESSION_GOAL);
        setSessionGoal(null);
        setSessionGoalInput("");
        await AsyncStorage.removeItem(SESSION_GOAL_KEY);
        setShowSessionGoalSheet(false);
        Keyboard.dismiss();
    };

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            if (nextAppState !== "active") {
                pauseSession();
            }
        });

        return () => subscription.remove();
    }, [pauseSession]);

    // Handle back button during session
    useEffect(() => {
        if (!sessionActive) return;

        const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
            endSession();
            return true; // Prevent default back behavior
        });

        return () => backHandler.remove();
    }, [sessionActive, endSession]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <SimpleHeader translateY={headerTranslateY} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.main} />
                    <Text style={styles.loadingText}>Loading your progress...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (sessionActive) {
        return (
            <SafeAreaView style={styles.sessionContainer} edges={["top", "bottom"]}>
                <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTimer}>{formatDuration(sessionElapsedSeconds)}</Text>
                    <Text
                        style={styles.sessionCount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                    >
                        {formatNumber(displayedSessionCount)}
                    </Text>
                    <Text
                        style={styles.sessionGoalLabel}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        of {formatNumber(effectiveSessionGoal)}
                    </Text>
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
                    <TouchableOpacity
                        onPress={() => {
                            setSessionGoalInput(effectiveSessionGoal.toString());
                            setShowSessionGoalSheet(true);
                        }}
                        style={styles.sessionPauseButton}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={styles.sessionPauseButtonText}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                        >
                            Goal
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={pauseOrResumeSession}
                        style={styles.sessionPauseButton}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={styles.sessionPauseButtonText}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                        >
                            {sessionPaused ? "Resume" : "Pause"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showSessionGoalSheet && (
                    <TouchableOpacity
                        style={styles.sessionGoalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowSessionGoalSheet(false)}
                    />
                )}

                {showSessionGoalSheet && (
                    <View style={styles.sessionGoalSheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Session Goal</Text>
                        <TextInput
                            style={styles.input}
                            value={sessionGoalInput}
                            onChangeText={setSessionGoalInput}
                            keyboardType="numeric"
                            placeholder="Enter goal"
                            placeholderTextColor={theme.colors.text.tertiary}
                        />
                        <TouchableOpacity onPress={handleSetSessionGoal} style={styles.sheetButton}>
                            <Text style={styles.sheetButtonText}>Set Goal</Text>
                        </TouchableOpacity>
                        {effectiveSessionGoal !== DEFAULT_SESSION_GOAL && (
                            <TouchableOpacity onPress={handleClearSessionGoal} style={styles.sessionGoalClearButton}>
                                <Text style={styles.sessionGoalClearButtonText}>Clear Goal</Text>
                            </TouchableOpacity>
                        )}
                        <KeyboardSpacer />
                    </View>
                )}
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
                    { paddingTop: HEADER_HEIGHT + 8, paddingBottom: tabBarHeight + 80 },
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

                {/* Counter and Actions Group */}
                <View style={styles.bottomGroup}>
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
                                <Text style={styles.count}>{formatNumber(target > 0 ? count % target : count)}</Text>
                                <Text style={styles.targetText}>of {formatNumber(target)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            onPress={beginSession}
                            style={[styles.actionButton, styles.actionButtonPrimary]}
                        >
                            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                                Start Session
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowManualSheet(true)} style={styles.actionButton}>
                            <Text style={styles.actionButtonText}>Manual Add</Text>
                        </TouchableOpacity>
                    </View>
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
        flexGrow: 1,
        paddingHorizontal: 16,
        justifyContent: "space-between",
    },
    bottomGroup: {
        width: "100%",
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
        fontSize: 56,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    sessionGoalLabel: {
        marginTop: 4,
        fontSize: 17,
        fontWeight: "500",
        color: theme.colors.text.secondary,
    },
    sessionTapArea: {
        flex: 1,
        justifyContent: "flex-end",
        alignItems: "center",
    },
    sessionRing: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    sessionTapHint: {
        position: "absolute",
        fontSize: 16,
        color: theme.colors.text.tertiary,
    },
    sessionActions: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        paddingBottom: 24,
    },
    sessionPauseButton: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        minWidth: 132,
    },
    sessionPauseButtonText: {
        fontSize: 17,
        fontWeight: "600",
        color: theme.colors.text.primary,
    },
    sessionGoalOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
    },
    sessionGoalSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.surface.elevated,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    sessionGoalClearButton: {
        padding: 16,
        alignItems: "center",
    },
    sessionGoalClearButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: theme.colors.text.secondary,
    },
});
