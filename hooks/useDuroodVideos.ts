import { config, databases } from "@/config/appwrite";
import { Durood } from "@/types";
import { Query } from "appwrite";
import { useCallback, useEffect, useState } from "react";

const VIDEOS_PER_PAGE = 20;

export function useDuroodVideos() {
  const [videos, setVideos] = useState<Durood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [channelIds, setChannelIds] = useState<string[]>([]);

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

  const fetchVideos = useCallback(async (channelIds: string[], currentOffset: number = 0) => {
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
        Query.limit(VIDEOS_PER_PAGE),
        Query.offset(currentOffset),
      ];

      const response = await databases.listDocuments(
        config.databaseId,
        config.videosCollectionId,
        queries
      );

      const fetchedVideos = response.documents as unknown as Durood[];
      setHasMore(fetchedVideos.length === VIDEOS_PER_PAGE);
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

  useEffect(() => {
    const initialize = async () => {
      const channelIds = await fetchChannels();
      const fetchedVideos = await fetchVideos(channelIds, 0);
      setVideos(fetchedVideos);
      setOffset(VIDEOS_PER_PAGE);
    };

    initialize();
  }, [fetchChannels, fetchVideos]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || channelIds.length === 0) return;

    const newVideos = await fetchVideos(channelIds, offset);
    setVideos((prev) => [...prev, ...newVideos]);
    setOffset((prev) => prev + VIDEOS_PER_PAGE);
  }, [loading, hasMore, channelIds, offset, fetchVideos]);

  const refresh = useCallback(async () => {
    const channelIds = await fetchChannels();
    const fetchedVideos = await fetchVideos(channelIds, 0);
    setVideos(fetchedVideos);
    setOffset(VIDEOS_PER_PAGE);
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
