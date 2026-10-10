import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const ANDROID_CHANNEL_ID = "general";

export type NotificationOptions = {
    title: string;
    body?: string;
    data?: Record<string, unknown>;
    trigger?: Notifications.NotificationTriggerInput;
};

export function isNotificationSupported(): boolean {
    return Platform.OS !== "web";
}

export function configureNotifications(): void {
    if (!isNotificationSupported()) return;

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

export async function ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== "android") return;

    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#075B46",
    });
}

export async function hasNotificationPermission(): Promise<boolean> {
    if (!isNotificationSupported()) return false;

    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
}

export async function requestNotificationPermission(): Promise<boolean> {
    if (!isNotificationSupported()) return false;

    const current = await Notifications.getPermissionsAsync();
    if (current.status === "granted") return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === "granted";
}

export async function scheduleNotification(options: NotificationOptions): Promise<string> {
    if (!isNotificationSupported()) throw new Error("Notifications are not supported on this platform.");

    await ensureAndroidChannel();

    return Notifications.scheduleNotificationAsync({
        content: {
            title: options.title,
            body: options.body,
            data: options.data,
            sound: "default",
        },
        trigger: options.trigger ?? null,
    });
}

export async function scheduleDailyReminder(options: {
    title: string;
    body?: string;
    data?: Record<string, unknown>;
    hour: number;
    minute: number;
}): Promise<string> {
    return scheduleNotification({
        title: options.title,
        body: options.body,
        data: options.data,
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: options.hour,
            minute: options.minute,
        },
    });
}

export async function scheduleOneShotReminder(options: {
    title: string;
    body?: string;
    data?: Record<string, unknown>;
    date: Date;
}): Promise<string> {
    return scheduleNotification({
        title: options.title,
        body: options.body,
        data: options.data,
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: options.date,
        },
    });
}

export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    if (!isNotificationSupported()) return [];

    return Notifications.getAllScheduledNotificationsAsync();
}

export async function cancelScheduledNotification(notificationId: string): Promise<void> {
    if (!isNotificationSupported()) return;

    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
    if (!isNotificationSupported()) return;

    await Notifications.cancelAllScheduledNotificationsAsync();
}