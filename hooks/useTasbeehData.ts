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

      setData({
        count: todayProgress?.count ?? 0,
        target: goal?.dailyTarget ?? 100,
        lifetimeTotal: goal?.lifetimeTotal ?? 0,
        streak: goal?.currentStreak ?? 0,
        loading: false,
        syncing: false,
      });
    } catch (error) {
      console.error("Failed to load data from Appwrite:", error);
      // Fallback to AsyncStorage
      await loadFromAsyncStorage();
    }
  }, []);

  // Fallback: Load from AsyncStorage
  const loadFromAsyncStorage = async () => {
    try {
      const [countStr, targetStr, lifetimeStr, streakStr] = await Promise.all([
        AsyncStorage.getItem("tasbeeh_count"),
        AsyncStorage.getItem("tasbeeh_target"),
        AsyncStorage.getItem("tasbeeh_lifetime_total"),
        AsyncStorage.getItem("tasbeeh_streak"),
      ]);

      setData({
        count: countStr ? parseInt(countStr, 10) : 0,
        target: targetStr ? parseInt(targetStr, 10) : 100,
        lifetimeTotal: lifetimeStr ? parseInt(lifetimeStr, 10) : 0,
        streak: streakStr ? parseInt(streakStr, 10) : 0,
        loading: false,
        syncing: false,
      });
    } catch (error) {
      console.error("Failed to load from AsyncStorage:", error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  // Save data to Appwrite (with debouncing)
  const saveData = useCallback(
    async (newData: Partial<Omit<TasbeehData, "loading" | "syncing">>) => {
      try {
        const now = Date.now();
        // Debounce: only sync every 2 seconds
        if (now - lastSyncTime < 2000) {
          // Save to AsyncStorage immediately for responsiveness
          if (newData.count !== undefined) {
            await AsyncStorage.setItem("tasbeeh_count", newData.count.toString());
          }
          if (newData.target !== undefined) {
            await AsyncStorage.setItem("tasbeeh_target", newData.target.toString());
          }
          if (newData.lifetimeTotal !== undefined) {
            await AsyncStorage.setItem(
              "tasbeeh_lifetime_total",
              newData.lifetimeTotal.toString()
            );
          }
          if (newData.streak !== undefined) {
            await AsyncStorage.setItem("tasbeeh_streak", newData.streak.toString());
          }
          return;
        }

        setLastSyncTime(now);
        setData((prev) => ({ ...prev, syncing: true }));

        // Update local state
        setData((prev) => ({ ...prev, ...newData, syncing: true }));

        // Sync to Appwrite
        const currentData = { ...data, ...newData };

        await Promise.all([
          TasbeehService.createOrUpdateUserGoal({
            lifetimeTotal: currentData.lifetimeTotal,
            currentStreak: currentData.streak,
            dailyTarget: currentData.target,
          }),
          TasbeehService.createOrUpdateDailyProgress(
            currentData.count,
            currentData.target
          ),
        ]);

        setData((prev) => ({ ...prev, syncing: false }));
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
