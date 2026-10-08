import { SimpleHeader } from "@/components/SimpleHeader";
import { AutomatedAuthSheet } from "@/components/AutomatedAuthSheet";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { getCityLeaderboard, type CityLeaderboard, type CityLeaderboardEntry } from "@/services/cityLeaderboard";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function formatCount(count: number) {
    return new Intl.NumberFormat("en-IN").format(count);
}

export default function LeaderboardScreen() {
    const { isAuthenticated, signInWithGoogle } = useAuth();
    const router = useRouter();
    const { theme: activeTheme } = useAppearance();
    const styles = createStyles(activeTheme);
    const { tabBarHeight, showTabBar } = useTabBarVisibility();
    const headerTranslateY = useSharedValue(0);
    const [data, setData] = useState<CityLeaderboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);

    const handleSignIn = useCallback(async () => {
        setShowAuthPrompt(false);
        try {
            await signInWithGoogle();
        } catch (signInError) {
            console.error("Leaderboard sign-in failed:", signInError);
            Alert.alert(
                "Sign In Failed",
                signInError instanceof Error ? signInError.message : "Could not complete Google sign-in.",
            );
        }
    }, [signInWithGoogle]);

    const loadLeaderboard = useCallback(async () => {
        if (!isAuthenticated) {
            setData(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError("");
            setData(await getCityLeaderboard());
        } catch (loadError) {
            console.error("Failed to load city leaderboard:", loadError);
            setError("Could not load the city leaderboard. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useFocusEffect(useCallback(() => {
        showTabBar();
        void loadLeaderboard();
    }, [loadLeaderboard, showTabBar]));

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: 88, paddingBottom: tabBarHeight + 40 }]}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeaderboard} tintColor={activeTheme.colors.primary.main} colors={[activeTheme.colors.primary.main]} />}
            >
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}><Ionicons name="podium" size={24} color={activeTheme.colors.primary.main} /></View>
                    <Text style={styles.eyebrow}>Local community</Text>
                    <Text style={styles.title}>City leaderboard</Text>
                    <Text style={styles.description}>See how your city is building its Durood habit together.</Text>
                </View>

                {!isAuthenticated ? (
                    <View style={styles.stateCard}>
                        <Ionicons name="lock-closed-outline" size={28} color={activeTheme.colors.primary.main} />
                        <Text style={styles.stateTitle}>Sign in to join</Text>
                        <Text style={styles.stateText}>City leaderboard participation is available to signed-in users.</Text>
                        <Pressable style={styles.primaryButton} onPress={() => setShowAuthPrompt(true)}>
                            <Text style={styles.primaryButtonText}>Sign in</Text>
                        </Pressable>
                    </View>
                ) : loading && !data ? (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="large" color={activeTheme.colors.primary.main} />
                        <Text style={styles.stateText}>Loading your city leaderboard...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.stateCard}>
                        <Ionicons name="cloud-offline-outline" size={28} color={activeTheme.colors.text.secondary} />
                        <Text style={styles.stateText}>{error}</Text>
                        <Pressable style={styles.secondaryButton} onPress={() => void loadLeaderboard()}>
                            <Text style={styles.secondaryButtonText}>Try again</Text>
                        </Pressable>
                    </View>
                ) : !data?.optedIn || !data.city ? (
                    <View style={styles.stateCard}>
                        <Ionicons name="location-outline" size={30} color={activeTheme.colors.primary.main} />
                        <Text style={styles.stateTitle}>Choose your city</Text>
                        <Text style={styles.stateText}>Opt in from your Profile. We use city and country only, not your coordinates.</Text>
                        <Pressable style={styles.primaryButton} onPress={() => router.push("/profile")}>
                            <Text style={styles.primaryButtonText}>Set up city</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <View style={styles.cityCard}>
                            <View>
                                <Text style={styles.cityLabel}>YOUR CITY</Text>
                                <Text style={styles.cityName}>{data.city.cityName}</Text>
                                <Text style={styles.countryName}>{data.city.country}</Text>
                            </View>
                            <View style={styles.rankBadge}>
                                <Text style={styles.rankLabel}>YOUR RANK</Text>
                                <Text style={styles.rankValue}>#{data.yourRank ?? "—"}</Text>
                            </View>
                        </View>

                        <View style={styles.listCard}>
                            <View style={styles.listHeader}>
                                <Text style={styles.listTitle}>Lifetime recitations</Text>
                                <Text style={styles.listCount}>{data.entries.length} members</Text>
                            </View>
                            {data.entries.length === 0 ? (
                                <Text style={styles.stateText}>No leaderboard members yet. You can be the first.</Text>
                            ) : data.entries.map((entry) => (
                                <LeaderboardRow key={`${entry.rank}-${entry.displayName}`} entry={entry} styles={styles} theme={activeTheme} />
                            ))}
                            {data.entries.length >= 100 ? <Text style={styles.listFooter}>Showing the top 100 members in your city.</Text> : null}
                        </View>
                        <Pressable style={styles.manageLink} onPress={() => router.push("/profile")}>
                            <Text style={styles.manageLinkText}>Manage city participation</Text>
                            <Ionicons name="chevron-forward" size={16} color={activeTheme.colors.primary.main} />
                        </Pressable>
                    </>
                )}
            </ScrollView>
            <AutomatedAuthSheet
                visible={showAuthPrompt}
                onDismiss={() => setShowAuthPrompt(false)}
                onSignIn={handleSignIn}
            />
        </SafeAreaView>
    );
}

