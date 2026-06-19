import { useAuth } from "@/contexts/AuthContext";
import { useTasbeehStore } from "@/stores/tasbeehStore";
import { useCallback, useEffect } from "react";

export function useTasbeehData() {
  const { user } = useAuth();
  const count = useTasbeehStore((state) => state.count);
  const target = useTasbeehStore((state) => state.target);
  const lifetimeTotal = useTasbeehStore((state) => state.lifetimeTotal);
  const streak = useTasbeehStore((state) => state.streak);
  const loading = useTasbeehStore((state) => state.loading);
  const syncing = useTasbeehStore((state) => state.syncing);
  const initialized = useTasbeehStore((state) => state.initialized);
  const initializedUserId = useTasbeehStore((state) => state.initializedUserId);
  const loadData = useTasbeehStore((state) => state.loadData);
  const refreshStoreData = useTasbeehStore((state) => state.refreshData);
  const saveStoreData = useTasbeehStore((state) => state.saveData);
  const reloadStoreData = useTasbeehStore((state) => state.reload);

  useEffect(() => {
    const activeUserId = user?.id;
    if (initialized && initializedUserId === activeUserId) {
      return;
    }

    void loadData(activeUserId);
  }, [user?.id, initialized, initializedUserId, loadData]);

  const saveData = useCallback(
    (
      newData: Partial<
        Pick<
          ReturnType<typeof useTasbeehStore.getState>,
          "count" | "target" | "lifetimeTotal" | "streak"
        >
      >,
      sessionRecord?: Parameters<typeof saveStoreData>[2]
    ) => saveStoreData(newData, user?.id, sessionRecord),
    [saveStoreData, user?.id]
  );

  const reload = useCallback(() => reloadStoreData(user?.id), [reloadStoreData, user?.id]);
  const refreshData = useCallback(
    () => refreshStoreData(user?.id),
    [refreshStoreData, user?.id]
  );

  return {
    count,
    target,
    lifetimeTotal,
    streak,
    loading,
    syncing,
    initialized,
    saveData,
    reload,
    refreshData,
  };
}
