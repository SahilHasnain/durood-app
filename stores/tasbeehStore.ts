import * as TasbeehService from "@/services/tasbeehService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface DailyRecord {
  date: string;
  count: number;
  target: number;
  sessions?: TasbeehService.SessionRecord[];
}

interface ProgressStats {
  lifetimeTotal: number;
  currentStreak: number;
  longestStreak: number;
  averagePerDay: number;
  bestDay: number;
  todayCount: number;
  todayTarget: number;
  todaySessions: number;
  todaySessionTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  estimatedFinishDate: string;
  estimatedFinishDistance: string;
  dailyHistory: DailyRecord[];
}

interface PlannerData {
  lifetimeTotal: number;
  totalGoal: number;
  dailyTarget: number;
}

interface TasbeehState {
  count: number;
  target: number;
  lifetimeTotal: number;
  streak: number;
  loading: boolean;
  syncing: boolean;
  initialized: boolean;
  initializedUserId?: string;
  lastSyncTime: number;
  
  // Progress data
  progressStats: ProgressStats | null;
  progressLoading: boolean;
  progressInitialized: boolean;
  
  // Planner data
  plannerData: PlannerData | null;
  plannerLoading: boolean;
  plannerInitialized: boolean;
}

interface TasbeehActions {
  loadData: (userId?: string) => Promise<void>;
  saveData: (
    newData: Partial<Pick<TasbeehState, "count" | "target" | "lifetimeTotal" | "streak">>,
    userId?: string,
    sessionRecord?: TasbeehService.SessionRecord
  ) => Promise<void>;
  reload: (userId?: string) => Promise<void>;
  reset: () => void;
  
  // Progress actions
  loadProgressData: (userId?: string) => Promise<void>;
  
  // Planner actions
  loadPlannerData: (userId?: string) => Promise<void>;
  updateDailyTarget: (newTarget: number, userId?: string) => Promise<void>;
  updateTotalGoal: (newGoal: number, userId?: string) => Promise<void>;
}

const LAST_ACTIVE_DATE_KEY = "tasbeeh_last_active_date";
const DAILY_HISTORY_KEY = "tasbeeh_daily_history";
const PENDING_SYNC_KEY = "tasbeeh_pending_sync";

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

function getElapsedDaysInCurrentMonth(): number {
  return new Date().getDate();
}

function getMonthStartKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const DEFAULT_TOTAL_GOAL = 100000; // 1 Lakh
const DEFAULT_PLANNER_DAILY_TARGET = 1000;

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

const initialState: TasbeehState = {
  count: 0,
  target: 100,
  lifetimeTotal: 0,
  streak: 0,
  loading: false,
  syncing: false,
  initialized: false,
  initializedUserId: undefined,
  lastSyncTime: 0,
  
  progressStats: null,
  progressLoading: false,
  progressInitialized: false,
  
  plannerData: null,
  plannerLoading: false,
  plannerInitialized: false,
};

