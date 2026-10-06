import { FazilatCard } from "@/components/FazilatCard";
import { SimpleHeader } from "@/components/SimpleHeader";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { useAppearance } from "@/contexts/AppearanceContext";
import { FazilatEntry, FAZILAT_DATA_URL, FAZILAT_CACHE_KEY, shuffleEntries } from "@/data/fazilat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FazilatScreen() {
  const [entries, setEntries] = useState<FazilatEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const headerTranslateY = useSharedValue(0);

  const { tabBarHeight, showTabBar } = useTabBarVisibility();
  const { width } = useWindowDimensions();
  const { theme: activeTheme } = useAppearance();
  const styles = createStyles(activeTheme);
  const isDesktopWeb = Platform.OS === "web" && width >= 1200;
  const columnCount = isDesktopWeb ? 3 : Platform.OS === "web" && width >= 768 ? 2 : 1;

  const fetchEntries = useCallback(async () => {
    try {
      setEntriesLoading(true);
      const response = await fetch(FAZILAT_DATA_URL);
      if (!response.ok) throw new Error("Failed to fetch");
      const data: FazilatEntry[] = await response.json();
      setEntries(shuffleEntries(data));
      await AsyncStorage.setItem(FAZILAT_CACHE_KEY, JSON.stringify(data));
    } catch {
      const cached = await AsyncStorage.getItem(FAZILAT_CACHE_KEY);
      if (cached) {
        setEntries(shuffleEntries(JSON.parse(cached)));
      }
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      showTabBar();
      headerTranslateY.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
       fetchEntries();
    }, [headerTranslateY, showTabBar, fetchEntries]),
  );

  const renderEntry = useCallback(
      ({ item }: { item: FazilatEntry }) => (
        <View style={columnCount > 1 ? styles.gridItem : undefined}>
          <FazilatCard entry={item} grid={columnCount > 1} />
        </View>
      ),
      [columnCount],
  );

  const renderFazilatEmpty = () => {
    if (entriesLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={activeTheme.colors.primary.main} />
          <Text style={styles.emptyText}>Loading fazilat...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flower" size={48} color={activeTheme.colors.text.tertiary} />
        <Text style={styles.emptyText}>No fazilat available yet.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      <SimpleHeader translateY={headerTranslateY} />
      <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
           contentContainerStyle={styles.contentContainer}
           numColumns={columnCount}
           columnWrapperStyle={columnCount > 1 ? styles.columnWrapper : undefined}
           ListEmptyComponent={renderFazilatEmpty}
          ListFooterComponent={<View style={{ height: tabBarHeight + 40 }} />}
          refreshControl={
            <RefreshControl
              refreshing={entriesLoading && entries.length > 0}
              onRefresh={fetchEntries}
              colors={[activeTheme.colors.primary.main]}
              tintColor={activeTheme.colors.primary.main}
            />
          }
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
        />
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof import("@/constants/theme").createTheme>) {
return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 88,
    paddingBottom: 40,
    paddingHorizontal: 16,
    alignSelf: "center",
    width: "100%",
    maxWidth: 1200,
  },
  columnWrapper: {
    gap: 20,
  },
  gridItem: {
    flex: 1,
    minWidth: 0,
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: theme.colors.surface.elevated,
    shadowColor: theme.colors.semantic.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
  },
  segmentTextActive: {
    color: theme.colors.primary.main,
  },
  segmentIcon: {
    marginRight: 6,
  },
  emptyContainer: {
    height: SCREEN_HEIGHT - 300,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: "center",
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
}