function LeaderboardRow({
    entry,
    styles,
    theme: activeTheme,
}: {
    entry: CityLeaderboardEntry;
    styles: ReturnType<typeof createStyles>;
    theme: ReturnType<typeof import("@/constants/theme").createTheme>;
}) {
    return (
        <View style={[styles.entryRow, entry.isYou && styles.entryRowYou]}>
            <View style={[styles.entryRank, entry.rank <= 3 && styles.entryRankTop]}>
                <Text style={[styles.entryRankText, entry.rank <= 3 && styles.entryRankTextTop]}>#{entry.rank}</Text>
            </View>
            <View style={styles.entryInfo}>
                <Text style={styles.entryName} numberOfLines={1}>{entry.displayName}{entry.isYou ? " · You" : ""}</Text>
                <Text style={styles.entrySubtext}>{entry.isYou ? "Your contribution" : "City member"}</Text>
            </View>
            <Text style={[styles.entryTotal, { color: activeTheme.colors.primary.main }]}>{formatCount(entry.lifetimeTotal)}</Text>
        </View>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background.primary },
        content: { paddingHorizontal: 16, gap: 16, width: "100%", maxWidth: 760, alignSelf: "center" },
        heroCard: { padding: 20, borderRadius: 22, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.primary },
        heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.accentSurface, marginBottom: 14 },
        eyebrow: { color: theme.colors.primary.main, fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
        title: { color: theme.colors.text.primary, fontSize: 25, fontWeight: "900", marginTop: 5 },
        description: { color: theme.colors.text.secondary, fontSize: 14, lineHeight: 21, marginTop: 7 },
        stateCard: { padding: 24, alignItems: "center", gap: 12, borderRadius: 20, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.primary },
        stateTitle: { color: theme.colors.text.primary, fontSize: 18, fontWeight: "800", textAlign: "center" },
        stateText: { color: theme.colors.text.secondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
        primaryButton: { minHeight: 44, minWidth: 140, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary.main, marginTop: 4 },
        primaryButtonText: { color: theme.colors.semantic.onSuccess, fontSize: 14, fontWeight: "800" },
        secondaryButton: { minHeight: 42, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.surface.secondary },
        secondaryButtonText: { color: theme.colors.text.primary, fontWeight: "700" },
        cityCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 20, borderRadius: 20, backgroundColor: theme.colors.semantic.successSurface, borderWidth: 1, borderColor: theme.colors.semantic.successBorderStrong },
        cityLabel: { color: theme.colors.text.tertiary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
        cityName: { color: theme.colors.text.primary, fontSize: 22, fontWeight: "900", marginTop: 4 },
        countryName: { color: theme.colors.text.secondary, fontSize: 13, marginTop: 2 },
        rankBadge: { minWidth: 92, alignItems: "center", paddingVertical: 11, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.colors.surface.primary },
        rankLabel: { color: theme.colors.text.tertiary, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
        rankValue: { color: theme.colors.primary.main, fontSize: 23, fontWeight: "900", marginTop: 3 },
        listCard: { padding: 14, borderRadius: 20, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.primary },
        listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 12 },
        listTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "800" },
        listCount: { color: theme.colors.text.tertiary, fontSize: 12, fontWeight: "600" },
        entryRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border.primary },
        entryRowYou: { backgroundColor: theme.colors.accentSurface, borderRadius: 12 },
        entryRank: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: theme.colors.surface.secondary },
        entryRankTop: { backgroundColor: theme.colors.accentSurface },
        entryRankText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: "800" },
        entryRankTextTop: { color: theme.colors.primary.main },
        entryInfo: { flex: 1, minWidth: 0 },
        entryName: { color: theme.colors.text.primary, fontSize: 14, fontWeight: "800" },
        entrySubtext: { color: theme.colors.text.tertiary, fontSize: 11, marginTop: 3 },
        entryTotal: { fontSize: 14, fontWeight: "900" },
        listFooter: { paddingTop: 12, color: theme.colors.text.tertiary, fontSize: 12, textAlign: "center" },
        manageLink: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
        manageLinkText: { color: theme.colors.primary.main, fontSize: 13, fontWeight: "700" },
    });
}