export const useTasbeehStore = create<TasbeehState & TasbeehActions>((set, get) => ({
  ...initialState,

  loadData: async (userId?: string) => {
    const state = get();

    // Prevent duplicate/in-flight loads.
    if (state.loading) {
      return;
    }

    // If this user's data is already initialized, don't reload.
    if (state.initialized && state.initializedUserId === userId) {
      return;
    }

    try {
      set({ loading: true });

      if (!userId) {
        await loadFromAsyncStorage(set);
        set({ loading: true });
      }

      const [goal, todayProgress] = await Promise.all([
        TasbeehService.getUserGoal(userId),
        TasbeehService.getTodayProgress(userId),
      ]);

      if (!goal && !todayProgress) {
        await TasbeehService.syncFromLocalStorage(userId);
      }

      const [resolvedGoal, resolvedTodayProgress, calculatedStreak] = await Promise.all([
        goal || TasbeehService.getUserGoal(userId),
        todayProgress || TasbeehService.getTodayProgress(userId),
        TasbeehService.calculateStreak(userId),
      ]);

      set({
        count: resolvedTodayProgress?.count ?? get().count,
        target: resolvedGoal?.dailyTarget ?? get().target,
        lifetimeTotal: resolvedGoal?.lifetimeTotal ?? get().lifetimeTotal,
        streak: calculatedStreak.currentStreak,
        loading: false,
        syncing: false,
        initialized: true,
        initializedUserId: userId,
      });

      if (
        resolvedGoal &&
        (resolvedGoal.currentStreak !== calculatedStreak.currentStreak ||
          resolvedGoal.longestStreak !== calculatedStreak.longestStreak)
      ) {
        await TasbeehService.createOrUpdateUserGoal(
          {
            currentStreak: calculatedStreak.currentStreak,
            longestStreak: calculatedStreak.longestStreak,
          },
          userId
        );
      }
    } catch (error) {
      console.error("Failed to load data from Appwrite:", error);
      // Fallback to AsyncStorage
      await loadFromAsyncStorage(set);
    }
  },

  saveData: async (newData, userId?: string, sessionRecord?: TasbeehService.SessionRecord) => {
    try {
      const currentState = get();
      const updatedData = { ...currentState, ...newData };
      const todayKey = getTodayKey();

      // Update local state immediately for responsive UI
      set({ ...newData, syncing: true, progressInitialized: false });

      await persistLocalSnapshot(updatedData, todayKey, sessionRecord);

      const now = Date.now();
      set({ lastSyncTime: now });

      const syncedState = await syncPendingState(userId, updatedData);
      set({
        streak: syncedState?.streak ?? updatedData.streak,
        syncing: false,
      });
    } catch (error) {
      console.error("Failed to save data to Appwrite:", error);
      set({ syncing: false });
    }
  },

  reload: async (userId?: string) => {
    await get().loadData(userId);
  },

  reset: () => {
    set(initialState);
  },

  loadProgressData: async (userId?: string) => {
    const state = get();

    if (state.progressLoading) {
      return;
    }

    if (state.progressInitialized && state.initializedUserId === userId) {
      return;
    }

    try {
      set({ progressLoading: true });

      const [goal, history] = await Promise.all([
        TasbeehService.getUserGoal(userId),
        TasbeehService.getCurrentMonthHistory(userId),
      ]);

      const lifetimeTotal = goal?.lifetimeTotal ?? 0;
      const currentStreak = goal?.currentStreak ?? 0;
      const longestStreak = goal?.longestStreak ?? 0;

      const todayRecord = history.find((record) => record.date === getTodayKey()) ?? history[0];
      const todaySessions = todayRecord?.sessions ?? [];

      const weeklyTotal = history
        .slice(0, 7)
        .reduce((sum, record) => sum + record.count, 0);

      const monthlyTotal = history.reduce((sum, record) => sum + record.count, 0);

      const bestDay =
        history.length > 0 ? Math.max(...history.map((r) => r.count)) : 0;

      const averagePerDay = Math.round(monthlyTotal / getElapsedDaysInCurrentMonth());

      const remainingGoal = Math.max(0, (goal?.totalGoal ?? DEFAULT_TOTAL_GOAL) - lifetimeTotal);
      const estimatedDays =
        averagePerDay > 0 ? Math.ceil(remainingGoal / averagePerDay) : 0;
      const finishDate = new Date();
      finishDate.setDate(finishDate.getDate() + estimatedDays);
      const estimatedFinishDate =
        averagePerDay > 0
          ? finishDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—";

      const estimatedFinishDistance =
        averagePerDay > 0 ? formatTimeFromNow(estimatedDays) : "?";

      const dailyHistory = history.slice().reverse().map((record) => ({
        date: record.date,
        count: record.count,
        target: record.target,
      }));

      set({
        progressStats: {
          lifetimeTotal,
          currentStreak,
          longestStreak,
          averagePerDay,
          bestDay,
          todayCount: todayRecord?.count ?? 0,
          todayTarget: todayRecord?.target ?? 100,
          todaySessions: todaySessions.length,
          todaySessionTotal: todaySessions.reduce((sum, session) => sum + session.count, 0),
          weeklyTotal,
          monthlyTotal,
          estimatedFinishDate,
          estimatedFinishDistance,
          dailyHistory,
        },
        progressLoading: false,
        progressInitialized: true,
        initializedUserId: userId,
      });
    } catch (error) {
      console.error("Failed to load progress data:", error);
      const localStats = await buildLocalProgressStats();
      set({
        progressStats: localStats,
        progressLoading: false,
        progressInitialized: true,
        initializedUserId: userId,
      });
    }
  },

  loadPlannerData: async (userId?: string) => {
    const state = get();

    if (state.plannerLoading) {
      return;
    }

    if (state.plannerInitialized && state.initializedUserId === userId) {
      return;
    }

    try {
      set({ plannerLoading: true });

      const goal = await TasbeehService.getUserGoal(userId);

      set({
        plannerData: {
          lifetimeTotal: goal?.lifetimeTotal ?? 0,
          totalGoal: goal?.totalGoal ?? DEFAULT_TOTAL_GOAL,
          dailyTarget: goal?.dailyTarget ?? DEFAULT_PLANNER_DAILY_TARGET,
        },
        plannerLoading: false,
        plannerInitialized: true,
        initializedUserId: userId,
      });
    } catch (error) {
      console.error("Failed to load planner data:", error);
      const localPlannerData = await buildLocalPlannerData();
      set({
        plannerData: localPlannerData,
        plannerLoading: false,
        plannerInitialized: true,
        initializedUserId: userId,
      });
    }
  },

  updateDailyTarget: async (newTarget: number, userId?: string) => {
    try {
      await TasbeehService.createOrUpdateUserGoal(
        {
          dailyTarget: newTarget,
        },
        userId
      );

      const state = get();
      if (state.plannerData) {
        set({
          plannerData: {
            ...state.plannerData,
            dailyTarget: newTarget,
          },
          target: newTarget,
        });
      }
    } catch (error) {
      console.error("Failed to update daily target:", error);
      throw error;
    }
  },

  updateTotalGoal: async (newGoal: number, userId?: string) => {
    try {
      await TasbeehService.createOrUpdateUserGoal(
        {
          totalGoal: newGoal,
        },
        userId
      );

      const state = get();
      if (state.plannerData) {
        set({
          plannerData: {
            ...state.plannerData,
            totalGoal: newGoal,
          },
        });
      }
    } catch (error) {
      console.error("Failed to update total goal:", error);
      throw error;
    }
  },
}));

