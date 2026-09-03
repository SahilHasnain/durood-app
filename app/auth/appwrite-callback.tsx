import { getAppwriteUser } from "@/services/appwriteAuth";
import { theme } from "@/constants/theme";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppwriteCallback() {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getAppwriteUser()
            .then(() => router.replace("/home"))
            .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "Could not complete Appwrite sign-in.");
            });
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator size="large" color={theme.colors.primary.main} />}
                <Text style={styles.title}>{error ? "Sign-in failed" : "Completing sign-in..."}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
    title: { color: theme.colors.text.primary, fontSize: 18, fontWeight: "700" },
    error: { color: "#f87171", textAlign: "center" },
});
