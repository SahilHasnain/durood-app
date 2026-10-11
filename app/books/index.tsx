import { SimpleHeader } from "@/components/SimpleHeader";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { getBooks, type LibraryBook } from "@/services/booksDatabase";
import { getBooksProgress } from "@/services/booksProgress";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const HEADER_HEIGHT = 60;

export default function BooksScreen() {
    const db = useSQLiteContext();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === "web" && width >= 1200;
    const { theme } = useAppearance();
    const styles = createStyles(theme);
    const { tabBarHeight } = useTabBarVisibility();
    const headerTranslateY = useSharedValue(0);
    const [books, setBooks] = useState<LibraryBook[]>([]);
    const [progressByBook, setProgressByBook] = useState<Awaited<ReturnType<typeof getBooksProgress>>>({});
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBooks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [nextBooks, progress] = await Promise.all([getBooks(db), getBooksProgress()]);
            setBooks(nextBooks);
            setProgressByBook(progress);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load the library.");
        } finally {
            setLoading(false);
        }
    }, [db]);

    useFocusEffect(useCallback(() => {
        headerTranslateY.value = 0;
        void loadBooks();
    }, [headerTranslateY, loadBooks]));

    const filteredBooks = books.filter((book) =>
        `${book.title} ${book.subtitle ?? ""} ${book.author ?? ""} ${book.description ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <SimpleHeader translateY={headerTranslateY} />
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    isDesktop && styles.desktopContent,
                    { paddingTop: HEADER_HEIGHT + 20, paddingBottom: tabBarHeight + 48 },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.pageHeading}>
                    <View style={styles.eyebrowRow}>
                        <Ionicons name="library-outline" size={15} color={theme.colors.primary.main} />
                        <Text style={styles.eyebrow}>READ & REFLECT</Text>
                    </View>
                    <Text style={styles.title}>Books</Text>
                    <Text style={styles.description}>Explore stories and books for a moment of reflection.</Text>
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={19} color={theme.colors.text.tertiary} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Find a book"
                        placeholderTextColor={theme.colors.text.tertiary}
                        style={styles.searchInput}
                        returnKeyType="search"
                        accessibilityLabel="Search books"
                    />
                    {query.length > 0 && (
                        <Pressable onPress={() => setQuery("")} accessibilityLabel="Clear search">
                            <Ionicons name="close-circle" size={19} color={theme.colors.text.tertiary} />
                        </Pressable>
                    )}
                </View>

                {loading && (
                    <View style={styles.stateCard}>
                        <ActivityIndicator size="large" color={theme.colors.primary.main} />
                        <Text style={styles.mutedText}>Opening your library...</Text>
                    </View>
                )}
                {!loading && error && (
                    <View style={styles.stateCard}>
                        <Ionicons name="cloud-offline-outline" size={28} color={theme.colors.semantic.error} />
                        <Text style={styles.stateTitle}>Library unavailable</Text>
                        <Text style={styles.mutedText}>{error}</Text>
                        <Pressable style={styles.retryButton} onPress={() => void loadBooks()}>
                            <Text style={styles.retryButtonText}>Try again</Text>
                        </Pressable>
                    </View>
                )}
                {!loading && !error && filteredBooks.length === 0 && (
                    <View style={styles.stateCard}>
                        <Ionicons name="library-outline" size={30} color={theme.colors.text.tertiary} />
                        <Text style={styles.stateTitle}>{books.length ? "No books found" : "Your library is growing"}</Text>
                        <Text style={styles.mutedText}>{books.length ? "Try another title or author." : "New books will appear here when they are added."}</Text>
                    </View>
                )}

                {!loading && !error && filteredBooks.map((book) => {
                    const saved = progressByBook[String(book.id)];
                    return (
                        <Pressable
                            key={book.id}
                            onPress={() => router.push(`/books/${book.id}` as never)}
                            style={({ pressed }) => [styles.bookCard, pressed && styles.bookCardPressed]}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${book.title}, ${book.entryCount} entries`}
                        >
                            <View style={styles.coverWrap}>
                                <View style={styles.coverSpine} />
                                <Ionicons name="book" size={31} color={theme.colors.primary.main} />
                                <Text style={styles.coverLabel}>DUROOD{`\n`}MOMENTS</Text>
                            </View>
                            <View style={styles.bookInfo}>
                                <View style={styles.bookMetaRow}>
                                    <Text style={styles.bookCategory}>{book.contentType === "text" ? "BOOK" : book.contentType.toUpperCase()}</Text>
                                    <Text style={styles.bookLanguage}>{book.languageCode.toUpperCase()}</Text>
                                </View>
                                <Text style={styles.bookTitle}>{book.title}</Text>
                                {book.subtitle ? <Text style={styles.bookSubtitle}>{book.subtitle}</Text> : null}
                                <Text style={styles.bookDescription} numberOfLines={3}>{book.description}</Text>
                                <View style={styles.bookFooter}>
                                    <View style={styles.entryCount}>
                                        <Ionicons name="document-text-outline" size={15} color={theme.colors.primary.main} />
                                        <Text style={styles.entryCountText}>{book.entryCount} {book.entryCount === 1 ? "story" : "stories"}</Text>
                                    </View>
                                    {saved ? (
                                        <View style={styles.continueLabel}>
                                            <Text style={styles.continueLabelText}>Continue reading</Text>
                                            <Ionicons name="arrow-forward" size={15} color={theme.colors.primary.main} />
                                        </View>
                                    ) : (
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
                                    )}
                                </View>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background.primary },
        content: { flexGrow: 1, paddingHorizontal: 18, gap: 16 },
        desktopContent: { width: "100%", maxWidth: 1060, alignSelf: "center", paddingHorizontal: 32 },
        pageHeading: { gap: 7, marginBottom: 3 },
        eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
        eyebrow: { color: theme.colors.primary.main, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
        title: { color: theme.colors.text.primary, fontSize: 32, lineHeight: 38, fontWeight: "900" },
        description: { color: theme.colors.text.secondary, fontSize: 14, lineHeight: 21 },
        searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 15, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, color: theme.colors.text.primary, fontSize: 14 },
        bookCard: { flexDirection: "row", gap: 16, padding: 16, borderRadius: 22, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        bookCardPressed: { opacity: 0.82 },
        coverWrap: { width: 104, minHeight: 150, alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 15, overflow: "hidden", backgroundColor: theme.colors.accentSurface, borderWidth: 1, borderColor: theme.colors.accentBorder },
        coverSpine: { position: "absolute", left: 8, top: 0, bottom: 0, width: 2, backgroundColor: theme.colors.primary.main, opacity: 0.3 },
        coverLabel: { color: theme.colors.primary.main, fontSize: 8, lineHeight: 12, fontWeight: "900", letterSpacing: 0.8, textAlign: "center" },
        bookInfo: { flex: 1, minWidth: 0, justifyContent: "center", gap: 7 },
        bookMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        bookCategory: { color: theme.colors.primary.main, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
        bookLanguage: { color: theme.colors.text.tertiary, fontSize: 10, fontWeight: "800" },
        bookTitle: { color: theme.colors.text.primary, fontSize: 19, lineHeight: 24, fontWeight: "900" },
        bookSubtitle: { color: theme.colors.text.secondary, fontSize: 13, fontWeight: "600" },
        bookDescription: { color: theme.colors.text.secondary, fontSize: 12, lineHeight: 18 },
        bookFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
        entryCount: { flexDirection: "row", alignItems: "center", gap: 6 },
        entryCountText: { color: theme.colors.text.secondary, fontSize: 12, fontWeight: "700" },
        continueLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
        continueLabelText: { color: theme.colors.primary.main, fontSize: 12, fontWeight: "800" },
        stateCard: { minHeight: 170, alignItems: "center", justifyContent: "center", gap: 10, padding: 24, borderRadius: 20, backgroundColor: theme.colors.surface.primary, borderWidth: 1, borderColor: theme.colors.border.subtle },
        stateTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: "800", textAlign: "center" },
        mutedText: { color: theme.colors.text.secondary, fontSize: 13, lineHeight: 19, textAlign: "center" },
        retryButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11, backgroundColor: theme.colors.primary.main },
        retryButtonText: { color: theme.colors.semantic.onSuccess, fontSize: 13, fontWeight: "800" },
    });
}
