import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

export default function Profile() {
    const { user, isAuthenticated, logout } = useAuth();
    const { startSSOFlow } = useSSO();
    const [submitting, setSubmitting] = useState(false);
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === "web" && width >= 1200;

    const redirectUrl = useMemo(
        () =>
            AuthSession.makeRedirectUri({
                scheme: "duroodapp",
                path: "auth/continue",
            }),
        []
    );

    const handleGoogleSignIn = useCallback(async () => {
        try {
            setSubmitting(true);
            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: "oauth_google",
                redirectUrl,
            });
            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
            }
        } catch (err: any) {
            Alert.alert(
                "Sign In Failed",
                err?.message || "Could not complete Google sign-in."
            );
        } finally {
            setSubmitting(false);
        }
    }, [redirectUrl, startSSOFlow]);

    const handleLogout = () => {
        Alert.alert("Sign Out", "Do you want to sign out of this account?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: async () => {
                    try {
                        await logout();
                    } catch (error) {
                        console.error("Sign out failed:", error);
                        Alert.alert("Sign Out Failed", "Could not sign out. Please try again.");
                    }
                },
            },
        ]);
    };

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={[styles.notAuthContainer, isDesktopWeb && styles.desktopProfileContent]}>
                    <Ionicons name="person-circle-outline" size={80} color={theme.colors.text.tertiary} />
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
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={22} color="#FFFFFF" />
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={[styles.content, isDesktopWeb && styles.desktopProfileContent]}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person-circle" size={80} color={theme.colors.primary.main} />
                    </View>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.logoutButtonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    desktopProfileContent: {
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
    },
    notAuthContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
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
        color: "#FFFFFF",
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
        backgroundColor: "#dc2626",
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
