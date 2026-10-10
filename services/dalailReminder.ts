import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDalailInterest, recordDalailActivity, type DalailActivityType } from "@/services/dalailActivity";
import {
    cancelScheduledNotification,
    hasNotificationPermission,
    scheduleDailyReminder,
} from "@/services/notifications";

const REMINDER_ID_KEY = "dalail_reminder_notification_id";
export const DEFAULT_DALIAL_REMINDER_HOUR = 20;
export const DEFAULT_DALIAL_REMINDER_MINUTE = 0;

async function getReminderId(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(REMINDER_ID_KEY);
    } catch {
        return null;
    }
}

export async function evaluateDalailReminder(): Promise<void> {
    const granted = await hasNotificationPermission();
    if (!granted) return;

    const interest = await getDalailInterest();
    const existingId = await getReminderId();

    if (!interest.interested) {
        if (existingId) {
            await cancelScheduledNotification(existingId);
            await AsyncStorage.removeItem(REMINDER_ID_KEY);
        }
        return;
    }

    if (existingId) return;

    const id = await scheduleDailyReminder({
        title: "Dalail reminder",
        body: "It's time for your daily Dalail reading.",
        hour: DEFAULT_DALIAL_REMINDER_HOUR,
        minute: DEFAULT_DALIAL_REMINDER_MINUTE,
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
}

export async function handleDalailActivity(type: DalailActivityType): Promise<void> {
    await recordDalailActivity(type);
    await evaluateDalailReminder();
}