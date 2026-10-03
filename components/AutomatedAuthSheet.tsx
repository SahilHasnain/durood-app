import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AutomatedAuthSheetProps = {
    visible: boolean;
    onDismiss: () => void;
    onSignIn: () => void;
};

export function AutomatedAuthSheet({ visible, onDismiss, onSignIn }: AutomatedAuthSheetProps) {
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 900;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
            <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
                <View style={[styles.sheet, isDesktop && styles.desktopSheet]}>
                    <View style={styles.topBar}>
                        <View style={styles.handle} />
                        <Pressable style={styles.closeButton} onPress={onDismiss} accessibilityLabel="Close sign in prompt">
                            <Ionicons name="close" size={22} color={theme.colors.text.secondary} />
                        </Pressable>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="cloud-upload-outline" size={32} color={theme.colors.primary.main} />
                        </View>
                        <Text style={styles.eyebrow}>Keep your journey</Text>
                        <Text style={styles.title}>Save your progress everywhere</Text>
                        <Text style={styles.description}>
                            Sign in once and your recitations, streaks, and goals stay with you on every device.
                        </Text>

                        <View style={styles.benefits}>
                            <Benefit icon="sync-outline" text="Sync your progress across devices" />
                            <Benefit icon="shield-checkmark-outline" text="Keep your personal journey safe" />
                            <Benefit icon="trending-up-outline" text="Continue from exactly where you stopped" />
                        </View>
                    </View>

                    <View style={styles.actions}>
                        <Pressable style={styles.primaryButton} onPress={onSignIn}>
                            <Ionicons name="logo-google" size={18} color={theme.colors.semantic.onSuccess} />
                            <Text style={styles.primaryButtonText}>Continue with Google</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryButton} onPress={onDismiss}>
                            <Text style={styles.secondaryButtonText}>Not now</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

function Benefit({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
    return (
        <View style={styles.benefitRow}>
            <Ionicons name={icon} size={20} color={theme.colors.primary.main} />
            <Text style={styles.benefitText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    sheet: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    desktopSheet: {
        width: "100%",
        maxWidth: 640,
        alignSelf: "center",
        paddingHorizontal: 40,
    },
    topBar: {
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    handle: {
        width: 42,
        height: 4,
        borderRadius: 4,
        backgroundColor: theme.colors.border.primary,
    },
    closeButton: {
        position: "absolute",
        right: 0,
        top: 6,
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        backgroundColor: theme.colors.background.secondary,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        paddingVertical: 24,
    },
    iconCircle: {
        width: 72,
        height: 72,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 36,
        backgroundColor: theme.colors.semantic.successSurface,
        marginBottom: 24,
    },
    eyebrow: {
        color: theme.colors.primary.main,
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 0.9,
        textTransform: "uppercase",
        marginBottom: 10,
    },
    title: {
        color: theme.colors.text.primary,
        fontSize: 32,
        lineHeight: 39,
        fontWeight: "900",
        maxWidth: 520,
    },
    description: {
        color: theme.colors.text.secondary,
        fontSize: 16,
        lineHeight: 25,
        marginTop: 14,
        maxWidth: 520,
    },
    benefits: {
        gap: 18,
        marginTop: 32,
    },
    benefitRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    benefitText: {
        flex: 1,
        color: theme.colors.text.primary,
        fontSize: 15,
        fontWeight: "700",
    },
    actions: {
        gap: 6,
    },
    primaryButton: {
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        borderRadius: 16,
        backgroundColor: theme.colors.primary.main,
    },
    primaryButtonText: {
        color: theme.colors.semantic.onSuccess,
        fontSize: 15,
        fontWeight: "900",
    },
    secondaryButton: {
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    secondaryButtonText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
        fontWeight: "800",
    },
});
