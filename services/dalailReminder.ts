import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDalailInterest, recordDalailActivity, type DalailActivityType } from "@/services/dalailActivity";
import { getNotificationSettings } from "@/services/notificationSettings";
import {
    cancelScheduledNotification,
    hasNotificationPermission,
    scheduleDailyReminder,
} from "@/services/notifications";

const REMINDER_ID_KEY = "dalail_reminder_notification_id";

async function getReminderId(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(REMINDER_ID_KEY);
    } catch {
        return null;
    }
}

export async function evaluateDalailReminder(): Promise<void> {
    const settings = await getNotificationSettings();
    const existingId = await getReminderId();

    if (!settings.dalailEnabled) {
        if (existingId) {
            await cancelScheduledNotification(existingId);
            await AsyncStorage.removeItem(REMINDER_ID_KEY);
        }
        return;
    }

    const granted = await hasNotificationPermission();
    if (!granted) return;

    const interest = await getDalailInterest();

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
        hour: settings.dalailHour,
        minute: settings.dalailMinute,
    });
    await AsyncStorage.setItem(REMINDER_ID_KEY, id);
}

export async function handleDalailActivity(type: DalailActivityType): Promise<void> {
    await recordDalailActivity(type);
    await evaluateDalailReminder();
}