import { config, databases } from "@/config/appwrite";
import { getRecentlyWatchedVideoIds } from "@/services/progressTracking";
import { Durood } from "@/types";
import { Query } from "appwrite";
import { useCallback, useRef, useState } from "react";

const VIDEOS_PER_PAGE = 20;
const FRESH_VIDEO_POOL_SIZE = 100;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildFreshVideoPool(videos: Durood[], recentlyWatchedIds: string[]): Durood[] {
  const watchedIdSet = new Set(recentlyWatchedIds);
  const unwatchedVideos = videos.filter((video) => !watchedIdSet.has(video.$id));
  const watchedVideos = videos.filter((video) => watchedIdSet.has(video.$id));

  return [...shuffleArray(unwatchedVideos), ...shuffleArray(watchedVideos)];
}

export function useDuroodVideos() {
  const [videos, setVideos] = useState<Durood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const freshPoolRef = useRef<Durood[]>([]);
  const poolOffsetRef = useRef(0);
  const orderedOffsetRef = useRef(FRESH_VIDEO_POOL_SIZE);

  const fetchChannels = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.channelsCollectionId,
        [Query.limit(100)]
      );

      const youtubeChannelIds = response.documents.map((doc) => doc.youtubeChannelId);
      console.log(`Found ${youtubeChannelIds.length} source(s) for videos`);
      setChannelIds(youtubeChannelIds);
      return youtubeChannelIds;
    } catch (err) {
      console.error("Error fetching sources:", err);
      return [];
    }
  }, []);

  const fetchVideos = useCallback(async (
    channelIds: string[],
    limit: number = VIDEOS_PER_PAGE,
    currentOffset: number = 0
  ) => {
    if (channelIds.length === 0) {
      console.log("No sources found");
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);

      const queries = [
        Query.equal("isShort", false),
        Query.equal("channelId", channelIds),
        Query.isNotNull("videoId"),
        Query.notEqual("videoId", ""),
        Query.orderDesc("uploadDate"),
        Query.limit(limit),
        Query.offset(currentOffset),
      ];

      const response = await databases.listDocuments(
        config.databaseId,
        config.videosCollectionId,
        queries
      );

      const fetchedVideos = response.documents as unknown as Durood[];
      setError(null);

      return fetchedVideos;
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch videos"));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || channelIds.length === 0) return;

    const nextPoolOffset = poolOffsetRef.current + VIDEOS_PER_PAGE;
    const pooledVideos = freshPoolRef.current.slice(poolOffsetRef.current, nextPoolOffset);

    if (pooledVideos.length > 0) {
      poolOffsetRef.current = nextPoolOffset;
      setVideos((prev) => [...prev, ...pooledVideos]);
      setHasMore(poolOffsetRef.current < freshPoolRef.current.length || freshPoolRef.current.length === FRESH_VIDEO_POOL_SIZE);
      return;
    }

    const olderVideos = await fetchVideos(channelIds, VIDEOS_PER_PAGE, orderedOffsetRef.current);
    orderedOffsetRef.current += olderVideos.length;
    setVideos((prev) => [...prev, ...olderVideos]);
    setHasMore(olderVideos.length === VIDEOS_PER_PAGE);
  }, [loading, hasMore, channelIds, fetchVideos]);

  const refresh = useCallback(async () => {
    const [channelIds, recentlyWatchedIds] = await Promise.all([
      fetchChannels(),
      getRecentlyWatchedVideoIds(),
    ]);
    const recentVideos = await fetchVideos(channelIds, FRESH_VIDEO_POOL_SIZE, 0);
    const freshPool = buildFreshVideoPool(recentVideos, recentlyWatchedIds);

    freshPoolRef.current = freshPool;
    poolOffsetRef.current = VIDEOS_PER_PAGE;
    orderedOffsetRef.current = FRESH_VIDEO_POOL_SIZE;

    setVideos(freshPool.slice(0, VIDEOS_PER_PAGE));
    setHasMore(freshPool.length > VIDEOS_PER_PAGE || recentVideos.length === FRESH_VIDEO_POOL_SIZE);
  }, [fetchChannels, fetchVideos]);

  return {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
