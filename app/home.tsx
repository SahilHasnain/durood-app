import AsyncStorage from "@react-native-async-storage/async-storage";
import KeyboardSpacer from "@/components/KeyboardSpacer";
import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import "../global.css";

const TASBEEH_PROGRESS_COLOR = "#10b981";
const DEFAULT_TOTAL_GOAL = 10000000;
const DAILY_COUNT_KEY = "tasbeeh_count";
const DAILY_TARGET_KEY = "tasbeeh_target";
const LAST_ACTIVE_DATE_KEY = "tasbeeh_last_active_date";
const LIFETIME_TOTAL_KEY = "tasbeeh_lifetime_total";
const STREAK_KEY = "tasbeeh_streak";

const QUICK_ADD_VALUES = [10, 33, 100, 313, 1000];

type CountingStyle = "tap" | "batch" | "manual";
type SheetMode = "goal" | "manual" | null;

interface GoalSetupState {
  totalGoal: string;
  targetDate: string;
  dailyCommitment: string;
  countingStyle: CountingStyle;
}

interface SessionSummary {
  count: number;
  durationSeconds: number;
}

function parsePositiveInt(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function normalizeDateInput(value: string): string {
  return value.replace(/[^\d-]/g, "").slice(0, 10);
}

function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function estimateFinishDate(remainingGoal: number, dailyCommitment: number): Date {
  const daysNeeded = Math.ceil(remainingGoal / dailyCommitment);
  const result = new Date();
  result.setDate(result.getDate() + daysNeeded);
  return result;
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function clampNonNegative(value: number): number {
  return Math.max(0, value);
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Home() {
  const HEADER_HEIGHT = 60;
  const RING_SIZE = 160;
  const RING_STROKE_WIDTH = 6;
  const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(100);
  const [lifetimeTotal, setLifetimeTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [actionsVisible, setActionsVisible] = useState(true);
  const [manualAddValue, setManualAddValue] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [goalSetup, setGoalSetup] = useState<GoalSetupState>({
    totalGoal: formatNumber(DEFAULT_TOTAL_GOAL),
    targetDate: "",
    dailyCommitment: "",
    countingStyle: "tap",
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(RING_CIRCUMFERENCE)).current;
  const [animatedProgressOffset, setAnimatedProgressOffset] = useState(
    RING_CIRCUMFERENCE
  );
  const { translateY: tabBarTranslateY, tabBarHeight, showTabBar } =
    useTabBarVisibility();
  const insets = useSafeAreaInsets();
  const headerTranslateY = useSharedValue(0);

  const parsedGoal = parsePositiveInt(goalSetup.totalGoal) ?? DEFAULT_TOTAL_GOAL;
  const parsedDailyCommitment = parsePositiveInt(goalSetup.dailyCommitment);
  const parsedTargetDate = parseDateInput(goalSetup.targetDate);
  const daysUntilTarget = parsedTargetDate ? getDaysUntil(parsedTargetDate) : null;
  const todayKey = getTodayKey();

  const remainingGoal = clampNonNegative(parsedGoal - lifetimeTotal);
  const percentComplete = parsedGoal > 0 ? (lifetimeTotal / parsedGoal) * 100 : 0;
  const todaysRemaining = clampNonNegative(target - count);
  const projectedTodayCompleted = count + sessionCount;
  const projectedTodayRemaining = clampNonNegative(target - projectedTodayCompleted);
  const sessionProgress =
    target > 0 ? Math.min((projectedTodayCompleted / target) * 100, 100) : 0;
  const sessionProgressOffset =
    RING_CIRCUMFERENCE - (sessionProgress / 100) * RING_CIRCUMFERENCE;

  const goalComputation = useMemo(() => {
    if (parsedTargetDate) {
      if (daysUntilTarget === null || daysUntilTarget <= 0) {
        return {
          mode: "invalid-date" as const,
          helperText: "Target date must be today or later.",
        };
      }

      const requiredDaily = Math.ceil(remainingGoal / daysUntilTarget);
      return {
        mode: "from-date" as const,
        helperText: `To finish by ${formatDateLabel(parsedTargetDate)}, you need ${formatNumber(requiredDaily)} per day for ${formatNumber(daysUntilTarget)} day${daysUntilTarget === 1 ? "" : "s"}.`,
        requiredDaily,
        estimatedFinishDate: parsedTargetDate,
      };
    }

    if (parsedDailyCommitment) {
      const finishDate = estimateFinishDate(remainingGoal, parsedDailyCommitment);
      return {
        mode: "from-daily" as const,
        helperText: `At ${formatNumber(parsedDailyCommitment)} per day, you can finish around ${formatDateLabel(finishDate)}.`,
        estimatedFinishDate: finishDate,
      };
    }

    return {
      mode: "idle" as const,
      helperText: "Add a target date or daily commitment to generate your plan.",
    };
  }, [
    daysUntilTarget,
    parsedDailyCommitment,
    parsedTargetDate,
    remainingGoal,
  ]);

  const estimatedCompletionLabel =
    goalComputation.mode === "from-date" && goalComputation.estimatedFinishDate
      ? formatDateLabel(goalComputation.estimatedFinishDate)
      : goalComputation.mode === "from-daily" && goalComputation.estimatedFinishDate
        ? formatDateLabel(goalComputation.estimatedFinishDate)
        : "Not set";

  useFocusEffect(
    useCallback(() => {
      showTabBar();
      headerTranslateY.value = withTiming(0, {
        duration: 300,
      });
    }, [headerTranslateY, showTabBar])
  );

  useEffect(() => {
    if (!sessionActive || sessionPaused || !sessionStartedAt) {
      return;
    }

    const interval = setInterval(() => {
      setSessionElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive, sessionPaused, sessionStartedAt]);

  useEffect(() => {
    if (!sessionSummary) return;
    const timeout = setTimeout(() => {
      setSessionSummary(null);
    }, 4500);

    return () => clearTimeout(timeout);
  }, [sessionSummary]);

  const loadData = useCallback(async () => {
    try {
      const [
        savedCount,
        savedTarget,
        savedLastActiveDate,
        savedLifetimeTotal,
        savedStreak,
      ] = await Promise.all([
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
      await Promise.all([
        AsyncStorage.setItem(DAILY_COUNT_KEY, count.toString()),
        AsyncStorage.setItem(DAILY_TARGET_KEY, target.toString()),
        AsyncStorage.setItem(LIFETIME_TOTAL_KEY, lifetimeTotal.toString()),
        AsyncStorage.setItem(STREAK_KEY, streak.toString()),
        AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayKey),
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
      toValue: sheetMode ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sheetMode, slideAnim]);

  useEffect(() => {
    Animated.timing(actionsAnim, {
      toValue: actionsVisible ? 1 : 0,
      duration: actionsVisible ? 260 : 360,
      useNativeDriver: true,
    }).start();
  }, [actionsAnim, actionsVisible]);

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setAnimatedProgressOffset(value);
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  const applyDailyAndLifetimeIncrement = useCallback(
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

  const triggerFeedback = useCallback(async () => {
    if (hapticsEnabled) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.error("Haptics failed", error);
      }
    }

    if (audioEnabled) {
      console.log("Audio feedback enabled for session taps.");
    }
  }, [audioEnabled, hapticsEnabled]);

  const beginSession = useCallback(() => {
    tabBarTranslateY.value = withTiming(tabBarHeight + 50, {
      duration: 300,
    });
    headerTranslateY.value = withTiming(-(HEADER_HEIGHT + insets.top + 20), {
      duration: 300,
    });
    setActionsVisible(false);
    setSheetMode(null);
    setSessionSummary(null);
    setSessionActive(true);
    setSessionPaused(false);
    if (!sessionStartedAt) {
      setSessionStartedAt(Date.now());
      setSessionElapsedSeconds(0);
      setSessionCount(0);
    }
  }, [
    headerTranslateY,
    insets.top,
    sessionStartedAt,
    tabBarHeight,
    tabBarTranslateY,
  ]);

  const addToSession = useCallback(
    async (amount: number) => {
      if (!sessionActive || sessionPaused || amount <= 0) return;
      await triggerFeedback();
      setSessionCount((prev) => prev + amount);
    },
    [sessionActive, sessionPaused, triggerFeedback]
  );

  const endSession = useCallback(() => {
    if (!sessionActive) return;

    const finalCount = sessionCount;
    const finalDuration = sessionElapsedSeconds;

    if (finalCount > 0) {
      applyDailyAndLifetimeIncrement(finalCount);
      setSessionSummary({
        count: finalCount,
        durationSeconds: finalDuration,
      });
    }

    setSessionActive(false);
    setSessionPaused(false);
    setSessionCount(0);
    setSessionStartedAt(null);
    setSessionElapsedSeconds(0);
    showTabBar();
    headerTranslateY.value = withTiming(0, {
      duration: 300,
    });
    tabBarTranslateY.value = withTiming(0, {
      duration: 300,
    });
    setActionsVisible(true);
  }, [
    applyDailyAndLifetimeIncrement,
    headerTranslateY,
    sessionActive,
    sessionCount,
    sessionElapsedSeconds,
    showTabBar,
    tabBarTranslateY,
  ]);

  const pauseOrResumeSession = () => {
    if (!sessionActive) return;
    setSessionPaused((prev) => !prev);
  };

  const handleReset = () => {
    setCount(0);
    setSheetMode(null);
    Keyboard.dismiss();
  };

  const handleApplyGoalSetup = () => {
    if (goalComputation.mode === "from-date" && goalComputation.requiredDaily) {
      setTarget(goalComputation.requiredDaily);
      setGoalSetup((prev) => ({
        ...prev,
        dailyCommitment: goalComputation.requiredDaily.toString(),
      }));
    }

    if (goalComputation.mode === "from-daily" && parsedDailyCommitment) {
      setTarget(parsedDailyCommitment);
    }

    setSheetMode(null);
    Keyboard.dismiss();
  };

  const handleManualAdd = () => {
    const amount = parsePositiveInt(manualAddValue);
    if (!amount) return;
    applyDailyAndLifetimeIncrement(amount);
    setManualAddValue("");
    setSheetMode(null);
    Keyboard.dismiss();
  };

  const handleBackgroundPress = () => {
    if (sessionActive) return;
    showTabBar();
    headerTranslateY.value = withTiming(0, {
      duration: 300,
    });
    if (!sheetMode) {
      setActionsVisible(true);
    }
  };

  const progress = target > 0 ? Math.min((count / target) * 100, 100) : 0;
  const isComplete = count >= target;
  const progressOffset =
    RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE;

  useEffect(() => {
    progressAnim.stopAnimation();
    Animated.spring(progressAnim, {
      toValue: progressOffset,
      useNativeDriver: false,
      damping: 16,
      stiffness: 170,
      mass: 0.9,
      overshootClamping: true,
    }).start();
  }, [progressAnim, progressOffset]);

  const countingOptions: { key: CountingStyle; label: string }[] = [
    { key: "tap", label: "Tap" },
    { key: "batch", label: "Tasbeeh batches" },
    { key: "manual", label: "Manual entry" },
  ];

  const metricCards = [
    { label: "Lifetime completed", value: formatNumber(lifetimeTotal) },
    { label: "Remaining", value: formatNumber(remainingGoal) },
    { label: "Progress", value: `${percentComplete.toFixed(2)}%` },
    { label: "Estimated finish", value: estimatedCompletionLabel },
  ];

  const dailyCards = [
    { label: "Today's target", value: formatNumber(target) },
    { label: "Today's completed", value: formatNumber(count) },
    { label: "Today's remaining", value: formatNumber(todaysRemaining) },
    { label: "Streak", value: `${formatNumber(streak)} day${streak === 1 ? "" : "s"}` },
  ];

  return (
    <SafeAreaView
      className="flex-1"
      edges={["bottom"]}
      style={{ backgroundColor: theme.colors.background.primary }}
    >
      <SimpleHeader translateY={headerTranslateY} />
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <ImageBackground
          source={require("../assets/images/gumbad.png")}
          resizeMode="cover"
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageAsset}
        >
          <LinearGradient
            colors={[
              "rgba(10, 10, 15, 0.18)",
              "rgba(10, 10, 15, 0.72)",
              "rgba(10, 10, 15, 0.96)",
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </ImageBackground>
      </View>

      <Pressable style={styles.container} onPress={handleBackgroundPress}>
        <ScrollView
          style={styles.dashboardScroll}
          contentContainerStyle={styles.dashboardContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>1 Crore Journey</Text>
            <Text style={styles.sectionTitle}>Home Dashboard</Text>
            <View style={styles.metricsGrid}>
              {metricCards.map((metric) => (
                <View key={metric.label} style={styles.metricTile}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Today</Text>
            <Text style={styles.sectionTitle}>Daily Progress</Text>
            <View style={styles.metricsGrid}>
              {dailyCards.map((metric) => (
                <View key={metric.label} style={styles.metricTile}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.helperText}>{goalComputation.helperText}</Text>
          </View>

          <View style={styles.counterWrapper}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={beginSession}
              style={styles.counterContainer}
            >
              <View
                style={[
                  styles.progressRing,
                  isComplete && styles.progressRingComplete,
                ]}
              >
                <Svg
                  width={RING_SIZE}
                  height={RING_SIZE}
                  style={styles.progressSvg}
                  viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                >
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
                  <Text style={styles.tapHint}>
                    {sessionActive ? "Session in progress" : "Tap to start session"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <Animated.View
              pointerEvents={actionsVisible ? "auto" : "none"}
              style={[
                styles.controlsCard,
                {
                  opacity: actionsAnim,
                  transform: [
                    {
                      translateY: actionsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                    {
                      scale: actionsAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.quickAddRow}>
                {QUICK_ADD_VALUES.map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => applyDailyAndLifetimeIncrement(value)}
                    style={styles.quickAddChip}
                  >
                    <Text style={styles.quickAddChipText}>+{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={beginSession}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Start session</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSheetMode("manual")}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Manual add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSheetMode("goal")}
                  style={[styles.actionButton, styles.actionButtonPrimary]}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.actionButtonTextPrimary,
                    ]}
                  >
                    Adjust target
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        {sessionSummary ? (
          <View style={styles.summaryToast}>
            <Text style={styles.summaryToastTitle}>Session saved</Text>
            <Text style={styles.summaryToastText}>
              Added {formatNumber(sessionSummary.count)} in{" "}
              {formatDuration(sessionSummary.durationSeconds)}.
            </Text>
          </View>
        ) : null}

        {sheetMode && (
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setSheetMode(null)}
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
                    outputRange: [720, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={sheetMode ? "auto" : "none"}
        >
          <View style={styles.sheetHandle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetScrollContent}
          >
            {sheetMode === "goal" ? (
              <>
                <Text style={styles.sheetTitle}>Goal Setup</Text>
                <Text style={styles.sheetSubtitle}>
                  Set the long-term goal once, then let the app calculate the daily
                  plan.
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Total goal</Text>
                  <TextInput
                    style={styles.input}
                    value={goalSetup.totalGoal}
                    onChangeText={(value) =>
                      setGoalSetup((prev) => ({ ...prev, totalGoal: value }))
                    }
                    keyboardType="numeric"
                    placeholder="1,00,00,000"
                    placeholderTextColor={theme.colors.text.tertiary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Target date (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={goalSetup.targetDate}
                    onChangeText={(value) =>
                      setGoalSetup((prev) => ({
                        ...prev,
                        targetDate: normalizeDateInput(value),
                      }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.colors.text.tertiary}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Daily commitment (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={goalSetup.dailyCommitment}
                    onChangeText={(value) =>
                      setGoalSetup((prev) => ({
                        ...prev,
                        dailyCommitment: value,
                      }))
                    }
                    keyboardType="numeric"
                    placeholder="Example: 5000"
                    placeholderTextColor={theme.colors.text.tertiary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Counting style</Text>
                  <View style={styles.segmentedRow}>
                    {countingOptions.map((option) => {
                      const selected = goalSetup.countingStyle === option.key;
                      return (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            styles.segmentedButton,
                            selected && styles.segmentedButtonSelected,
                          ]}
                          onPress={() =>
                            setGoalSetup((prev) => ({
                              ...prev,
                              countingStyle: option.key,
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.segmentedButtonText,
                              selected && styles.segmentedButtonTextSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.calculationCard}>
                  <Text style={styles.calculationTitle}>Live calculation</Text>
                  <Text style={styles.calculationText}>
                    {goalComputation.helperText}
                  </Text>
                </View>

                <View style={styles.sheetButtons}>
                  <TouchableOpacity onPress={handleReset} style={styles.sheetBtn}>
                    <Text style={styles.sheetBtnText}>Reset today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSheetMode(null)}
                    style={styles.sheetBtn}
                  >
                    <Text style={styles.sheetBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleApplyGoalSetup}
                    style={[styles.sheetBtn, styles.sheetBtnPrimary]}
                  >
                    <Text style={[styles.sheetBtnText, styles.sheetBtnTextPrimary]}>
                      Apply
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Manual Add</Text>
                <Text style={styles.sheetSubtitle}>
                  Add a completed count from offline recitation or tasbeeh batches.
                </Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Completed count</Text>
                  <TextInput
                    style={styles.input}
                    value={manualAddValue}
                    onChangeText={setManualAddValue}
                    keyboardType="numeric"
                    placeholder="Example: 500"
                    placeholderTextColor={theme.colors.text.tertiary}
                  />
                </View>

                <View style={styles.sheetButtons}>
                  <TouchableOpacity
                    onPress={() => setSheetMode(null)}
                    style={styles.sheetBtn}
                  >
                    <Text style={styles.sheetBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleManualAdd}
                    style={[styles.sheetBtn, styles.sheetBtnPrimary]}
                  >
                    <Text style={[styles.sheetBtnText, styles.sheetBtnTextPrimary]}>
                      Add count
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
          <KeyboardSpacer topSpacing={-50} />
        </Animated.View>

        {sessionActive ? (
          <View style={styles.sessionOverlay}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionLabel}>Focused Session</Text>
            </View>

            <View style={styles.sessionBody}>
              <View style={styles.sessionMetaBlock}>
                <Text style={styles.sessionTimer}>
                  {sessionPaused ? "Paused" : "Live"} | {formatDuration(sessionElapsedSeconds)}
                </Text>
                <Text style={styles.sessionCountLabel}>Session count</Text>
              </View>
              <Text style={styles.sessionCountValue}>{formatNumber(sessionCount)}</Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  void addToSession(1);
                }}
                style={[
                  styles.sessionTapArea,
                  sessionPaused && styles.sessionTapAreaDisabled,
                ]}
                disabled={sessionPaused}
              >
                <Text style={styles.sessionTapPrimary}>Tap for durood</Text>
                <Text style={styles.sessionTapSecondary}>
                  {sessionPaused ? "Resume session to count" : "Each tap adds 1"}
                </Text>
              </TouchableOpacity>

              <View style={styles.sessionProgressStrip}>
                <View style={styles.sessionProgressCompact}>
                  <View style={styles.sessionProgressRingWrap}>
                    <Svg
                      width={84}
                      height={84}
                      style={styles.sessionProgressSvg}
                      viewBox="0 0 84 84"
                    >
                      <Circle
                        cx={42}
                        cy={42}
                        r={36}
                        stroke={theme.colors.border.primary}
                        strokeWidth={6}
                        fill="none"
                        opacity={0.55}
                      />
                      <Circle
                        cx={42}
                        cy={42}
                        r={36}
                        stroke={TASBEEH_PROGRESS_COLOR}
                        strokeWidth={6}
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 36}
                        strokeDashoffset={
                          sessionProgressOffset * ((2 * Math.PI * 36) / RING_CIRCUMFERENCE)
                        }
                        fill="none"
                        transform="rotate(-90 42 42)"
                      />
                    </Svg>
                    <View style={styles.sessionProgressInner}>
                      <Text style={styles.sessionProgressValue}>
                        {sessionProgress.toFixed(0)}%
                      </Text>
                      <Text style={styles.sessionProgressLabel}>today</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sessionProgressDivider} />

                <View style={styles.sessionProgressMetric}>
                  <Text style={styles.sessionProgressMetricLabel}>Completed</Text>
                  <Text style={styles.sessionProgressMetricValue}>
                    {formatNumber(projectedTodayCompleted)}
                  </Text>
                </View>

                <View style={styles.sessionProgressDivider} />

                <View style={styles.sessionProgressMetric}>
                  <Text style={styles.sessionProgressMetricLabel}>Remaining</Text>
                  <Text style={styles.sessionProgressMetricValue}>
                    {formatNumber(projectedTodayRemaining)}
                  </Text>
                </View>
              </View>

              <View style={styles.sessionActionRow}>
                <TouchableOpacity
                  onPress={pauseOrResumeSession}
                  style={styles.sessionActionButton}
                >
                  <Text style={styles.sessionActionButtonText}>
                    {sessionPaused ? "Resume" : "Pause"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setHapticsEnabled((prev) => !prev)}
                  style={styles.sessionActionButton}
                >
                  <Text style={styles.sessionActionButtonText}>
                    Vib {hapticsEnabled ? "On" : "Off"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={endSession}
                  style={[styles.sessionActionButton, styles.sessionActionButtonPrimary]}
                >
                  <Text
                    style={[
                      styles.sessionActionButtonText,
                      styles.sessionActionButtonTextPrimary,
                    ]}
                  >
                    End
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setAudioEnabled((prev) => !prev)}
                style={styles.sessionSubtleToggle}
              >
                <Text style={styles.sessionSubtleToggleText}>
                  Audio feedback: {audioEnabled ? "On" : "Off"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageAsset: {
    opacity: 0.95,
  },
  container: {
    flex: 1,
    paddingTop: 92,
  },
  dashboardScroll: {
    flex: 1,
  },
  dashboardContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: "rgba(17,17,17,0.88)",
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: TASBEEH_PROGRESS_COLOR,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricTile: {
    width: "48%",
    minHeight: 86,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.text.tertiary,
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text.secondary,
    marginTop: 14,
  },
  counterWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  counterContainer: {
    position: "relative",
    marginBottom: 16,
  },
  progressRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: theme.colors.border.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface.primary,
    position: "relative",
  },
  progressSvg: {
    position: "absolute",
  },
  progressRingComplete: {
    ...theme.shadows.glow,
    shadowColor: TASBEEH_PROGRESS_COLOR,
  },
  progressInner: {
    alignItems: "center",
    zIndex: 1,
    paddingHorizontal: 12,
  },
  count: {
    fontSize: 34,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    textAlign: "center",
  },
  targetText: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
    marginTop: 4,
  },
  tapHint: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
  controlsCard: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(17,17,17,0.92)",
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    gap: 14,
  },
  quickAddRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  quickAddChip: {
    minWidth: 62,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickAddChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  actionRow: {
    gap: 10,
  },
  actionButton: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
  actionButtonTextPrimary: {
    color: theme.colors.background.primary,
  },
  summaryToast: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 102,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(16,185,129,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  summaryToastTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#04120d",
    marginBottom: 4,
  },
  summaryToastText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#062016",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "78%",
    backgroundColor: theme.colors.surface.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border.secondary,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetScrollContent: {
    paddingBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    color: theme.colors.text.primary,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: theme.colors.text.secondary,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segmentedButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  segmentedButtonSelected: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  segmentedButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text.secondary,
  },
  segmentedButtonTextSelected: {
    color: theme.colors.background.primary,
  },
  calculationCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.24)",
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  calculationText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text.secondary,
  },
  sheetButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  sheetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    alignItems: "center",
  },
  sheetBtnPrimary: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  sheetBtnText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: "600",
  },
  sheetBtnTextPrimary: {
    color: theme.colors.background.primary,
  },
  sessionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.96)",
    paddingTop: 108,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  sessionBody: {
    flex: 1,
    justifyContent: "center",
    gap: 18,
  },
  sessionHeader: {
    alignItems: "center",
    paddingBottom: 10,
  },
  sessionLabel: {
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: TASBEEH_PROGRESS_COLOR,
    fontWeight: "700",
    textAlign: "center",
  },
  sessionMetaBlock: {
    alignItems: "center",
    gap: 4,
  },
  sessionTimer: {
    textAlign: "center",
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  sessionProgressStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  sessionProgressCompact: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionProgressRingWrap: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  sessionProgressSvg: {
    position: "absolute",
  },
  sessionProgressInner: {
    alignItems: "center",
  },
  sessionProgressValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text.primary,
  },
  sessionProgressLabel: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sessionProgressDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: theme.colors.border.primary,
  },
  sessionProgressMetric: {
    flex: 1,
    justifyContent: "center",
  },
  sessionProgressMetricLabel: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    marginBottom: 6,
  },
  sessionProgressMetricValue: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  sessionCountLabel: {
    textAlign: "center",
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sessionCountValue: {
    textAlign: "center",
    fontSize: 54,
    fontWeight: "800",
    color: theme.colors.text.primary,
    marginTop: -2,
  },
  sessionTapArea: {
    minHeight: 260,
    borderRadius: 32,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.26)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sessionTapAreaDisabled: {
    opacity: 0.45,
  },
  sessionTapPrimary: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text.primary,
    textAlign: "center",
  },
  sessionTapSecondary: {
    marginTop: 10,
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: "center",
  },
  sessionActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  sessionActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionActionButtonPrimary: {
    backgroundColor: theme.colors.primary.main,
    borderColor: theme.colors.primary.main,
  },
  sessionActionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text.secondary,
  },
  sessionActionButtonTextPrimary: {
    color: theme.colors.background.primary,
  },
  sessionSubtleToggle: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionSubtleToggleText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
});
