import client from "@/config/appwrite";
import { getTodayKey } from "@/services/tasbeehService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Functions } from "appwrite";
import { recordTasbeehDebug } from "@/services/tasbeehDebug";

const SYNC_EVENTS_KEY = "tasbeeh_sync_events";
const SYNC_FUNCTION_ID = "tasbeeh-sync";
const DAILY_HISTORY_KEY = "tasbeeh_daily_history";
const MIGRATION_ID_KEY = "tasbeeh_guest_migration_id";
export const GUEST_DATA_PENDING_KEY = "tasbeeh_guest_data_pending";
const GUEST_BASELINE_HISTORY_KEY = "tasbeeh_guest_baseline_history";

export interface SyncEvent {
  eventId: string;
  userId: string;
  date: string;
  amount: number;
  target: number;
  sessionId?: string;
  createdAt: string;
  attempts: number;
}

const functions = new Functions(client);

let flushPromise: Promise<number> | null = null;

function generateEventId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

async function readEvents(): Promise<SyncEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeEvents(events: SyncEvent[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_EVENTS_KEY, JSON.stringify(events));
}

export async function getPendingEvents(): Promise<SyncEvent[]> {
  return readEvents();
}

export async function hasPendingEvents(): Promise<boolean> {
  const events = await readEvents();
  return events.length > 0;
}

// Enqueue one increment batch with a stable eventId BEFORE any network call.
export async function enqueueSyncEvent(
  amount: number,
  target: number,
  userId?: string,
  sessionId?: string
): Promise<void> {
  // Anonymous progress is local-only and must never enter the sync queue.
  if (!amount || amount <= 0 || !userId || userId.startsWith("anon_")) return;

  const events = await readEvents();
  events.push({
    eventId: generateEventId(),
    userId,
    date: getTodayKey(),
    amount,
    target: target || 100,
    ...(sessionId ? { sessionId } : {}),
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeEvents(events);
  void recordTasbeehDebug("queue:enqueued", {
    eventId: events[events.length - 1]?.eventId,
    amount,
    pendingCount: events.length,
  });
}

async function applyEvent(event: SyncEvent): Promise<boolean> {
  const execution = await functions.createExecution(
    SYNC_FUNCTION_ID,
    JSON.stringify({
      eventId: event.eventId,
      userId: event.userId,
      date: event.date,
      amount: event.amount,
      target: event.target,
      ...(event.sessionId ? { sessionId: event.sessionId } : {}),
    }),
    false
  );

  if (execution.responseStatusCode === 200 && execution.responseBody) {
    try {
      const body = JSON.parse(execution.responseBody);
      return body?.accepted === true;
    } catch {
      return false;
    }
  }
  return false;
}

async function flushOnce(): Promise<number> {
  const events = (await readEvents()).filter((event) => !event.userId.startsWith("anon_"));
  await writeEvents(events);
  if (events.length === 0) return 0;
  void recordTasbeehDebug("queue:flush-start", { pendingCount: events.length });

  const remaining: SyncEvent[] = [];

  for (const event of events) {
    try {
      const accepted = await applyEvent(event);
      if (!accepted) {
        remaining.push({ ...event, attempts: event.attempts + 1 });
      }
    } catch {
      remaining.push({ ...event, attempts: event.attempts + 1 });
    }
  }

  await writeEvents(remaining);
  void recordTasbeehDebug("queue:flush-complete", {
    attempted: events.length,
    remaining: remaining.length,
  });
  return remaining.length;
}

// Serialize flushes so concurrent enqueues/reconnects don't race the queue.
export function flushPendingEventQueue(): Promise<number> {
  if (!flushPromise) {
    flushPromise = flushOnce().finally(() => {
      flushPromise = null;
    });
  }
  return flushPromise;
}

export async function migrateGuestData(authenticatedUserId: string): Promise<boolean> {
  if (!authenticatedUserId || authenticatedUserId.startsWith("anon_")) return false;

  const pendingGuestData = await AsyncStorage.getItem(GUEST_DATA_PENDING_KEY);
  if (pendingGuestData !== "true") return true;

  const rawHistory = await AsyncStorage.getItem(DAILY_HISTORY_KEY);
  if (!rawHistory) {
    await AsyncStorage.removeItem(GUEST_DATA_PENDING_KEY);
    return true;
  }

  let history: { date?: string; count?: number; target?: number }[];
  try {
    history = JSON.parse(rawHistory);
  } catch {
    return false;
  }

  let baseline: { date?: string; count?: number }[] = [];
  const rawBaseline = await AsyncStorage.getItem(GUEST_BASELINE_HISTORY_KEY);
  if (rawBaseline) {
    try {
      baseline = JSON.parse(rawBaseline);
    } catch {
      baseline = [];
    }
  }
  const baselineByDate = new Map(baseline.map((record) => [record.date, record.count ?? 0]));

  const migrationId = (await AsyncStorage.getItem(MIGRATION_ID_KEY)) || `guest-migration-${Date.now()}`;
  await AsyncStorage.setItem(MIGRATION_ID_KEY, migrationId);

  const records = history
    .filter((record) => typeof record.date === "string" && Number.isInteger(record.count) && record.count > 0)
    .map((record) => ({
      eventId: `${migrationId}:${record.date}`,
      date: record.date,
      amount: (record.count ?? 0) - (baselineByDate.get(record.date) ?? 0),
      target: record.target || 100,
    }))
    .filter((record) => record.amount > 0);

  if (records.length === 0) {
    await AsyncStorage.multiRemove([GUEST_DATA_PENDING_KEY, MIGRATION_ID_KEY, GUEST_BASELINE_HISTORY_KEY]);
    return true;
  }

  const execution = await functions.createExecution(
    SYNC_FUNCTION_ID,
    JSON.stringify({ type: "migration", migrationId, records }),
    false,
  );
  if (execution.responseStatusCode !== 200 || !execution.responseBody) return false;

  const body = JSON.parse(execution.responseBody);
  if (body?.accepted !== true) return false;

  await AsyncStorage.multiRemove([
    DAILY_HISTORY_KEY,
    MIGRATION_ID_KEY,
    GUEST_DATA_PENDING_KEY,
    GUEST_BASELINE_HISTORY_KEY,
  ]);
  return true;
}

export async function markGuestBaseline(): Promise<void> {
  const history = await AsyncStorage.getItem(DAILY_HISTORY_KEY);
  if (history) {
    await AsyncStorage.setItem(GUEST_BASELINE_HISTORY_KEY, history);
  }
  await AsyncStorage.multiRemove([GUEST_DATA_PENDING_KEY, MIGRATION_ID_KEY]);
}
