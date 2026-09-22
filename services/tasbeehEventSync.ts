import client from "@/config/appwrite";
import { getTodayKey, getUserId } from "@/services/tasbeehService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Functions } from "appwrite";

const SYNC_EVENTS_KEY = "tasbeeh_sync_events";
const SYNC_FUNCTION_ID = "tasbeeh-sync";

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
  if (!amount || amount <= 0) return;

  const resolvedUserId = userId ?? (await getUserId());
  const events = await readEvents();
  events.push({
    eventId: generateEventId(),
    userId: resolvedUserId,
    date: getTodayKey(),
    amount,
    target: target || 100,
    ...(sessionId ? { sessionId } : {}),
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeEvents(events);
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
  const events = await readEvents();
  if (events.length === 0) return 0;

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