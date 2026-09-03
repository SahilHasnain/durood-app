import { theme } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
    const { isAuthenticated, loading, signInWithGoogle } = useAuth();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !loading) {
            router.replace("/home");
        }
    }, [isAuthenticated, loading]);

    const handleGoogleSignIn = useCallback(async () => {
        try {
            setSubmitting(true);

            await signInWithGoogle();
            router.replace("/home");
        } catch (err: any) {
            console.error("OAuth error:", err);
            Alert.alert(
                "Sign In Failed",
                err?.message || "Could not complete Google sign-in."
            );
        } finally {
            setSubmitting(false);
        }
    }, [signInWithGoogle]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary.main} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formWidth}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to Durood Time</Text>
                    <Text style={styles.subtitle}>
                        Sign in to sync your progress across devices
                    </Text>
                </View>

                <View style={styles.form}>
                    <TouchableOpacity
                        style={[styles.googleButton, submitting && styles.disabledButton]}
                        onPress={handleGoogleSignIn}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={24} color="#FFFFFF" />
                                <Text style={styles.googleButtonText}>Continue with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => router.replace("/home")}
                    >
                        <Text style={styles.skipText}>Continue without account</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.footer, styles.formWidth]}>
                    <Text style={styles.footerText}>
                        By continuing, you agree to our Terms of Service and Privacy Policy
                    </Text>
                </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    formWidth: {
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
    },
    header: {
        marginBottom: 48,
        alignItems: "center",
    },
    title: {
        fontSize: 32,
        fontWeight: "700",
        color: theme.colors.text.primary,
        marginBottom: 12,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: "center",
        paddingHorizontal: 20,
    },
    form: {
        gap: 24,
    },
    googleButton: {
        backgroundColor: theme.colors.primary.main,
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        minHeight: 56,
    },
    disabledButton: {
        opacity: 0.7,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border.primary,
    },
    dividerText: {
        fontSize: 14,
        color: theme.colors.text.tertiary,
    },
    skipButton: {
        padding: 16,
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    skipText: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.text.secondary,
    },
    footer: {
        marginTop: 32,
        paddingHorizontal: 20,
    },
    footerText: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
        textAlign: "center",
        lineHeight: 18,
    },
});
