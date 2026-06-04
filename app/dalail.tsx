import { SimpleHeader } from "@/components/SimpleHeader";
import { theme } from "@/constants/theme";
import {
    DALAIL_TITLE,
    getDalailWeekSections,
    getTodayDalailSections,
    type DalailSection,
} from "@/data/dalail";
import { useDalailBookmarks } from "@/hooks/useDalailBookmarks";
import { useDalailProgress } from "@/hooks/useDalailProgress";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const HEADER_HEIGHT = 60;

function formatDate(value?: string) {
    if (!value) return "Not started yet";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function SectionCard({
    section,
    isToday,
    isComplete,
    onPress,
}: {
    section: DalailSection;
    isToday: boolean;
    isComplete: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={onPress} style={[styles.sectionCard, isToday && styles.todaySectionCard]}>
            <View style={styles.sectionIcon}>
                <Ionicons
                    name={isComplete ? "checkmark" : isToday ? "sparkles" : "book-outline"}
                    size={18}
                    color={isToday || isComplete ? "#10b981" : theme.colors.text.secondary}
                />
            </View>
            <View style={styles.sectionTextWrap}>
                <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {isToday && <Text style={styles.todayBadge}>Today</Text>}
                </View>
                <Text style={styles.sectionMeta}>{section.subtitle}</Text>
                <Text style={styles.sectionPageMeta}>Pages {section.startPage}-{section.endPage}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
        </Pressable>
    );
}

export default function DalailScreen() {
    const router = useRouter();
    const headerTranslateY = useSharedValue(0);
    const { tabBarHeight } = useTabBarVisibility();
    const { progress, isLoaded, isWirdCompleteToday } = useDalailProgress();
    const { bookmarks } = useDalailBookmarks();
    const todaySections = getTodayDalailSections();
    const todaySection = todaySections.find((section) => !isWirdCompleteToday(section.id)) ?? todaySections[0];
    const weekSections = getDalailWeekSections();
    const todayComplete = todaySections.every((section) => isWirdCompleteToday(section.id));
    const continueText = progress.lastReadAt ? `Continue from page ${progress.lastPage}` : "Start from beginning";
    const todayTitle = todaySections.length > 1 ? "Monday Cycle Wird" : todaySection.title;
    const todaySubtitle = todaySections.length > 1
        ? "Complete Day 8 and begin Day 1 for the Monday-to-Monday cycle."
        : todaySection.subtitle;

    useFocusEffect(
        useCallback(() => {
            headerTranslateY.value = 0;
        }, [headerTranslateY])
    );

    const openPage = (page: number) => {
        router.push(`/dalail-reader/${page}` as never);
    };

    if (!isLoaded) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <SimpleHeader translateY={headerTranslateY} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#10b981" size="large" />
                    <Text style={styles.mutedText}>Preparing Dalail...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: HEADER_HEIGHT + 8, paddingBottom: tabBarHeight + 48 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroCard}>
                    <Text style={styles.eyebrow}>Daily Salawat Wird</Text>
                    <Text style={styles.heroTitle}>{DALAIL_TITLE}</Text>
                    <Text style={styles.heroSubtitle}>
                        Read the familiar weekday portion of Dalailul Khairat with a calm, focused reader.
                    </Text>
                    <View style={styles.heroActions}>
                        <Pressable style={styles.primaryButton} onPress={() => openPage(todaySection.startPage)}>
                            <Ionicons name="book" size={18} color="#03140d" />
                            <Text style={styles.primaryButtonText}>{todayComplete ? "Read Again" : "Today"}</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryButton} onPress={() => openPage(progress.lastPage)}>
                            <Text style={styles.secondaryButtonText}>{progress.lastReadAt ? `Page ${progress.lastPage}` : continueText}</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.todayCard}>
                    <View style={styles.todayTextWrap}>
                        <View style={styles.todayHeaderRow}>
                            <View style={styles.todayLabelRow}>
                                <Ionicons name="calendar-outline" size={14} color="#10b981" />
                                <Text style={styles.cardLabel}>Today</Text>
                            </View>
                            <View style={[styles.statusPill, todayComplete && styles.completePill]}>
                                <Text style={[styles.statusPillText, todayComplete && styles.completePillText]}>
                                    {todayComplete ? "Complete" : "Pending"}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.todayTitle}>{todayTitle}</Text>
                        <Text style={styles.mutedText}>{todaySubtitle}</Text>
                        <View style={styles.pageChipRow}>
                            {todaySections.map((section) => (
                                <Pressable key={section.id} style={styles.pageChip} onPress={() => openPage(section.startPage)}>
                                    <Text style={styles.pageChipText}>Pages {section.startPage}-{section.endPage}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.cardTitle}>Weekly Cycle</Text>
                        <Text style={styles.mutedText}>Choose today’s wird or open any day. Last read {formatDate(progress.lastReadAt)}.</Text>
                    </View>
                    <View style={styles.sectionList}>
                        {weekSections.map((section) => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                isToday={todaySections.some((today) => today.id === section.id)}
                                isComplete={isWirdCompleteToday(section.id)}
                                onPress={() => openPage(section.startPage)}
                            />
                        ))}
                    </View>
                </View>

                {bookmarks.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Bookmarks</Text>
                        <View style={styles.bookmarkRow}>
                            {bookmarks.slice(0, 6).map((bookmark) => (
                                <Pressable key={bookmark.id} style={styles.bookmarkChip} onPress={() => openPage(bookmark.page)}>
                                    <Text style={styles.bookmarkText}>Page {bookmark.page}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
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
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    heroCard: {
        borderRadius: 28,
        padding: 24,
        backgroundColor: "rgba(16,185,129,0.1)",
        borderWidth: 1,
        borderColor: "rgba(16,185,129,0.22)",
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: theme.colors.text.secondary,
        marginBottom: 12,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    heroSubtitle: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors.text.secondary,
    },
    heroActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 22,
    },
    primaryButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 12,
        backgroundColor: "#10b981",
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: "900",
        color: "#03140d",
    },
    secondaryButton: {
        flex: 1.5,
        minHeight: 48,
        borderRadius: 16,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    todayCard: {
        borderRadius: 24,
        padding: 20,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
    },
    todayTextWrap: {
        gap: 6,
    },
    todayHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 4,
    },
    todayLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: "800",
        color: theme.colors.text.tertiary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    todayTitle: {
        fontSize: 24,
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    mutedText: {
        fontSize: 13,
        color: theme.colors.text.secondary,
    },
    pageChip: {
        alignSelf: "flex-start",
        marginTop: 6,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: "rgba(16,185,129,0.12)",
    },
    pageChipRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    pageChipText: {
        fontSize: 12,
        fontWeight: "900",
        color: "#10b981",
    },
    statusPill: {
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: "rgba(255,255,255,0.07)",
    },
    completePill: {
        backgroundColor: "rgba(16,185,129,0.16)",
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: "800",
        color: theme.colors.text.secondary,
    },
    completePillText: {
        color: "#10b981",
    },
    card: {
        borderRadius: 24,
        padding: 18,
        backgroundColor: theme.colors.surface.primary,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.06)",
    },
    sectionHeader: {
        gap: 4,
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: theme.colors.text.primary,
    },
    sectionList: {
        gap: 10,
    },
    sectionCard: {
        minHeight: 68,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    todaySectionCard: {
        backgroundColor: "rgba(16,185,129,0.1)",
        borderColor: "rgba(16,185,129,0.2)",
    },
    sectionIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    sectionTextWrap: {
        flex: 1,
    },
    sectionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 3,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: theme.colors.text.primary,
    },
    todayBadge: {
        overflow: "hidden",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: "rgba(16,185,129,0.16)",
        color: "#10b981",
        fontSize: 10,
        fontWeight: "900",
    },
    sectionMeta: {
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    sectionPageMeta: {
        marginTop: 3,
        fontSize: 11,
        color: theme.colors.text.tertiary,
        fontWeight: "700",
    },
    bookmarkRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 14,
    },
    bookmarkChip: {
        borderRadius: 999,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    bookmarkText: {
        fontSize: 12,
        fontWeight: "800",
        color: theme.colors.text.secondary,
    },
});