async function loadFromAsyncStorage(set: (state: Partial<TasbeehState>) => void) {
  try {
    const [countStr, targetStr, lifetimeStr, streakStr, lastActiveDate] = await Promise.all([
      AsyncStorage.getItem("tasbeeh_count"),
      AsyncStorage.getItem("tasbeeh_target"),
      AsyncStorage.getItem("tasbeeh_lifetime_total"),
      AsyncStorage.getItem("tasbeeh_streak"),
      AsyncStorage.getItem(LAST_ACTIVE_DATE_KEY),
    ]);

    const todayKey = getTodayKey();
    const isToday = lastActiveDate === todayKey;

    set({
      count: isToday && countStr ? parseInt(countStr, 10) : 0,
      target: targetStr ? parseInt(targetStr, 10) : 100,
      lifetimeTotal: lifetimeStr ? parseInt(lifetimeStr, 10) : 0,
      streak: streakStr ? parseInt(streakStr, 10) : 0,
      loading: false,
      syncing: false,
      initialized: true,
      initializedUserId: undefined,
    });

    if (!isToday && countStr && parseInt(countStr, 10) > 0) {
      await AsyncStorage.setItem("tasbeeh_count", "0");
    }
  } catch (error) {
    console.error("Failed to load from AsyncStorage:", error);
    set({ loading: false, initialized: true, initializedUserId: undefined });
  }
}

type SyncPayload = Pick<TasbeehState, "count" | "target" | "lifetimeTotal" | "streak"> & {
  date: string;
  sessions?: TasbeehService.SessionRecord[];
};

async function persistLocalSnapshot(
  data: Pick<TasbeehState, "count" | "target" | "lifetimeTotal" | "streak">,
  todayKey: string,
  sessionRecord?: TasbeehService.SessionRecord
) {
  const history = await readDailyHistory();
  const existingIndex = history.findIndex((record) => record.date === todayKey);
  const existingRecord = existingIndex >= 0 ? history[existingIndex] : undefined;
  const nextSessions = sessionRecord
    ? [...(existingRecord?.sessions ?? []), sessionRecord]
    : existingRecord?.sessions;
  const nextRecord: DailyRecord = {
    date: todayKey,
    count: data.count,
    target: data.target,
    ...(nextSessions ? { sessions: nextSessions } : {}),
  };

  if (existingIndex >= 0) {
    history[existingIndex] = nextRecord;
  } else {
    history.unshift(nextRecord);
  }

  const trimmedHistory = history
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 365);

  await Promise.all([
    AsyncStorage.setItem("tasbeeh_count", data.count.toString()),
    AsyncStorage.setItem("tasbeeh_target", data.target.toString()),
    AsyncStorage.setItem("tasbeeh_lifetime_total", data.lifetimeTotal.toString()),
    AsyncStorage.setItem("tasbeeh_streak", data.streak.toString()),
    AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayKey),
    AsyncStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(trimmedHistory)),
    AsyncStorage.setItem(
      PENDING_SYNC_KEY,
      JSON.stringify({
        count: data.count,
        target: data.target,
        lifetimeTotal: data.lifetimeTotal,
        streak: data.streak,
        date: todayKey,
        ...(nextRecord.sessions ? { sessions: nextRecord.sessions } : {}),
      } satisfies SyncPayload)
    ),
  ]);
}

