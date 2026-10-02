import AsyncStorage from "@react-native-async-storage/async-storage";

const DEBUG_KEY = "tasbeeh_debug_log";
const MAX_ENTRIES = 250;
let writeQueue = Promise.resolve();

export type TasbeehDebugEntry = {
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
};

export async function recordTasbeehDebug(
  event: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const entry: TasbeehDebugEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
  };

  console.warn(`[tasbeeh-debug] ${event}`, details);

  writeQueue = writeQueue.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(DEBUG_KEY);
      const previous = raw ? (JSON.parse(raw) as TasbeehDebugEntry[]) : [];
      const entries = Array.isArray(previous) ? previous.slice(-(MAX_ENTRIES - 1)) : [];
      entries.push(entry);
      await AsyncStorage.setItem(DEBUG_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn("[tasbeeh-debug] failed to persist diagnostic entry", error);
    }
  });

  await writeQueue;
}

export async function getTasbeehDebugLog(): Promise<TasbeehDebugEntry[]> {
  const raw = await AsyncStorage.getItem(DEBUG_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function clearTasbeehDebugLog(): Promise<void> {
  await AsyncStorage.removeItem(DEBUG_KEY);
}
