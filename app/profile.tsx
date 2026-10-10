import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useAppearance, type AppearancePreference } from "@/contexts/AppearanceContext";
import { getAppwriteUserPrefs, updateAppwriteUserPrefs } from "@/services/appwriteAuth";
import { requestNotificationPermission } from "@/services/notifications";
import {
    DEFAULT_NOTIFICATION_SETTINGS,
    getNotificationSettings,
    updateNotificationSettings,
    type NotificationSettings,
} from "@/services/notificationSettings";
import { evaluateDalailReminder } from "@/services/dalailReminder";
import { evaluateStreakReminder } from "@/services/streakReminder";
import { joinCityLeaderboard, leaveCityLeaderboard } from "@/services/cityLeaderboard";
import { clearTasbeehDebugLog, getTasbeehDebugLog, TasbeehDebugEntry } from "@/services/tasbeehDebug";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
    const { user, isAuthenticated, logout, signInWithGoogle } = useAuth();
    const { preference, setPreference, theme: activeTheme } = useAppearance();
    const styles = createStyles(activeTheme);
    const [submitting, setSubmitting] = useState(false);
    const [debugVisible, setDebugVisible] = useState(false);
    const [debugEntries, setDebugEntries] = useState<TasbeehDebugEntry[]>([]);
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [cityLoading, setCityLoading] = useState(false);
    const [citySaving, setCitySaving] = useState(false);
    const [cityMessage, setCityMessage] = useState("");
    const [showLeaveCityConfirm, setShowLeaveCityConfirm] = useState(false);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [accountMessage, setAccountMessage] = useState("");
    const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
    const [notificationMessage, setNotificationMessage] = useState("");
    const [timeSheet, setTimeSheet] = useState<"streak" | "dalail" | null>(null);
    const [timeHour, setTimeHour] = useState("");
    const [timeMinute, setTimeMinute] = useState("");
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === "web" && width >= 1200;

    useEffect(() => {
        let active = true;
        getNotificationSettings()
            .then((settings) => {
                if (active) setNotifSettings(settings);
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        let active = true;
        getAppwriteUserPrefs()
            .then((prefs) => {
                const savedCity = prefs.leaderboardCity as { city?: string; country?: string } | undefined;
                if (active && savedCity) {
                    setCity(savedCity.city ?? "");
                    setCountry(savedCity.country ?? "");
                }
            })
            .catch((error) => console.warn("Could not load city preference:", error));
        return () => { active = false; };
    }, [isAuthenticated, user?.id]);

    const normalizedCityId = (cityName: string, countryName: string) => {
        const slug = (value: string) => value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        return `${slug(countryName)}:${slug(cityName)}`;
    };

    const handleUseCurrentCity = async () => {
        setCityMessage("");
        try {
            setCityLoading(true);
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== "granted") {
                setCityMessage("Location permission was not granted. You can enter your city manually.");
                return;
            }
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const [address] = await Location.reverseGeocodeAsync({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });
            const suggestedCity = address?.city ?? address?.district ?? address?.subregion ?? address?.region;
            if (!suggestedCity) {
                setCityMessage("Could not identify a city from your location. Please enter it manually.");
                return;
            }
            setCity(suggestedCity);
            setCountry(address?.country ?? "");
            setCityMessage("City suggested. Save to opt into the city leaderboard.");
        } catch (error) {
            console.error("Could not resolve current city:", error);
            setCityMessage("Could not determine your city. You can enter it manually.");
        } finally {
            setCityLoading(false);
        }
    };

    const handleSaveCity = async () => {
        const cityName = city.trim();
        const countryName = country.trim();
        if (!cityName || !countryName) {
            setCityMessage("Enter both a city and country to join the city leaderboard.");
            return;
        }
        try {
            setCitySaving(true);
            await joinCityLeaderboard(cityName, countryName, user?.name || "Community member");
            const currentPrefs = await getAppwriteUserPrefs();
            await updateAppwriteUserPrefs({
                ...currentPrefs,
                leaderboardCity: {
                    city: cityName,
                    country: countryName,
                    cityId: normalizedCityId(cityName, countryName),
                },
            });
            setCityMessage(`City leaderboard set to ${cityName}, ${countryName}.`);
        } catch (error) {
            console.error("Could not save city preference:", error);
            setCityMessage("Could not save your city. Please try again.");
        } finally {
            setCitySaving(false);
        }
    };

    const handleRemoveCity = async () => {
        try {
            setCitySaving(true);
            await leaveCityLeaderboard();
            const currentPrefs = await getAppwriteUserPrefs();
            const { leaderboardCity: _removedCity, ...remainingPrefs } = currentPrefs;
            await updateAppwriteUserPrefs(remainingPrefs);
            setCity("");
            setCountry("");
            setCityMessage("You have left the city leaderboard.");
        } catch (error) {
            console.error("Could not remove city preference:", error);
            setCityMessage("Could not remove your city. Please try again.");
        } finally {
            setCitySaving(false);
        }
    };

    const handleGoogleSignIn = useCallback(async () => {
        try {
            setSubmitting(true);

            await signInWithGoogle();
        } catch (err: any) {
            Alert.alert(
                "Sign In Failed",
                err?.message || "Could not complete Google sign-in."
            );
        } finally {
            setSubmitting(false);
        }
    }, [signInWithGoogle]);

    const executeLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Sign out failed:", error);
            setAccountMessage("Could not sign out. Please try again.");
        }
    };

    const handleLogout = () => {
        setAccountMessage("");
        setShowSignOutConfirm(true);
    };

    const openDebugLog = async () => {
        setDebugEntries(await getTasbeehDebugLog());
        setDebugVisible(true);
    };

    const refreshDebugLog = async () => {
        setDebugEntries(await getTasbeehDebugLog());
    };

    const formatTime = (hour: number, minute: number) =>
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    const toggleReminder = async (kind: "streak" | "dalail", enabled: boolean) => {
        setNotificationMessage("");
        if (enabled) {
            const granted = await requestNotificationPermission();
            if (!granted) {
                setNotificationMessage("Notifications are blocked. Allow notifications in your device settings to use reminders.");
                return;
            }
        }
        const next = kind === "streak"
            ? { ...notifSettings, streakEnabled: enabled }
            : { ...notifSettings, dalailEnabled: enabled };
        setNotifSettings(next);
        await updateNotificationSettings(next);
        if (kind === "streak") {
            await evaluateStreakReminder().catch((error) => console.error("Failed to update streak reminder:", error));
        } else {
            await evaluateDalailReminder().catch((error) => console.error("Failed to update dalail reminder:", error));
        }
    };

    const openTimeSheet = (kind: "streak" | "dalail") => {
        setNotificationMessage("");
        setTimeHour(String(kind === "streak" ? notifSettings.streakHour : notifSettings.dalailHour));
        setTimeMinute(String(kind === "streak" ? notifSettings.streakMinute : notifSettings.dalailMinute));
        setTimeSheet(kind);
    };

    const handleSaveTime = async () => {
        const hour = parseInt(timeHour, 10);
        const minute = parseInt(timeMinute, 10);
        if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
            setNotificationMessage("Enter an hour between 0 and 23.");
            return;
        }
        if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
            setNotificationMessage("Enter minutes between 0 and 59.");
            return;
        }
        const kind = timeSheet;
        const patch = kind === "streak"
            ? { streakHour: hour, streakMinute: minute }
            : { dalailHour: hour, dalailMinute: minute };
        const next = { ...notifSettings, ...patch };
        setNotifSettings(next);
        setTimeSheet(null);
        await updateNotificationSettings(next);
        if (kind === "streak") {
            await evaluateStreakReminder().catch((error) => console.error("Failed to update streak reminder:", error));
        } else {
            await evaluateDalailReminder().catch((error) => console.error("Failed to update dalail reminder:", error));
        }
    };

    const appearanceOptions: { value: AppearancePreference; label: string }[] = [
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
    ];

    const appearanceCard = (
        <View style={styles.appearanceCard}>
            <View>
                <Text style={styles.appearanceTitle}>Appearance</Text>
                <Text style={styles.appearanceDescription}>Choose how Durood Moments looks.</Text>
            </View>
            <View style={styles.appearanceOptions}>
                {appearanceOptions.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[styles.appearanceOption, preference === option.value && styles.appearanceOptionActive]}
                        onPress={() => void setPreference(option.value)}
                    >
                        <Text style={[styles.appearanceOptionText, preference === option.value && styles.appearanceOptionTextActive]}>
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const notificationsCard = (
        <View style={styles.appearanceCard}>
            <View>
                <Text style={styles.appearanceTitle}>Notifications</Text>
                <Text style={styles.appearanceDescription}>Daily reminders to protect your streak and your Dalail reading.</Text>
            </View>

            <View style={styles.notificationRow}>
                <View style={styles.notificationInfo}>
                    <Text style={styles.notificationLabel}>Streak reminder</Text>
                    <Text style={styles.notificationHint}>Reminds you to recite if you haven&apos;t yet today.</Text>
                </View>
                <Switch
                    value={notifSettings.streakEnabled}
                    onValueChange={(enabled) => void toggleReminder("streak", enabled)}
                    trackColor={{ false: activeTheme.colors.border.primary, true: activeTheme.colors.primary.main }}
                    thumbColor={activeTheme.colors.surface.elevated}
                />
            </View>
            {notifSettings.streakEnabled && (
                <TouchableOpacity style={styles.notificationTimeButton} onPress={() => openTimeSheet("streak")}>
                    <Ionicons name="time-outline" size={17} color={activeTheme.colors.primary.main} />
                    <Text style={styles.notificationTimeText}>{formatTime(notifSettings.streakHour, notifSettings.streakMinute)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={activeTheme.colors.text.tertiary} />
                </TouchableOpacity>
            )}

            <View style={styles.notificationRow}>
                <View style={styles.notificationInfo}>
                    <Text style={styles.notificationLabel}>Dalail reminder</Text>
                    <Text style={styles.notificationHint}>Reminds you to read your Dalail for the day.</Text>
                </View>
                <Switch
                    value={notifSettings.dalailEnabled}
                    onValueChange={(enabled) => void toggleReminder("dalail", enabled)}
                    trackColor={{ false: activeTheme.colors.border.primary, true: activeTheme.colors.primary.main }}
                    thumbColor={activeTheme.colors.surface.elevated}
                />
            </View>
            {notifSettings.dalailEnabled && (
                <TouchableOpacity style={styles.notificationTimeButton} onPress={() => openTimeSheet("dalail")}>
                    <Ionicons name="time-outline" size={17} color={activeTheme.colors.primary.main} />
                    <Text style={styles.notificationTimeText}>{formatTime(notifSettings.dalailHour, notifSettings.dalailMinute)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={activeTheme.colors.text.tertiary} />
                </TouchableOpacity>
            )}

            {(notificationMessage || Platform.OS === "web") ? (
                <Text style={styles.notificationFootnote}>
                    {notificationMessage || "Notifications are only available in the mobile app."}
                </Text>
            ) : null}
        </View>
    );

    const timeSheetModal = (
        <Modal
            visible={timeSheet !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setTimeSheet(null)}
        >
            <View style={styles.confirmOverlay}>
                <View style={styles.confirmCard}>
                    <Text style={styles.confirmTitle}>Reminder time</Text>
                    <Text style={styles.confirmMessage}>
                        {timeSheet === "streak"
                            ? "Fires once a day at this time if you haven't recited yet."
                            : "Fires daily at this time as a Dalail reading nudge."}
                    </Text>
                    <View style={styles.timeInputRow}>
                        <TextInput
                            style={styles.timeInput}
                            value={timeHour}
                            onChangeText={setTimeHour}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="HH"
                            placeholderTextColor={activeTheme.colors.text.tertiary}
                        />
                        <Text style={styles.timeSeparator}>:</Text>
                        <TextInput
                            style={styles.timeInput}
                            value={timeMinute}
                            onChangeText={setTimeMinute}
                            keyboardType="number-pad"
                            maxLength={2}
                            placeholder="MM"
                            placeholderTextColor={activeTheme.colors.text.tertiary}
                        />
                    </View>
                    <View style={styles.confirmActions}>
                        <TouchableOpacity
                            style={styles.confirmCancelButton}
                            onPress={() => setTimeSheet(null)}
                        >
                            <Text style={styles.confirmCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.timeSaveButton}
                            onPress={() => void handleSaveTime()}
                        >
                            <Text style={styles.timeSaveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const diagnosticModal = (
        <Modal visible={debugVisible} animationType="slide" onRequestClose={() => setDebugVisible(false)}>
            <SafeAreaView style={styles.debugContainer}>
                <View style={styles.debugHeader}>
                    <Text style={styles.debugTitle}>Tasbeeh Diagnostics</Text>
                    <TouchableOpacity onPress={() => setDebugVisible(false)}>
                        <Text style={styles.debugClose}>Close</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.debugActions}>
                    <TouchableOpacity style={styles.debugButton} onPress={refreshDebugLog}>
                        <Text style={styles.debugButtonText}>Refresh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.debugButton}
                        onPress={async () => {
                            await clearTasbeehDebugLog();
                            setDebugEntries([]);
                        }}
                    >
                        <Text style={styles.debugButtonText}>Clear</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.debugLog} contentContainerStyle={styles.debugLogContent}>
                    <Text selectable style={styles.debugText}>
                        {debugEntries.length > 0
                            ? debugEntries.map((entry) => `${entry.timestamp} ${entry.event}\n${JSON.stringify(entry.details)}\n`).join("\n")
                            : "No diagnostic entries recorded."}
                    </Text>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    const leaveCityConfirmModal = (
        <Modal
            visible={showLeaveCityConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLeaveCityConfirm(false)}
        >
            <View style={styles.confirmOverlay}>
                <View style={styles.confirmCard}>
                    <Text style={styles.confirmTitle}>Leave city leaderboard?</Text>
                    <Text style={styles.confirmMessage}>
                        Your city will be removed from your leaderboard profile. You can join again later.
                    </Text>
                    <View style={styles.confirmActions}>
                        <TouchableOpacity
                            style={styles.confirmCancelButton}
                            onPress={() => setShowLeaveCityConfirm(false)}
                            disabled={citySaving}
                        >
                            <Text style={styles.confirmCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmLeaveButton, citySaving && styles.disabledButton]}
                            onPress={async () => {
                                await handleRemoveCity();
                                setShowLeaveCityConfirm(false);
                            }}
                            disabled={citySaving}
                        >
                            <Text style={styles.confirmLeaveText}>{citySaving ? "Leaving..." : "Leave"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const signOutConfirmModal = (
        <Modal
            visible={showSignOutConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSignOutConfirm(false)}
        >
            <View style={styles.confirmOverlay}>
                <View style={styles.confirmCard}>
                    <Text style={styles.confirmTitle}>Sign out?</Text>
                    <Text style={styles.confirmMessage}>You can sign in again at any time to sync your progress.</Text>
                    <View style={styles.confirmActions}>
                        <TouchableOpacity
                            style={styles.confirmCancelButton}
                            onPress={() => setShowSignOutConfirm(false)}
                        >
                            <Text style={styles.confirmCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmLeaveButton, submitting && styles.disabledButton]}
                            onPress={async () => {
                                setSubmitting(true);
                                await executeLogout();
                                setSubmitting(false);
                                setShowSignOutConfirm(false);
                            }}
                            disabled={submitting}
                        >
                            <Text style={styles.confirmLeaveText}>{submitting ? "Signing out..." : "Sign out"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <ScrollView
                    contentContainerStyle={[styles.notAuthScrollContent, isDesktopWeb && styles.desktopProfileContent]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                <View style={styles.notAuthContainer}>
                        <TouchableOpacity onLongPress={openDebugLog} delayLongPress={1200}>
                            <Ionicons name="person-circle-outline" size={80} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                    <Text style={styles.notAuthTitle}>Not Signed In</Text>
                    <Text style={styles.notAuthText}>
                        Sign in to sync your progress across devices
                    </Text>
                    <TouchableOpacity
                        style={[styles.googleButton, submitting && styles.disabledButton]}
                        onPress={handleGoogleSignIn}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={theme.colors.semantic.white} />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={22} color={theme.colors.semantic.white} />
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    {appearanceCard}
                    {Platform.OS !== "web" ? notificationsCard : null}
                </View>
                </ScrollView>
                {diagnosticModal}
            {timeSheetModal}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
            contentContainerStyle={[styles.content, isDesktopWeb && styles.desktopProfileContent]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onLongPress={openDebugLog} delayLongPress={1200}>
                            <Ionicons name="person-circle" size={80} color={theme.colors.primary.main} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={theme.colors.semantic.white} />
                    <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                    {accountMessage ? <Text style={styles.accountMessage}>{accountMessage}</Text> : null}
                    <View style={styles.cityCard}>
                        <View style={styles.cityHeader}>
                            <View style={styles.cityTitleWrap}>
                                <Text style={styles.appearanceTitle}>City leaderboard</Text>
                                <Text style={styles.appearanceDescription}>
                                    Share your city to join its leaderboard. We save city and country only—not your coordinates.
                                </Text>
                            </View>
                            <Ionicons name="location-outline" size={21} color={activeTheme.colors.primary.main} />
                        </View>
                        {Platform.OS !== "web" ? (
                            <TouchableOpacity
                                style={[styles.locationButton, cityLoading && styles.disabledButton]}
                                onPress={handleUseCurrentCity}
                                disabled={cityLoading || citySaving}
                            >
                                {cityLoading ? (
                                    <ActivityIndicator size="small" color={activeTheme.colors.primary.main} />
                                ) : (
                                    <Ionicons name="navigate-outline" size={17} color={activeTheme.colors.primary.main} />
                                )}
                                <Text style={styles.locationButtonText}>{cityLoading ? "Finding your city..." : "Suggest my current city"}</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TextInput
                            style={styles.cityInput}
                            value={city}
                            onChangeText={setCity}
                            placeholder="City"
                            placeholderTextColor={activeTheme.colors.text.tertiary}
                            autoCapitalize="words"
                            maxLength={80}
                        />
                        <TextInput
                            style={styles.cityInput}
                            value={country}
                            onChangeText={setCountry}
                            placeholder="Country"
                            placeholderTextColor={activeTheme.colors.text.tertiary}
                            autoCapitalize="words"
                            maxLength={80}
                        />
                        {cityMessage ? <Text style={styles.cityMessage}>{cityMessage}</Text> : null}
                        <View style={styles.cityActions}>
                            <TouchableOpacity
                                style={[styles.citySaveButton, citySaving && styles.disabledButton]}
                                onPress={handleSaveCity}
                                disabled={citySaving || cityLoading}
                            >
                                <Text style={styles.citySaveText}>{citySaving ? "Saving..." : "Join / Update city"}</Text>
                            </TouchableOpacity>
                            {(city || country) && (
                                <TouchableOpacity
                                    style={styles.cityRemoveButton}
                                    onPress={() => setShowLeaveCityConfirm(true)}
                                    disabled={citySaving || cityLoading}
                                >
                                    <Text style={styles.cityRemoveText}>Leave</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.leaderboardLink}
                            onPress={() => router.push("/leaderboard")}
                        >
                            <Ionicons name="podium-outline" size={17} color={activeTheme.colors.primary.main} />
                            <Text style={styles.locationButtonText}>View city leaderboard</Text>
                            <Ionicons name="chevron-forward" size={16} color={activeTheme.colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>
                    {appearanceCard}
                    {Platform.OS !== "web" ? notificationsCard : null}
        </ScrollView>
            {diagnosticModal}
            {leaveCityConfirmModal}
            {signOutConfirmModal}
            {timeSheetModal}
        </SafeAreaView>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    debugContainer: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    debugHeader: {
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.primary,
    },
    debugTitle: {
        color: theme.colors.text.primary,
        fontSize: 20,
        fontWeight: "800",
    },
    debugClose: {
        color: theme.colors.primary.main,
        fontWeight: "700",
    },
    debugActions: {
        flexDirection: "row",
        gap: 12,
        padding: 16,
    },
    debugButton: {
        backgroundColor: theme.colors.surface.primary,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    debugButtonText: {
        color: theme.colors.text.primary,
        fontWeight: "700",
    },
    debugLog: {
        flex: 1,
        marginHorizontal: 16,
        backgroundColor: theme.colors.semantic.profileSurface,
        borderRadius: 8,
    },
    debugLogContent: {
        padding: 12,
    },
    debugText: {
        color: theme.colors.semantic.profileAccent,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 11,
        lineHeight: 16,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingVertical: 24,
        paddingBottom: 120,
    },
    desktopProfileContent: {
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
    },
    appearanceCard: {
        width: "100%",
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        gap: 14,
    },
    cityCard: {
        width: "100%",
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        gap: 12,
    },
    cityHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    cityTitleWrap: {
        flex: 1,
    },
    locationButton: {
        minHeight: 42,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 10,
        backgroundColor: theme.colors.accentSurface,
        borderWidth: 1,
        borderColor: theme.colors.accentBorder,
    },
    locationButtonText: {
        color: theme.colors.primary.main,
        fontSize: 13,
        fontWeight: "700",
    },
    cityInput: {
        minHeight: 46,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: theme.colors.surface.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        color: theme.colors.text.primary,
        fontSize: 15,
    },
    cityMessage: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        lineHeight: 18,
    },
    cityActions: {
        flexDirection: "row",
        gap: 8,
    },
    leaderboardLink: {
        minHeight: 40,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 4,
    },
    citySaveButton: {
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: theme.colors.primary.main,
    },
    citySaveText: {
        color: theme.colors.semantic.onSuccess,
        fontSize: 13,
        fontWeight: "800",
    },
    cityRemoveButton: {
        minHeight: 44,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: theme.colors.surface.secondary,
    },
    cityRemoveText: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        fontWeight: "700",
    },
    confirmOverlay: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: theme.colors.scrim.medium,
    },
    confirmCard: {
        width: "100%",
        maxWidth: 420,
        padding: 20,
        borderRadius: 18,
        backgroundColor: theme.colors.surface.elevated,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    confirmTitle: {
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: "800",
    },
    confirmMessage: {
        marginTop: 8,
        color: theme.colors.text.secondary,
        fontSize: 14,
        lineHeight: 21,
    },
    confirmActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 20,
    },
    confirmCancelButton: {
        minHeight: 42,
        paddingHorizontal: 16,
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: theme.colors.surface.secondary,
    },
    confirmCancelText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: "700",
    },
    confirmLeaveButton: {
        minHeight: 42,
        minWidth: 84,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: theme.colors.semantic.danger,
    },
    confirmLeaveText: {
        color: theme.colors.semantic.white,
        fontSize: 14,
        fontWeight: "800",
    },
    appearanceTitle: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: "800",
    },
    appearanceDescription: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        marginTop: 4,
    },
    appearanceOptions: {
        flexDirection: "row",
        gap: 8,
    },
    appearanceOption: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: theme.colors.surface.secondary,
    },
    appearanceOptionActive: {
        backgroundColor: theme.colors.primary.main,
    },
    appearanceOptionText: {
        color: theme.colors.text.secondary,
        fontSize: 13,
        fontWeight: "700",
    },
    appearanceOptionTextActive: {
        color: theme.colors.semantic.onSuccess,
    },
    notAuthContainer: {
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
    },
    notAuthScrollContent: {
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 24,
        paddingBottom: 120,
    },
    notAuthTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginTop: 16,
        marginBottom: 8,
    },
    notAuthText: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: "center",
        marginBottom: 32,
    },
    googleButton: {
        backgroundColor: theme.colors.primary.main,
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 54,
        width: "100%",
    },
    disabledButton: {
        opacity: 0.7,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.semantic.white,
    },
    header: {
        alignItems: "center",
        paddingTop: 40,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    name: {
        fontSize: 24,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    logoutButton: {
        marginTop: 40,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: theme.colors.semantic.danger,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.semantic.white,
    },
    accountMessage: {
        marginTop: 10,
        color: theme.colors.semantic.error,
        fontSize: 13,
        textAlign: "center",
    },
    notificationRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    notificationInfo: {
        flex: 1,
    },
    notificationLabel: {
        color: theme.colors.text.primary,
        fontSize: 15,
        fontWeight: "700",
    },
    notificationHint: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        lineHeight: 17,
        marginTop: 2,
    },
    notificationTimeButton: {
        minHeight: 42,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: theme.colors.accentSurface,
        borderWidth: 1,
        borderColor: theme.colors.accentBorder,
    },
    notificationTimeText: {
        color: theme.colors.primary.main,
        fontSize: 13,
        fontWeight: "800",
        fontVariant: ["tabular-nums"],
    },
    notificationFootnote: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        lineHeight: 18,
    },
    timeInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 16,
    },
    timeInput: {
        flex: 1,
        minHeight: 46,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: theme.colors.surface.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
        color: theme.colors.text.primary,
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
    },
    timeSeparator: {
        color: theme.colors.text.secondary,
        fontSize: 18,
        fontWeight: "700",
    },
    timeSaveButton: {
        minHeight: 42,
        minWidth: 84,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        backgroundColor: theme.colors.primary.main,
    },
    timeSaveText: {
        color: theme.colors.semantic.white,
        fontSize: 14,
        fontWeight: "800",
    },
});
}
