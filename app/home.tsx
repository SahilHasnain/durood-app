import KeyboardSpacer from "@/components/KeyboardSpacer";
import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTasbeehData } from "@/hooks/useTasbeehData";
import { SessionRecord } from "@/services/tasbeehService";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    AppState,
    BackHandler,
    Image,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View
} from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const TASBEEH_PROGRESS_COLOR = "#10b981";
const DEFAULT_SESSION_GOAL = 33;
const SESSION_GOAL_KEY = "tasbeeh_session_goal";
const SIGN_IN_MILESTONE = 20000;
const SIGN_IN_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_PROMPT_MILESTONE_KEY = "sign_in_last_prompt_milestone";
const LAST_PROMPT_TIME_KEY = "sign_in_last_prompt_time";
const SESSION_IMAGES = [
    require("@/assets/images/jalian-mubarak.jpg"),
    require("@/assets/images/gumbad.png"),
];

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
    const { count, target, lifetimeTotal, streak, loading, initialized, saveData, refreshData } =
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
    const [showSignInSheet, setShowSignInSheet] = useState(false);
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [sessionGoal, setSessionGoal] = useState<number | null>(null);
    const [sessionGoalInput, setSessionGoalInput] = useState("");
    const [showSessionGoalSheet, setShowSessionGoalSheet] = useState(false);
    const [sessionImageIndex, setSessionImageIndex] = useState(0);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(RING_CIRCUMFERENCE)).current;
    const [animatedProgressOffset, setAnimatedProgressOffset] = useState(RING_CIRCUMFERENCE);

    const { translateY: tabBarTranslateY, tabBarHeight, showTabBar } = useTabBarVisibility();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const headerTranslateY = useSharedValue(0);

    const progress = target > 0 ? ((count % target) / target) * 100 : 0;
    const isComplete = count >= target;
    const dailyGoalCompletions = target > 0 ? Math.floor(count / target) : 0;
    const remainingToday = target > 0 ? Math.max(0, target - (count % target || (isComplete ? target : 0))) : 0;
    const displayedDailyCount = target > 0 && isComplete && count % target === 0 ? target : target > 0 ? count % target : count;
    const progressOffset = RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;
    const sessionImageHeight = windowHeight * 0.4;

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
            if (initialized) {
                refreshData();
            }
        }, [headerTranslateY, showTabBar, initialized, refreshData])
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
                console.error("Failed to load session focus:", error);
            });

        return () => {
            mounted = false;
        };
    }, []);

    const lastPromptedMilestone = useRef(0);

    useEffect(() => {
        if (!initialized) return;
        AsyncStorage.getItem(LAST_PROMPT_MILESTONE_KEY).then((val) => {
            if (val) {
                lastPromptedMilestone.current = parseInt(val, 10);
            } else {
                const current = Math.floor(lifetimeTotal / SIGN_IN_MILESTONE);
                lastPromptedMilestone.current = current;
                AsyncStorage.setItem(LAST_PROMPT_MILESTONE_KEY, String(current));
            }
        });
    }, [initialized]);

    useEffect(() => {
        if (authLoading || isAuthenticated || !initialized) return;
        if (lifetimeTotal < SIGN_IN_MILESTONE) return;

        const currentMilestone = Math.floor(lifetimeTotal / SIGN_IN_MILESTONE);
        if (currentMilestone <= lastPromptedMilestone.current) return;

        AsyncStorage.getItem(LAST_PROMPT_TIME_KEY).then((timeStr) => {
            const lastTime = timeStr ? parseInt(timeStr, 10) : 0;
            if (Date.now() - lastTime < SIGN_IN_COOLDOWN_MS) return;

            setShowSignInSheet(true);
            lastPromptedMilestone.current = currentMilestone;
            AsyncStorage.multiSet([
                [LAST_PROMPT_MILESTONE_KEY, String(currentMilestone)],
                [LAST_PROMPT_TIME_KEY, String(Date.now())],
            ]);
        });
    }, [authLoading, isAuthenticated, initialized, lifetimeTotal]);

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

    const changeSessionImage = useCallback(() => {
        setSessionImageIndex((currentIndex) => (currentIndex + 1) % SESSION_IMAGES.length);
    }, []);

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
                <View
                    style={[styles.sessionImageArea, { height: sessionImageHeight }]}
                >
                    <Image
                        source={SESSION_IMAGES[sessionImageIndex]}
                        style={styles.sessionImage}
                        resizeMode="cover"
                    />
                    <TouchableOpacity
                        accessibilityLabel="Change session image"
                        activeOpacity={0.72}
                        hitSlop={10}
                        onPress={changeSessionImage}
                        style={styles.sessionImageButton}
                    >
                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.82)" />
                    </TouchableOpacity>
                </View>

                <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTimer}>{formatDuration(sessionElapsedSeconds)}</Text>
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
                        <View style={styles.sessionRingContent}>
                            <Text
                                style={styles.sessionCount}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.55}
                            >
                                {formatNumber(displayedSessionCount)}
                            </Text>
                        </View>
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
                            Focus {formatNumber(effectiveSessionGoal)}
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
                        <Text style={styles.sheetTitle}>Session Focus</Text>
                        <TextInput
                            style={styles.input}
                            value={sessionGoalInput}
                            onChangeText={setSessionGoalInput}
                            keyboardType="numeric"
                            placeholder="Enter focus count"
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
                            <View style={styles.summaryIconWrap}>
                                <Ionicons name="infinite-outline" size={18} color={TASBEEH_PROGRESS_COLOR} />
                            </View>
                            <View style={styles.summaryTextWrap}>
                                <Text style={styles.summaryLabel}>Lifetime</Text>
                                <Text
                                    style={styles.summaryValue}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
                                >
                                    {formatNumber(lifetimeTotal)}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <View style={styles.summaryIconWrap}>
                                <Ionicons name="flame-outline" size={18} color={TASBEEH_PROGRESS_COLOR} />
                            </View>
                            <View style={styles.summaryTextWrap}>
                                <Text style={styles.summaryLabel}>Streak</Text>
                                <Text
                                    style={styles.summaryValue}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
                                >
                                    {streak} days
                                </Text>
                            </View>
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
                                <Text style={styles.count}>{formatNumber(displayedDailyCount)}</Text>
                                <Text style={styles.targetText}>of {formatNumber(target)}</Text>
                                <Text style={[styles.completionText, isComplete && styles.completionTextComplete]}>
                                    {dailyGoalCompletions > 0
                                        ? `Daily goal completed ${dailyGoalCompletions}x`
                                        : `${formatNumber(remainingToday)} remaining today`}
                                </Text>
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

            <Modal
                visible={showSignInSheet}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSignInSheet(false)}
            >
                <Pressable style={styles.signInOverlay} onPress={() => setShowSignInSheet(false)}>
                    <Pressable style={styles.signInSheet} onPress={() => {}}>
                        <View style={styles.signInSheetHandle} />
                        <Ionicons name="cloud-upload-outline" size={40} color={theme.colors.primary.main} />
                        <Text style={styles.signInSheetTitle}>Save Your Progress</Text>
                        <Text style={styles.signInSheetText}>
                            Sign in to sync your tasbeeh counts, streaks, and goals across all your devices.
                        </Text>
                        <TouchableOpacity
                            style={styles.signInSheetButton}
                            onPress={() => {
                                setShowSignInSheet(false);
                                router.push("/auth/login");
                            }}
                        >
                            <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                            <Text style={styles.signInSheetButtonText}>Sign in with Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.signInSkipButton}
                            onPress={() => setShowSignInSheet(false)}
                        >
                            <Text style={styles.signInSkipText}>Continue without account</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
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
        marginBottom: 22,
        padding: 4,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.035)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        gap: 8,
    },
    summaryRow: {
        flexDirection: "row",
        gap: 8,
    },
    summaryItem: {
        flex: 1,
        minHeight: 78,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface.primary,
    },
    summaryIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(16,185,129,0.12)",
    },
    summaryTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: theme.colors.text.secondary,
        marginBottom: 3,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: "900",
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
    completionText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: "600",
        color: theme.colors.text.tertiary,
    },
    completionTextComplete: {
        color: TASBEEH_PROGRESS_COLOR,
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
        backgroundColor: TASBEEH_PROGRESS_COLOR,
        borderColor: TASBEEH_PROGRESS_COLOR,
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
    sessionImageArea: {
        marginHorizontal: -24,
        overflow: "hidden",
        backgroundColor: theme.colors.surface.primary,
    },
    sessionImage: {
        width: "100%",
        height: "100%",
    },
    sessionImageButton: {
        position: "absolute",
        right: 14,
        bottom: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.22)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.16)",
    },
    sessionHeader: {
        alignItems: "center",
        paddingTop: 20,
    },
    sessionTimer: {
        fontSize: 18,
        color: theme.colors.text.secondary,
    },
    sessionCount: {
        fontSize: 48,
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
        marginBottom: 20,
    },
    sessionRingContent: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        width: "70%",
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

    signInOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    signInSheet: {
        backgroundColor: theme.colors.surface.primary,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 28,
        paddingBottom: 48,
        paddingTop: 12,
        alignItems: "center",
        gap: 12,
    },
    signInSheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.15)",
        marginBottom: 12,
    },
    signInSheetTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: theme.colors.text.primary,
        textAlign: "center",
    },
    signInSheetText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        textAlign: "center",
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    signInSheetButton: {
        marginTop: 8,
        width: "100%",
        backgroundColor: theme.colors.primary.main,
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    signInSheetButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    signInSkipButton: {
        padding: 12,
        alignItems: "center",
    },
    signInSkipText: {
        fontSize: 15,
        fontWeight: "600",
        color: theme.colors.text.secondary,
    },
});