async function readDailyHistory(): Promise<DailyRecord[]> {
  try {
    const historyStr = await AsyncStorage.getItem(DAILY_HISTORY_KEY);
    if (!historyStr) {
      return [];
    }

    const parsed = JSON.parse(historyStr) as DailyRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read daily history:", error);
    return [];
  }
}

async function syncPendingState(
  userId: string | undefined,
  fallbackData: Pick<TasbeehState, "count" | "target" | "lifetimeTotal" | "streak">
) {
  const pendingStr = await AsyncStorage.getItem(PENDING_SYNC_KEY);
  const pending = pendingStr ? (JSON.parse(pendingStr) as SyncPayload) : null;
  const syncData = pending ?? { ...fallbackData, date: getTodayKey() };

  const dailyProgress = await TasbeehService.createOrUpdateDailyProgress(
    syncData.count,
    syncData.target,
    userId,
    syncData.date,
    syncData.sessions
  );

  if (!dailyProgress) {
    return null;
  }

  const calculatedStreak = await TasbeehService.calculateStreak(userId);
  const syncedStreak = Math.max(syncData.streak, calculatedStreak.currentStreak);

  const goal = await TasbeehService.createOrUpdateUserGoal(
    {
      lifetimeTotal: syncData.lifetimeTotal,
      currentStreak: syncedStreak,
      longestStreak: calculatedStreak.longestStreak,
      dailyTarget: syncData.target,
    },
    userId
  );

  if (!goal) {
    return null;
  }

  await AsyncStorage.removeItem(PENDING_SYNC_KEY);
  await AsyncStorage.setItem("tasbeeh_streak", syncedStreak.toString());

  return {
    streak: syncedStreak,
  };
}

async function buildLocalProgressStats(): Promise<ProgressStats> {
  const [countStr, targetStr, lifetimeStr, streakStr, history] = await Promise.all([
    AsyncStorage.getItem("tasbeeh_count"),
    AsyncStorage.getItem("tasbeeh_target"),
    AsyncStorage.getItem("tasbeeh_lifetime_total"),
    AsyncStorage.getItem("tasbeeh_streak"),
    readDailyHistory(),
  ]);

  const count = countStr ? parseInt(countStr, 10) : 0;
  const target = targetStr ? parseInt(targetStr, 10) : 100;
  const lifetimeTotal = lifetimeStr ? parseInt(lifetimeStr, 10) : 0;
  const streak = streakStr ? parseInt(streakStr, 10) : 0;
  const todayRecord = history.find((record) => record.date === getTodayKey());
  const todaySessions = todayRecord?.sessions ?? [];
  const currentMonthHistory = history
    .filter((record) => record.date >= getMonthStartKey())
    .sort((a, b) => b.date.localeCompare(a.date));
  const weeklyTotal = currentMonthHistory.slice(0, 7).reduce((sum, record) => sum + record.count, 0);
  const monthlyTotal = currentMonthHistory.reduce((sum, record) => sum + record.count, 0);
  const bestDay = currentMonthHistory.length > 0 ? Math.max(...currentMonthHistory.map((record) => record.count)) : 0;
  const averagePerDay = Math.round(monthlyTotal / getElapsedDaysInCurrentMonth());
  const remainingGoal = Math.max(0, DEFAULT_TOTAL_GOAL - lifetimeTotal);
  const estimatedDays = averagePerDay > 0 ? Math.ceil(remainingGoal / averagePerDay) : 0;
  const finishDate = new Date();
  finishDate.setDate(finishDate.getDate() + estimatedDays);

  return {
    lifetimeTotal,
    currentStreak: streak,
    longestStreak: streak,
    averagePerDay,
    bestDay,
    todayCount: count,
    todayTarget: target,
    todaySessions: todaySessions.length,
    todaySessionTotal: todaySessions.reduce((sum, session) => sum + session.count, 0),
    weeklyTotal,
    monthlyTotal,
    estimatedFinishDate:
      averagePerDay > 0
        ? finishDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "-",
    estimatedFinishDistance: averagePerDay > 0 ? formatTimeFromNow(estimatedDays) : "?",
    dailyHistory: currentMonthHistory.slice().reverse(),
  };
}

async function buildLocalPlannerData(): Promise<PlannerData> {
  const [targetStr, lifetimeStr] = await Promise.all([
    AsyncStorage.getItem("tasbeeh_target"),
    AsyncStorage.getItem("tasbeeh_lifetime_total"),
  ]);

  return {
    lifetimeTotal: lifetimeStr ? parseInt(lifetimeStr, 10) : 0,
    totalGoal: DEFAULT_TOTAL_GOAL,
    dailyTarget: targetStr ? parseInt(targetStr, 10) : DEFAULT_PLANNER_DAILY_TARGET,
  };
}
