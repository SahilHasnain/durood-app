import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

type PlannerHeroCardBackupProps = {
    calculatedDailyTarget: string;
    completionPercent: number;
    finishDuration: string;
    finishLabel: string;
    paceGapLabel: string;
    paceGapPositive: boolean;
};

export function PlannerHeroCardBackup({
    calculatedDailyTarget,
    completionPercent,
    finishDuration,
    finishLabel,
    paceGapLabel,
    paceGapPositive,
}: PlannerHeroCardBackupProps) {
    return (
        <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Your Plan</Text>
            <Text style={styles.heroTitle}>{calculatedDailyTarget}/day</Text>
            <Text style={styles.heroSubtitle}>{finishLabel}</Text>

            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
            </View>
            <View style={styles.heroNumbersCard}>
                <View style={styles.heroNumberItem}>
                    <Text style={styles.heroNumberLabel}>Finish</Text>
                    <Text
                        style={styles.heroNumberValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {finishDuration}
                    </Text>
                </View>
                <View style={styles.heroNumberDivider} />
                <View style={styles.heroNumberItem}>
                    <Text style={styles.heroNumberLabel}>Pace Change</Text>
                    <Text
                        style={[styles.heroNumberValue, paceGapPositive ? styles.warningText : styles.goodText]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {paceGapLabel}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    heroCard: {
        borderRadius: 28,
        padding: 24,
        backgroundColor: "rgba(16,185,129,0.1)",
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.22)",
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.7,
        textTransform: "uppercase",
        color: theme.colors.text.secondary,
        marginBottom: 10,
    },
    heroTitle: {
        fontSize: 42,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    heroSubtitle: {
        marginTop: 6,
        fontSize: 15,
        color: theme.colors.text.secondary,
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        overflow: "hidden",
        marginTop: 24,
    },
    progressFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#10b981",
    },
    heroNumbersCard: {
        marginTop: 16,
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    heroNumberItem: {
        flex: 1,
        gap: 4,
    },
    heroNumberLabel: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: theme.colors.text.tertiary,
    },
    heroNumberValue: {
        fontSize: 18,
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    heroNumberDivider: {
        width: 1,
        height: 34,
        marginHorizontal: 12,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    goodText: {
        color: "#10b981",
    },
    warningText: {
        color: "#f59e0b",
    },
});
