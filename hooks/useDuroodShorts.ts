import { config, databases } from "@/config/appwrite";
import { Durood } from "@/types";
import { Query } from "appwrite";
import { useCallback, useEffect, useRef, useState } from "react";

const SHORTS_SERVE_SIZE = 10;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface UseDuroodShortsOptions {
  seenShortIds?: string[];
}

export function useDuroodShorts(options: UseDuroodShortsOptions = {}) {
  const { seenShortIds = [] } = options;

  const [allShorts, setAllShorts] = useState<Durood[]>([]);
  const [displayShorts, setDisplayShorts] = useState<Durood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const initialSeenIdsRef = useRef<string[]>([]);
  const servedShortsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    initialSeenIdsRef.current = seenShortIds;
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        config.databaseId,
        config.channelsCollectionId,
        [Query.limit(100)]
      );

      const youtubeChannelIds = response.documents.map((doc) => doc.youtubeChannelId);
      console.log(`Found ${youtubeChannelIds.length} source(s):`, youtubeChannelIds);
      setChannelIds(youtubeChannelIds);
      return youtubeChannelIds;
    } catch (err) {
      console.error("Error fetching sources:", err);
      return [];
    }
  }, []);

  const fetchAllShorts = useCallback(async (channelIds: string[]) => {
    if (channelIds.length === 0) {
      console.log("No sources found");
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);

      let allFetchedShorts: Durood[] = [];
      let offset = 0;
      const batchSize = 100;
      let hasMoreBatches = true;

      while (hasMoreBatches) {
        const queries = [
          Query.equal("isShort", true),
          Query.equal("channelId", channelIds),
          Query.isNotNull("videoId"),
          Query.notEqual("videoId", ""),
          Query.limit(batchSize),
          Query.offset(offset),
        ];

        const response = await databases.listDocuments(
          config.databaseId,
          config.videosCollectionId,
          queries
        );

        const batch = response.documents as unknown as Durood[];
        allFetchedShorts = [...allFetchedShorts, ...batch];

        if (batch.length < batchSize) {
          hasMoreBatches = false;
        } else {
          offset += batchSize;
        }
      }

      console.log(`Total durood shorts fetched: ${allFetchedShorts.length}`);
      setAllShorts(allFetchedShorts);
      setError(null);

      return allFetchedShorts;
    } catch (err) {
      console.error("Error fetching shorts:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch shorts"));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const buildFeed = useCallback(
    (shorts: Durood[], useSeenIds: string[] = seenShortIds) => {
      if (shorts.length === 0) return [];

      const unseenShorts = shorts.filter(
        (s) => !useSeenIds.includes(s.$id) && !servedShortsRef.current.has(s.$id)
      );
      const seenShorts = shorts.filter(
        (s) => useSeenIds.includes(s.$id) && !servedShortsRef.current.has(s.$id)
      );

      const shuffledUnseen = shuffleArray(unseenShorts);
      const shuffledSeen = shuffleArray(seenShorts);

      let feed: Durood[] = [];

      if (shuffledUnseen.length > 0) {
        feed.push(...shuffledUnseen.slice(0, SHORTS_SERVE_SIZE));
      }

      const remaining = SHORTS_SERVE_SIZE - feed.length;
      if (remaining > 0 && shuffledSeen.length > 0) {
        feed.push(...shuffledSeen.slice(0, remaining));
      }

      feed.forEach((s) => servedShortsRef.current.add(s.$id));

      return shuffleArray(feed);
    },
    []
  );

  useEffect(() => {
    const initialize = async () => {
      const channelIds = await fetchChannels();
      const shorts = await fetchAllShorts(channelIds);
      const feed = buildFeed(shorts, initialSeenIdsRef.current);
      setDisplayShorts(feed);
      setHasMore(feed.length === SHORTS_SERVE_SIZE);
    };

    initialize();
  }, [fetchChannels, fetchAllShorts]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;

    const nextBatch = buildFeed(allShorts, initialSeenIdsRef.current);

    if (nextBatch.length === 0) {
      setHasMore(false);
      return;
    }

    setDisplayShorts((prev) => {
      const existingIds = new Set(prev.map((s) => s.$id));
      const uniqueNewShorts = nextBatch.filter((s) => !existingIds.has(s.$id));
      return [...prev, ...uniqueNewShorts];
    });
    setHasMore(nextBatch.length === SHORTS_SERVE_SIZE);
  }, [loading, hasMore, allShorts, buildFeed]);

  const refresh = useCallback(async () => {
    servedShortsRef.current.clear();

    const channelIds = await fetchChannels();
    const shorts = await fetchAllShorts(channelIds);
    const feed = buildFeed(shorts, seenShortIds);
    setDisplayShorts(feed);
    setHasMore(feed.length === SHORTS_SERVE_SIZE);
  }, [fetchChannels, fetchAllShorts, buildFeed, seenShortIds]);

  const getStats = useCallback(() => {
    const unseenCount = allShorts.filter((s) => !seenShortIds.includes(s.$id)).length;
    const seenCount = allShorts.filter((s) => seenShortIds.includes(s.$id)).length;

    return {
      total: allShorts.length,
      unseen: unseenCount,
      seen: seenCount,
      isExhausted: unseenCount < 5,
    };
  }, [allShorts, seenShortIds]);

  return {
    shorts: displayShorts,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    getStats,
  };
}
