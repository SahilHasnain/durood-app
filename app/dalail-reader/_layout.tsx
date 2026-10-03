import { theme } from "@/constants/theme";
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router";
import { Suspense } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

function DatabaseLoadingState() {
    return (
        <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.primary.main} size="large" />
            <Text style={styles.loadingText}>Preparing the Dalail reader...</Text>
        </View>
    );
}

export default function DalailReaderLayout() {
    return (
        <Suspense fallback={<DatabaseLoadingState />}>
            <SQLiteProvider
                databaseName="dalail_al_khayrat.sqlite"
                assetSource={{ assetId: require("../../assets/db/dalail_al_khayrat.sqlite") }}
                useSuspense
            >
                <Stack screenOptions={{ headerShown: false }} />
            </SQLiteProvider>
        </Suspense>
    );
}

const styles = StyleSheet.create({
    loadingState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: theme.colors.background.primary,
    },
    loadingText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
    },
});
