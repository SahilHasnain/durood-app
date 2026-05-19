import * as TasbeehService from "@/services/tasbeehService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface DailyRecord {
  date: string;
  count: number;
  target: number;
}

interface ProgressStats {
  lifetimeTotal: number;
  currentStreak: number;
  longestStreak: number;
  averagePerDay: number;
  bestDay: number;
  todayCount: number;
  todayTarget: number;
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
  saveData: (newData: Partial<Pick<TasbeehState, "count" | "target" | "lifetimeTotal" | "streak">>, userId?: string) => Promise<void>;
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

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

const DEFAULT_TOTAL_GOAL = 10000000; // 1 Crore

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

      // Initial sync from AsyncStorage to Appwrite if needed
      const hasAppwriteData = await TasbeehService.getUserGoal(userId);
      if (!hasAppwriteData) {
        console.log("No Appwrite data found, syncing from AsyncStorage...");
        await TasbeehService.syncFromLocalStorage(userId);
      }

      const [goal, todayProgress] = await Promise.all([
        TasbeehService.getUserGoal(userId),
        TasbeehService.getTodayProgress(userId),
      ]);

      const calculatedStreak = await TasbeehService.calculateStreak(userId);

      set({
        count: todayProgress?.count ?? 0,
        target: goal?.dailyTarget ?? 100,
        lifetimeTotal: goal?.lifetimeTotal ?? 0,
        streak: calculatedStreak.currentStreak ?? goal?.currentStreak ?? 0,
        loading: false,
        syncing: false,
        initialized: true,
        initializedUserId: userId,
      });

      if (
        goal &&
        (goal.currentStreak !== calculatedStreak.currentStreak ||
          goal.longestStreak !== calculatedStreak.longestStreak)
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

  saveData: async (newData, userId?: string) => {
    try {
      const currentState = get();
      const updatedData = { ...currentState, ...newData };
      const todayKey = getTodayKey();

      // Update local state immediately for responsive UI
      set({ ...newData, syncing: true });

      const now = Date.now();
      // Debounce: only sync every 2 seconds
      if (now - currentState.lastSyncTime < 2000) {
        // Save to AsyncStorage immediately for responsiveness
        await Promise.all([
          AsyncStorage.setItem("tasbeeh_count", updatedData.count.toString()),
          AsyncStorage.setItem("tasbeeh_target", updatedData.target.toString()),
          AsyncStorage.setItem("tasbeeh_lifetime_total", updatedData.lifetimeTotal.toString()),
          AsyncStorage.setItem("tasbeeh_streak", updatedData.streak.toString()),
          AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayKey),
        ]);
        set({ syncing: false });
        return;
      }

      set({ lastSyncTime: now });

      await Promise.all([
        AsyncStorage.setItem("tasbeeh_count", updatedData.count.toString()),
        AsyncStorage.setItem("tasbeeh_target", updatedData.target.toString()),
        AsyncStorage.setItem("tasbeeh_lifetime_total", updatedData.lifetimeTotal.toString()),
        AsyncStorage.setItem("tasbeeh_streak", updatedData.streak.toString()),
        AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayKey),
      ]);

      await Promise.all([
        TasbeehService.createOrUpdateDailyProgress(
          updatedData.count,
          updatedData.target,
          userId
        ),
      ]);

      const calculatedStreak = await TasbeehService.calculateStreak(userId);
      const syncedStreak = Math.max(updatedData.streak, calculatedStreak.currentStreak);

      await TasbeehService.createOrUpdateUserGoal(
        {
          lifetimeTotal: updatedData.lifetimeTotal,
          currentStreak: syncedStreak,
          longestStreak: calculatedStreak.longestStreak,
          dailyTarget: updatedData.target,
        },
        userId
      );

      set({
        streak: syncedStreak,
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
        TasbeehService.getDailyHistory(30, userId),
      ]);

      const lifetimeTotal = goal?.lifetimeTotal ?? 0;
      const currentStreak = goal?.currentStreak ?? 0;
      const longestStreak = goal?.longestStreak ?? 0;

      const weeklyTotal = history
        .slice(0, 7)
        .reduce((sum, record) => sum + record.count, 0);

      const monthlyTotal = history.reduce((sum, record) => sum + record.count, 0);

      const bestDay =
        history.length > 0 ? Math.max(...history.map((r) => r.count)) : 0;

      const averagePerDay =
        history.length > 0 ? Math.round(lifetimeTotal / history.length) : 0;

      const remainingGoal = 10000000 - lifetimeTotal;
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

      const dailyHistory = history.map((record) => ({
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
          todayCount: history[0]?.count ?? 0,
          todayTarget: history[0]?.target ?? 100,
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
      set({ progressLoading: false });
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
          dailyTarget: goal?.dailyTarget ?? 100,
        },
        plannerLoading: false,
        plannerInitialized: true,
        initializedUserId: userId,
      });
    } catch (error) {
      console.error("Failed to load planner data:", error);
      set({ plannerLoading: false });
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
