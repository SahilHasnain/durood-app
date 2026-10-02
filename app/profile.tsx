import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { clearTasbeehDebugLog, getTasbeehDebugLog, TasbeehDebugEntry } from "@/services/tasbeehDebug";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
    const { user, isAuthenticated, logout, signInWithGoogle } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [debugVisible, setDebugVisible] = useState(false);
    const [debugEntries, setDebugEntries] = useState<TasbeehDebugEntry[]>([]);
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === "web" && width >= 1200;

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
            Alert.alert("Sign Out Failed", "Could not sign out. Please try again.");
        }
    };

    const handleLogout = () => {
        // Alert button callbacks are not supported consistently by Expo Web.
        if (Platform.OS === "web") {
            void executeLogout();
            return;
        }

        Alert.alert("Sign Out", "Do you want to sign out of this account?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign Out",
                style: "destructive",
                onPress: executeLogout,
            },
        ]);
    };

    const openDebugLog = async () => {
        setDebugEntries(await getTasbeehDebugLog());
        setDebugVisible(true);
    };

    const refreshDebugLog = async () => {
        setDebugEntries(await getTasbeehDebugLog());
    };

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

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={[styles.notAuthContainer, isDesktopWeb && styles.desktopProfileContent]}>
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
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={22} color="#FFFFFF" />
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
                {diagnosticModal}
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={[styles.content, isDesktopWeb && styles.desktopProfileContent]}>
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
                    <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.logoutButtonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
            {diagnosticModal}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: "#111827",
        borderRadius: 8,
    },
    debugLogContent: {
        padding: 12,
    },
    debugText: {
        color: "#D1FAE5",
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 11,
        lineHeight: 16,
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
