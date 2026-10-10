import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    cancelScheduledNotification,
    hasNotificationPermission,
    scheduleOneShotReminder,
} from "@/services/notifications";

const ARMED_KEY = "tasbeeh_streak_reminder";
export const STREAK_REMINDER_HOUR = 20;
export const STREAK_REMINDER_MINUTE = 0;

type ArmedReminder = {
    notificationId: string;
    dateKey: string;
};

function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
    ).padStart(2, "0")}`;
}

function getNextWarnDate(): Date {
    const date = new Date();
    date.setHours(STREAK_REMINDER_HOUR, STREAK_REMINDER_MINUTE, 0, 0);
    if (date.getTime() <= Date.now()) {
        date.setDate(date.getDate() + 1);
    }
    return date;
}

async function readStreakSnapshot(): Promise<{ count: number; streak: number }> {
    const [countStr, streakStr, lastActiveDate] = await Promise.all([
        AsyncStorage.getItem("tasbeeh_count"),
        AsyncStorage.getItem("tasbeeh_streak"),
        AsyncStorage.getItem("tasbeeh_last_active_date"),
    ]);

    const count = lastActiveDate === getTodayKey() && countStr ? parseInt(countStr, 10) : 0;
    const streak = streakStr ? parseInt(streakStr, 10) : 0;

    return {
        count: Number.isFinite(count) ? count : 0,
        streak: Number.isFinite(streak) ? streak : 0,
    };
}

async function readArmed(): Promise<ArmedReminder | null> {
    try {
        const raw = await AsyncStorage.getItem(ARMED_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ArmedReminder;
        return parsed?.notificationId ? parsed : null;
    } catch {
        return null;
    }
}

export async function evaluateStreakReminder(): Promise<void> {
    const granted = await hasNotificationPermission();
    if (!granted) return;

    const today = getTodayKey();
    const snapshot = await readStreakSnapshot();
    const armed = await readArmed();

    const hasRecited = snapshot.count > 0;

    if (hasRecited) {
        if (armed) {
            await cancelScheduledNotification(armed.notificationId);
            await AsyncStorage.removeItem(ARMED_KEY);
        }
        return;
    }

    if (armed && armed.dateKey === today) return;

    if (armed) {
        await cancelScheduledNotification(armed.notificationId);
    }

    const notificationId = await scheduleOneShotReminder({
        title: snapshot.streak > 0 ? "Streak at risk!" : "Start your streak",
        body:
            snapshot.streak > 0
                ? `You're on a ${snapshot.streak}-day streak. Recite once today to keep it.`
                : `Recite at least once today to start your streak.`,
        date: getNextWarnDate(),
    });
    await AsyncStorage.setItem(ARMED_KEY, JSON.stringify({ notificationId, dateKey: today }));
}