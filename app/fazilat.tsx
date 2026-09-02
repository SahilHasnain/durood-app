import { FazilatCard } from "@/components/FazilatCard";
import { SimpleHeader } from "@/components/SimpleHeader";
import { VideoCard } from "@/components/VideoCard";
import { theme } from "@/constants/theme";
import { useTabBarVisibility } from "@/contexts/TabBarVisibilityContext";
import { FazilatEntry, FAZILAT_DATA_URL, FAZILAT_CACHE_KEY, shuffleEntries } from "@/data/fazilat";
import { useDuroodVideos } from "@/hooks/useDuroodVideos";
import {
  getProgress,
  getRecentlyWatchedVideoIds,
} from "@/services/progressTracking";
import { Durood } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SCROLL_THRESHOLD = 5;
const HEADER_HEIGHT = 60;

type Segment = "fazilat" | "videos";

interface VideoProgress {
  percentage: number;
}

export default function FazilatScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>("fazilat");
  const [entries, setEntries] = useState<FazilatEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const headerTranslateY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const previousScrollY = useRef(0);
  const lastDirection = useRef<"up" | "down">("up");

  const { translateY: tabBarTranslateY, tabBarHeight, showTabBar } = useTabBarVisibility();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 1200;
  const columnCount = isDesktopWeb ? 3 : Platform.OS === "web" && width >= 768 ? 2 : 1;

  const { videos, loading, error, hasMore, loadMore, refresh } = useDuroodVideos();
  const [progressData, setProgressData] = useState<Record<string, VideoProgress>>({});

  React.useEffect(() => {
    const loadProgress = async () => {
      const progress: Record<string, VideoProgress> = {};
      const watchedVideoIds = new Set(await getRecentlyWatchedVideoIds());
      for (const video of videos) {
        const videoProgress = await getProgress(video.$id);
        if (videoProgress && videoProgress.progress > 0) {
          const percentage = Math.min(
            (videoProgress.progress / videoProgress.duration) * 100,
            100,
          );
          progress[video.$id] = { percentage };
        } else if (watchedVideoIds.has(video.$id)) {
          progress[video.$id] = { percentage: 100 };
        }
      }
      setProgressData(progress);
    };
    if (videos.length > 0) {
      loadProgress();
    }
  }, [videos]);

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
      previousScrollY.current = 0;
      lastDirection.current = "up";
      fetchEntries();
      refresh();
    }, [headerTranslateY, showTabBar, fetchEntries, refresh]),
  );

  const handleScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;

      if (currentScrollY <= 0) {
        headerTranslateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
        tabBarTranslateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
        previousScrollY.current = currentScrollY;
        lastDirection.current = "up";
        return;
      }

      const scrollDiff = currentScrollY - previousScrollY.current;
      if (Math.abs(scrollDiff) <= SCROLL_THRESHOLD) return;

      const direction = scrollDiff > 0 ? "down" : "up";
      if (direction !== lastDirection.current) {
        lastDirection.current = direction;

        headerTranslateY.value = withTiming(
          direction === "down" ? -(HEADER_HEIGHT + insets.top + 20) : 0,
          {
            duration: 300,
            easing:
              direction === "down"
                ? Easing.in(Easing.ease)
                : Easing.out(Easing.ease),
          },
        );

        tabBarTranslateY.value = withTiming(
          direction === "down" ? tabBarHeight + 50 : 0,
          {
            duration: 300,
            easing:
              direction === "down"
                ? Easing.in(Easing.ease)
                : Easing.out(Easing.ease),
          },
        );
      }

      previousScrollY.current = currentScrollY;
    },
    [headerTranslateY, insets.top, tabBarHeight, tabBarTranslateY],
  );

  const handleVideoPress = useCallback(
    (video: Durood) => {
      router.push({
        pathname: "/video",
        params: {
          videoId: video.videoId,
          title: video.title,
          duroodId: video.$id,
        },
      });
    },
    [router],
  );

  const renderVideo = useCallback(
    ({ item }: { item: Durood }) => {
      const prog = progressData[item.$id];
      const progressPercentage = prog ? prog.percentage : undefined;

      return (
        <View style={columnCount > 1 ? styles.gridItem : undefined}>
          <VideoCard
            video={item}
            onPress={() => handleVideoPress(item)}
            progressPercentage={progressPercentage}
          />
        </View>
      );
    },
    [columnCount, handleVideoPress, progressData],
  );

  const renderEntry = useCallback(
      ({ item }: { item: FazilatEntry }) => (
        <View style={columnCount > 1 ? styles.gridItem : undefined}>
          <FazilatCard entry={item} grid={columnCount > 1} />
        </View>
      ),
      [columnCount],
  );

  const renderVideoFooter = () => {
    if (!loading || videos.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.colors.primary.main} />
      </View>
    );
  };

  const renderVideoEmpty = () => {
    if (loading && videos.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.emptyText}>Loading videos...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.text.tertiary} />
          <Text style={styles.emptyText}>Unable to load videos. Check your connection.</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film" size={48} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyText}>No videos available yet. Check back soon!</Text>
      </View>
    );
  };

  const renderFazilatEmpty = () => {
    if (entriesLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.emptyText}>Loading fazilat...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="flower" size={48} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyText}>No fazilat available yet.</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.segmentContainer}>
      <View style={styles.segmentControl}>
        <Pressable
          style={[styles.segmentButton, segment === "fazilat" && styles.segmentActive]}
          onPress={() => setSegment("fazilat")}
        >
          <Text
            style={[styles.segmentText, segment === "fazilat" && styles.segmentTextActive]}
          >
            Fazilat
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, segment === "videos" && styles.segmentActive]}
          onPress={() => setSegment("videos")}
        >
          <Ionicons
            name="videocam"
            size={16}
            color={segment === "videos" ? theme.colors.primary.main : theme.colors.text.secondary}
            style={styles.segmentIcon}
          />
          <Text
            style={[styles.segmentText, segment === "videos" && styles.segmentTextActive]}
          >
            Videos
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      <SimpleHeader translateY={headerTranslateY} />
      {segment === "fazilat" ? (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
           contentContainerStyle={styles.contentContainer}
           numColumns={columnCount}
           columnWrapperStyle={columnCount > 1 ? styles.columnWrapper : undefined}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderFazilatEmpty}
          ListFooterComponent={<View style={{ height: tabBarHeight + 40 }} />}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={entriesLoading && entries.length > 0}
              onRefresh={fetchEntries}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
        />
      ) : (
          <FlatList
            data={videos}
            renderItem={renderVideo}
            keyExtractor={(item) => item.$id}
            showsVerticalScrollIndicator={false}
             contentContainerStyle={[styles.contentContainer, { paddingBottom: 120 }]}
             numColumns={columnCount}
             columnWrapperStyle={columnCount > 1 ? styles.columnWrapper : undefined}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderVideoEmpty}
          ListFooterComponent={renderVideoFooter}
          onEndReached={() => {
            if (hasMore && !loading) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loading && videos.length > 0}
              onRefresh={refresh}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
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
    shadowColor: "#000",
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
