import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
    message: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    message,
    iconName = "alert-circle",
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <View style={styles.container}>
            <Ionicons name={iconName} size={64} color={theme.colors.text.secondary} />
            <Text style={styles.message}>{message}</Text>
            {actionLabel && onAction && (
                <Pressable style={styles.button} onPress={onAction}>
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    message: {
        marginTop: 16,
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: "center",
    },
    button: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: theme.colors.primary.main,
        borderRadius: 8,
    },
    buttonText: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: "600",
    },
});
