import { theme } from "@/constants/theme";
import { useClerk, useSignIn, useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ContinueOAuth() {
    const clerk = useClerk();
    const { signIn } = useSignIn();
    const { signUp } = useSignUp();
    const hasRun = useRef(false);

    useEffect(() => {
        const finalize = async () => {
            if (!clerk.loaded || hasRun.current || !signIn || !signUp) {
                return;
            }

            hasRun.current = true;

            try {
                const oauthSignIn = signIn as any;
                const oauthSignUp = signUp as any;

                if (oauthSignIn.status === "complete") {
                    await oauthSignIn.finalize({
                        navigate: async () => {
                            router.replace("/home");
                        },
                    });
                    return;
                }

                if (oauthSignUp.status === "complete") {
                    await oauthSignUp.finalize({
                        navigate: async () => {
                            router.replace("/home");
                        },
                    });
                    return;
                }

                if (oauthSignUp.isTransferable) {
                    await oauthSignIn.create({ transfer: true });
                    if (oauthSignIn.status === "complete") {
                        await oauthSignIn.finalize({
                            navigate: async () => {
                                router.replace("/home");
                            },
                        });
                        return;
                    }
                }

                if (oauthSignIn.isTransferable) {
                    await oauthSignUp.create({ transfer: true });
                    if (oauthSignUp.status === "complete") {
                        await oauthSignUp.finalize({
                            navigate: async () => {
                                router.replace("/home");
                            },
                        });
                        return;
                    }
                }

                const existingSessionId =
                    oauthSignIn.existingSession?.sessionId ?? oauthSignUp.existingSession?.sessionId;

                if (existingSessionId) {
                    await clerk.setActive({
                        session: existingSessionId,
                        navigate: async () => {
                            router.replace("/home");
                        },
                    });
                    return;
                }

                console.log("OAuth continuation requires extra steps", {
                    signInStatus: oauthSignIn.status,
                    signUpStatus: oauthSignUp.status,
                    signUpMissingFields: oauthSignUp.missingFields,
                });
            } catch (error) {
                console.error("OAuth continuation failed:", error);
            }
        };

        void finalize();
    }, [clerk, signIn, signUp]);

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color={theme.colors.primary.main} />
                <Text style={styles.title}>Completing sign-in...</Text>
                <Text style={styles.subtitle}>
                    If this takes too long, go back and try again.
                </Text>
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
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    title: {
        marginTop: 20,
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.text.primary,
    },
    subtitle: {
        marginTop: 8,
        fontSize: 14,
        color: theme.colors.text.secondary,
        textAlign: "center",
    },
});
