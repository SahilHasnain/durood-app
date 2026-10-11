import { useAppearance } from "@/contexts/AppearanceContext";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { Suspense } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

function BooksLoadingState() {
    const { theme } = useAppearance();
    return (
        <View style={[styles.loadingState, { backgroundColor: theme.colors.background.primary }]}>
            <ActivityIndicator color={theme.colors.primary.main} size="large" />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Preparing your library...</Text>
        </View>
    );
}

export default function BooksLayout() {
    return (
        <Suspense fallback={<BooksLoadingState />}>
            <SQLiteProvider
                databaseName="durood_stories.sqlite"
                // Expo needs a statically-resolved asset ID for the bundled database.
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                assetSource={{ assetId: require("../../assets/db/durood_stories.sqlite") }}
                useSuspense
            >
                <Stack screenOptions={{ headerShown: false }} />
            </SQLiteProvider>
        </Suspense>
    );
}

const styles = StyleSheet.create({
    loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { fontSize: 14 },
});
