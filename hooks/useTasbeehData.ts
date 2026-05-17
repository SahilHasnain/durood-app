import * as TasbeehService from "@/services/tasbeehService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

interface TasbeehData {
  count: number;
  target: number;
  lifetimeTotal: number;
  streak: number;
  loading: boolean;
  syncing: boolean;
}

const LAST_ACTIVE_DATE_KEY = "tasbeeh_last_active_date";

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function useTasbeehData() {
  const [data, setData] = useState<TasbeehData>({
    count: 0,
    target: 100,
    lifetimeTotal: 0,
    streak: 0,
    loading: true,
    syncing: false,
  });

  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Load data from Appwrite
  const loadData = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true }));

      const [goal, todayProgress] = await Promise.all([
        TasbeehService.getUserGoal(),
        TasbeehService.getTodayProgress(),
      ]);

      const calculatedStreak = await TasbeehService.calculateStreak();

      setData({
        count: todayProgress?.count ?? 0,
        target: goal?.dailyTarget ?? 100,
        lifetimeTotal: goal?.lifetimeTotal ?? 0,
        streak: calculatedStreak.currentStreak ?? goal?.currentStreak ?? 0,
        loading: false,
        syncing: false,
      });

      if (
        goal &&
        (goal.currentStreak !== calculatedStreak.currentStreak ||
          goal.longestStreak !== calculatedStreak.longestStreak)
      ) {
        await TasbeehService.createOrUpdateUserGoal({
          currentStreak: calculatedStreak.currentStreak,
          longestStreak: calculatedStreak.longestStreak,
        });
      }
    } catch (error) {
      console.error("Failed to load data from Appwrite:", error);
      // Fallback to AsyncStorage
      await loadFromAsyncStorage();
    }
  }, []);

  // Fallback: Load from AsyncStorage
  const loadFromAsyncStorage = async () => {
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

      setData({
        count: isToday && countStr ? parseInt(countStr, 10) : 0,
        target: targetStr ? parseInt(targetStr, 10) : 100,
        lifetimeTotal: lifetimeStr ? parseInt(lifetimeStr, 10) : 0,
        streak: streakStr ? parseInt(streakStr, 10) : 0,
        loading: false,
        syncing: false,
      });

      if (!isToday && countStr && parseInt(countStr, 10) > 0) {
        await AsyncStorage.setItem("tasbeeh_count", "0");
      }
    } catch (error) {
      console.error("Failed to load from AsyncStorage:", error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  // Save data to Appwrite (with debouncing)
  const saveData = useCallback(
    async (newData: Partial<Omit<TasbeehData, "loading" | "syncing">>) => {
      try {
        const currentData = { ...data, ...newData };
        const todayKey = getTodayKey();

        // Update local state immediately for responsive UI
        setData((prev) => ({ ...prev, ...newData, syncing: true }));

        const now = Date.now();
        // Debounce: only sync every 2 seconds
        if (now - lastSyncTime < 2000) {
          // Save to AsyncStorage immediately for responsiveness
          await Promise.all([
            AsyncStorage.setItem("tasbeeh_count", currentData.count.toString()),
            AsyncStorage.setItem("tasbeeh_target", currentData.target.toString()),
            AsyncStorage.setItem(
              "tasbeeh_lifetime_total",
              currentData.lifetimeTotal.toString()
            ),
            AsyncStorage.setItem("tasbeeh_streak", currentData.streak.toString()),
            AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayKey),
          ]);
          setData((prev) => ({ ...prev, syncing: false }));
          return;
        }

        setLastSyncTime(now);
        await Promise.all([
          AsyncStorage.setItem("tasbeeh_count", currentData.count.toString()),
          AsyncStorage.setItem("tasbeeh_target", currentData.target.toString()),
          AsyncStorage.setItem(
            "tasbeeh_lifetime_total",
            currentData.lifetimeTotal.toString()
          ),
          AsyncStorage.setItem("tasbeeh_streak", currentData.streak.toString()),
          AsyncStorage.setItem(LAST_ACTIVE_DATE_KEY, todayKey),
        ]);

        await Promise.all([
          TasbeehService.createOrUpdateDailyProgress(
            currentData.count,
            currentData.target
          ),
        ]);

        const calculatedStreak = await TasbeehService.calculateStreak();
        const syncedStreak = Math.max(currentData.streak, calculatedStreak.currentStreak);

        await TasbeehService.createOrUpdateUserGoal({
          lifetimeTotal: currentData.lifetimeTotal,
          currentStreak: syncedStreak,
          longestStreak: calculatedStreak.longestStreak,
          dailyTarget: currentData.target,
        });

        setData((prev) => ({
          ...prev,
          ...currentData,
          streak: syncedStreak,
          syncing: false,
        }));
      } catch (error) {
        console.error("Failed to save data to Appwrite:", error);
        setData((prev) => ({ ...prev, syncing: false }));
      }
    },
    [data, lastSyncTime]
  );

  // Initial sync from AsyncStorage to Appwrite
  const performInitialSync = useCallback(async () => {
    try {
      const hasAppwriteData = await TasbeehService.getUserGoal();
      if (!hasAppwriteData) {
        console.log("No Appwrite data found, syncing from AsyncStorage...");
        await TasbeehService.syncFromLocalStorage();
      }
    } catch (error) {
      console.error("Initial sync failed:", error);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    performInitialSync().then(() => loadData());
  }, [loadData, performInitialSync]);

  return {
    ...data,
    saveData,
    reload: loadData,
  };
}
