import { SimpleHeader } from "@/components/SimpleHeader";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AdminUsersApiError, getAdminUserDetails, type AdminUserDetails } from "@/services/adminUsersApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function AdminUserDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ userId?: string }>();
    const userId = typeof params.userId === "string" ? decodeURIComponent(params.userId) : "";
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.labels.includes("admin") ?? false;
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 1200;
    const { theme } = useAppearance();
    const styles = createStyles(theme);
    const headerTranslateY = useSharedValue(0);
    const [details, setDetails] = useState<AdminUserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDetails = useCallback(async () => {
        if (!isAdmin) {
            setError("Your account does not have the admin role.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        try {
            setDetails(await getAdminUserDetails(userId));
        } catch (loadError) {
            const status = loadError instanceof AdminUsersApiError ? loadError.statusCode : 0;
            setError(status === 401 || status === 403
                ? "Your account does not have the admin role."
                : loadError instanceof Error ? loadError.message : "Could not load this account.");
        } finally {
            setLoading(false);
        }
    }, [isAdmin, userId]);

    useFocusEffect(useCallback(() => {
        headerTranslateY.value = 0;
        void loadDetails();
    }, [headerTranslateY, loadDetails]));

    const historyTotal = details?.history.reduce((total, day) => total + day.count, 0) ?? 0;
    const maximumDayCount = Math.max(1, ...(details?.history.map((day) => day.count) ?? [0]));

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.desktopContent, { paddingTop: 78 }]} showsVerticalScrollIndicator={false}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={17} color={theme.colors.primary.main} />
                    <Text style={styles.backText}>Users</Text>
                </Pressable>

                {loading && <View style={styles.stateCard}><ActivityIndicator size="large" color={theme.colors.primary.main} /><Text style={styles.mutedText}>Loading account...</Text></View>}
                {!loading && error && (
                    <View style={styles.stateCard}>
                        <Ionicons name="lock-closed-outline" size={28} color={theme.colors.semantic.error} />
                        <Text style={styles.stateTitle}>Unable to show user data</Text>
                        <Text style={styles.mutedText}>{error}</Text>
                        <Pressable onPress={() => void loadDetails()}><Text style={styles.retryText}>Try again</Text></Pressable>
                    </View>
                )}
                {!loading && !error && details && (
                    <>
                        <View style={styles.profileCard}>
                            <View style={styles.avatar}><Text style={styles.avatarText}>{(details.user.name.trim()[0] || details.user.email[0] || "U").toUpperCase()}</Text></View>
                            <View style={styles.profileCopy}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.name}>{details.user.name}</Text>
                                    <View style={[styles.statusBadge, details.user.status ? styles.statusEnabled : styles.statusDisabled]}>
                                        <Text style={[styles.statusText, details.user.status ? styles.statusEnabledText : styles.statusDisabledText]}>{details.user.status ? "Active" : "Disabled"}</Text>
                                    </View>
                                </View>
                                <Text style={styles.email}>{details.user.email || "No email address"}</Text>
                                <Text style={styles.meta}>Joined {formatDate(details.user.createdAt)}{details.user.emailVerified ? " · Email verified" : " · Email not verified"}</Text>
                                <Text style={styles.userId} selectable>User ID: {details.user.id}</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Tasbeeh overview</Text>
                        <View style={styles.statsGrid}>
                            <StatCard label="Lifetime total" value={details.goal.lifetimeTotal.toLocaleString()} icon="infinite-outline" styles={styles} theme={theme} />
                            <StatCard label="Current streak" value={`${details.goal.currentStreak} days`} icon="flame-outline" styles={styles} theme={theme} />
                            <StatCard label="Longest streak" value={`${details.goal.longestStreak} days`} icon="trophy-outline" styles={styles} theme={theme} />
                            <StatCard label="Daily target" value={details.goal.dailyTarget.toLocaleString()} icon="flag-outline" styles={styles} theme={theme} />
                        </View>

                        <View style={styles.historyHeading}>
                            <View style={styles.historyTitleWrap}>
                                <Text style={styles.sectionTitle}>Daily history</Text>
                                <Text style={styles.historySubtitle}>Most recent {details.history.length} recorded days</Text>
                            </View>
                            <Text style={styles.historyTotal}>{historyTotal.toLocaleString()} total</Text>
                        </View>

                        {details.history.length === 0 ? (
                            <View style={styles.emptyHistory}>
                                <Ionicons name="calendar-outline" size={25} color={theme.colors.text.tertiary} />
                                <Text style={styles.mutedText}>No daily progress records found.</Text>
                            </View>
                        ) : details.history.map((day) => (
                            <View key={day.date} style={styles.dayCard}>
                                <View style={styles.dayHeader}>
                                    <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                                    <Text style={styles.dayCount}>{day.count.toLocaleString()}</Text>
                                </View>
                                <View style={styles.barTrack}>
                                    <View style={[styles.barFill, { width: `${Math.max(day.count > 0 ? 4 : 0, (day.count / maximumDayCount) * 100)}%` }]} />
                                </View>
                                <View style={styles.dayFooter}>
                                    <Text style={styles.dayMeta}>Target {day.target.toLocaleString()}</Text>
                                    <Text style={styles.dayMeta}>{day.sessionsCount} {day.sessionsCount === 1 ? "session" : "sessions"}</Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function StatCard({
    label,
    value,
    icon,
    styles,
    theme,
}: {
    label: string;
    value: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    styles: ReturnType<typeof createStyles>;
    theme: ReturnType<typeof import("@/constants/theme").createTheme>;
}) {
    return (
        <View style={styles.statCard}>
            <View style={styles.statIcon}><Ionicons name={icon} size={16} color={theme.colors.primary.main} /></View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background.primary },
        content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 42, gap: 14 },
        desktopContent: { width: "100%", maxWidth: 860, alignSelf: "center", paddingHorizontal: 32 },
        backButton: { alignSelf: "flex-start", minHeight: 34, flexDirection: "row", alignItems: "center", gap: 3, paddingRight: 10 },
        backText: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "800" },
        profileCard: { flexDirection: "row", alignItems: "flex-start", gap: 13, padding: 16, borderRadius: 19, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        avatar: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: theme.colors.accentSurface },
        avatarText: { color: theme.colors.primary.main, fontSize: 19, fontWeight: "900" },
        profileCopy: { flex: 1, minWidth: 0, gap: 5 },
        nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        name: { flex: 1, color: theme.colors.text.primary, fontSize: 17, fontWeight: "900" },
        statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
        statusEnabled: { backgroundColor: theme.colors.semantic.successSurface },
        statusDisabled: { backgroundColor: theme.colors.surface.secondary },
        statusText: { fontSize: 9, fontWeight: "900" },
        statusEnabledText: { color: theme.colors.primary.main },
        statusDisabledText: { color: theme.colors.text.secondary },
        email: { color: theme.colors.text.secondary, fontSize: 13 },
        meta: { color: theme.colors.text.tertiary, fontSize: 10, lineHeight: 15 },
        userId: { color: theme.colors.text.tertiary, fontSize: 9, lineHeight: 13 },
        sectionTitle: { color: theme.colors.text.primary, fontSize: 17, fontWeight: "900" },
        statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
        statCard: { width: "48%", flexGrow: 1, minHeight: 100, gap: 6, padding: 13, borderRadius: 16, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        statIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: theme.colors.accentSurface },
        statValue: { color: theme.colors.text.primary, fontSize: 18, fontWeight: "900" },
        statLabel: { color: theme.colors.text.secondary, fontSize: 10, fontWeight: "700" },
        historyHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: 4 },
        historyTitleWrap: { gap: 3 },
        historySubtitle: { color: theme.colors.text.tertiary, fontSize: 10 },
        historyTotal: { color: theme.colors.primary.main, fontSize: 10, fontWeight: "800" },
        dayCard: { gap: 7, padding: 12, borderRadius: 14, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        dayDate: { color: theme.colors.text.primary, fontSize: 12, fontWeight: "800" },
        dayCount: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "900" },
        barTrack: { height: 5, overflow: "hidden", borderRadius: 4, backgroundColor: theme.colors.surface.secondary },
        barFill: { height: "100%", borderRadius: 4, backgroundColor: theme.colors.primary.main },
        dayFooter: { flexDirection: "row", justifyContent: "space-between" },
        dayMeta: { color: theme.colors.text.tertiary, fontSize: 9, fontWeight: "600" },
        emptyHistory: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        stateCard: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10, padding: 24, borderRadius: 18, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        stateTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "800", textAlign: "center" },
        mutedText: { color: theme.colors.text.secondary, fontSize: 12, lineHeight: 18, textAlign: "center" },
        retryText: { color: theme.colors.primary.main, fontSize: 12, fontWeight: "800" },
    });
}
