import { SimpleHeader } from "@/components/SimpleHeader";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { AdminUsersApiError, listAdminUsers, type AdminUserSummary } from "@/services/adminUsersApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const HEADER_HEIGHT = 60;
const PAGE_SIZE = 25;

export default function AdminUsersScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.labels.includes("admin") ?? false;
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 1200;
    const { theme } = useAppearance();
    const styles = createStyles(theme);
    const headerTranslateY = useSharedValue(0);
    const [users, setUsers] = useState<AdminUserSummary[]>([]);
    const [queryInput, setQueryInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const loadUsers = useCallback(async (reset: boolean, search = appliedSearch) => {
        if (!isAdmin) return;
        if (reset) setLoading(true);
        else setLoadingMore(true);
        setError("");
        try {
            const page = await listAdminUsers({
                limit: PAGE_SIZE,
                offset: reset ? 0 : users.length,
                search,
            });
            setUsers((previous) => reset ? page.users : [...previous, ...page.users]);
            setTotal(page.total);
        } catch (loadError) {
            const status = loadError instanceof AdminUsersApiError ? loadError.statusCode : 0;
            setError(status === 401 || status === 403
                ? "Your account does not have the admin role."
                : loadError instanceof Error ? loadError.message : "Could not load user accounts.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [appliedSearch, isAdmin, users.length]);

    useFocusEffect(useCallback(() => {
        headerTranslateY.value = 0;
        if (isAdmin) void loadUsers(true, appliedSearch);
    }, [appliedSearch, headerTranslateY, isAdmin, loadUsers]));

    const runSearch = () => {
        const nextSearch = queryInput.trim();
        setAppliedSearch(nextSearch);
        void loadUsers(true, nextSearch);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView
                contentContainerStyle={[styles.content, isDesktop && styles.desktopContent, { paddingTop: HEADER_HEIGHT + 18 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={17} color={theme.colors.primary.main} />
                    <Text style={styles.backText}>Profile</Text>
                </Pressable>
                <View style={styles.heading}>
                    <View style={styles.titleRow}>
                        <View style={styles.adminIcon}><Ionicons name="shield-checkmark" size={20} color={theme.colors.primary.main} /></View>
                        <View style={styles.titleCopy}>
                            <Text style={styles.eyebrow}>ADMINISTRATION</Text>
                            <Text style={styles.title}>Users</Text>
                        </View>
                    </View>
                    <Text style={styles.subtitle}>Accounts and tasbeeh progress. Data is read-only.</Text>
                </View>

                {!isAdmin && (
                    <View style={styles.stateCard}>
                        <Ionicons name="lock-closed-outline" size={28} color={theme.colors.semantic.error} />
                        <Text style={styles.stateTitle}>Admin role required</Text>
                        <Text style={styles.mutedText}>This area is restricted to accounts with the Appwrite admin label.</Text>
                    </View>
                )}

                {isAdmin && (
                    <>
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryValue}>{total.toLocaleString()}</Text>
                                <Text style={styles.summaryLabel}>Registered accounts</Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryValue}>{users.filter((item) => item.todayCount > 0).length.toLocaleString()}</Text>
                                <Text style={styles.summaryLabel}>Active today · current page</Text>
                            </View>
                        </View>
                        <View style={styles.searchRow}>
                            <View style={styles.searchBox}>
                                <Ionicons name="search-outline" size={18} color={theme.colors.text.tertiary} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={queryInput}
                                    onChangeText={setQueryInput}
                                    onSubmitEditing={runSearch}
                                    placeholder="Search name or email"
                                    placeholderTextColor={theme.colors.text.tertiary}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    returnKeyType="search"
                                    accessibilityLabel="Search users by name or email"
                                />
                            </View>
                            <Pressable style={styles.searchButton} onPress={runSearch}>
                                <Text style={styles.searchButtonText}>Search</Text>
                            </Pressable>
                        </View>

                        {loading && users.length === 0 && (
                            <View style={styles.stateCard}><ActivityIndicator size="large" color={theme.colors.primary.main} /><Text style={styles.mutedText}>Loading accounts...</Text></View>
                        )}
                        {error ? (
                            <View style={styles.errorCard}>
                                <Ionicons name="alert-circle-outline" size={22} color={theme.colors.semantic.error} />
                                <Text style={styles.errorText}>{error}</Text>
                                <Pressable onPress={() => void loadUsers(true)}><Text style={styles.retryText}>Retry</Text></Pressable>
                            </View>
                        ) : null}
                        {!loading && !error && users.length === 0 && (
                            <View style={styles.stateCard}>
                                <Ionicons name="people-outline" size={28} color={theme.colors.text.tertiary} />
                                <Text style={styles.stateTitle}>No users found</Text>
                                <Text style={styles.mutedText}>{appliedSearch ? "Try a different name or email." : "There are no registered accounts yet."}</Text>
                            </View>
                        )}

                        <View style={styles.userList}>
                            {users.map((item) => (
                                <Pressable key={item.id} style={({ pressed }) => [styles.userCard, pressed && styles.userCardPressed]} onPress={() => router.push(`/admin-users/${encodeURIComponent(item.id)}` as never)}>
                                    <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name.trim()[0] || item.email[0] || "U").toUpperCase()}</Text></View>
                                    <View style={styles.userInfo}>
                                        <View style={styles.userTitleRow}>
                                            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                                            <View style={[styles.statusDot, item.status ? styles.statusEnabled : styles.statusDisabled]} />
                                        </View>
                                        <Text style={styles.userEmail} numberOfLines={1}>{item.email || "No email"}</Text>
                                        <View style={styles.statLine}>
                                            <Text style={styles.statText}>{item.lifetimeTotal.toLocaleString()} recitations</Text>
                                            <Text style={styles.statDivider}>·</Text>
                                            <Text style={styles.statText}>{item.currentStreak} day streak</Text>
                                            <Text style={styles.statDivider}>·</Text>
                                            <Text style={styles.statText}>{item.todayCount.toLocaleString()} today</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={17} color={theme.colors.text.tertiary} />
                                </Pressable>
                            ))}
                        </View>

                        {users.length < total && (
                            <Pressable style={styles.loadMoreButton} onPress={() => void loadUsers(false)} disabled={loadingMore}>
                                {loadingMore ? <ActivityIndicator size="small" color={theme.colors.primary.main} /> : <Text style={styles.loadMoreText}>Load more accounts</Text>}
                            </Pressable>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background.primary },
        content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 42, gap: 15 },
        desktopContent: { width: "100%", maxWidth: 900, alignSelf: "center", paddingHorizontal: 32 },
        backButton: { alignSelf: "flex-start", minHeight: 34, flexDirection: "row", alignItems: "center", gap: 3, paddingRight: 10 },
        backText: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "800" },
        heading: { gap: 8, marginBottom: 3 },
        titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
        adminIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.colors.accentSurface },
        titleCopy: { gap: 2 },
        eyebrow: { color: theme.colors.primary.main, fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
        title: { color: theme.colors.text.primary, fontSize: 28, lineHeight: 34, fontWeight: "900" },
        subtitle: { color: theme.colors.text.secondary, fontSize: 13, lineHeight: 19 },
        summaryRow: { flexDirection: "row", gap: 10 },
        summaryCard: { flex: 1, gap: 5, padding: 14, borderRadius: 16, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        summaryValue: { color: theme.colors.text.primary, fontSize: 20, fontWeight: "900" },
        summaryLabel: { color: theme.colors.text.secondary, fontSize: 10, lineHeight: 14 },
        searchRow: { flexDirection: "row", gap: 8 },
        searchBox: { flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 13, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        searchInput: { flex: 1, minWidth: 0, paddingVertical: 9, color: theme.colors.text.primary, fontSize: 13 },
        searchButton: { minWidth: 74, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderRadius: 13, backgroundColor: theme.colors.primary.main },
        searchButtonText: { color: theme.colors.semantic.onSuccess, fontSize: 12, fontWeight: "800" },
        userList: { gap: 9 },
        userCard: { minHeight: 80, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 16, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        userCardPressed: { opacity: 0.8 },
        avatar: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.colors.accentSurface },
        avatarText: { color: theme.colors.primary.main, fontSize: 16, fontWeight: "900" },
        userInfo: { flex: 1, minWidth: 0, gap: 3 },
        userTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        userName: { flex: 1, color: theme.colors.text.primary, fontSize: 13, fontWeight: "800" },
        statusDot: { width: 7, height: 7, borderRadius: 4 },
        statusEnabled: { backgroundColor: theme.colors.semantic.success },
        statusDisabled: { backgroundColor: theme.colors.semantic.error },
        userEmail: { color: theme.colors.text.secondary, fontSize: 11 },
        statLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 2 },
        statText: { color: theme.colors.text.tertiary, fontSize: 9, fontWeight: "700" },
        statDivider: { color: theme.colors.text.tertiary, fontSize: 9 },
        loadMoreButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: theme.colors.accentSurface, borderWidth: 1, borderColor: theme.colors.accentBorder },
        loadMoreText: { color: theme.colors.primary.main, fontSize: 12, fontWeight: "800" },
        stateCard: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 10, padding: 24, borderRadius: 19, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        stateTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "800", textAlign: "center" },
        mutedText: { color: theme.colors.text.secondary, fontSize: 12, lineHeight: 18, textAlign: "center" },
        errorCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 13, borderRadius: 14, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        errorText: { flex: 1, color: theme.colors.semantic.error, fontSize: 12, lineHeight: 18 },
        retryText: { color: theme.colors.primary.main, fontSize: 12, fontWeight: "800" },
    });
}
