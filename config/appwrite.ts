import { Client, Databases, Storage } from "appwrite";
import Constants from "expo-constants";

const frontendConfig = {
  endpoint: Constants.expoConfig?.extra?.appwriteEndpoint || "",
  projectId: Constants.expoConfig?.extra?.appwriteProjectId || "",
  databaseId: Constants.expoConfig?.extra?.appwriteDatabaseId || "",
  videosCollectionId: Constants.expoConfig?.extra?.appwriteVideosCollectionId || "",
  channelsCollectionId: Constants.expoConfig?.extra?.appwriteChannelsCollectionId || "",
  storageBucketId: Constants.expoConfig?.extra?.appwriteStorageBucketId || "",
} as const;

const client = new Client();

client
  .setEndpoint(frontendConfig.endpoint)
  .setProject(frontendConfig.projectId);

export const databases = new Databases(client);
export const storage = new Storage(client);

export const config = {
  endpoint: frontendConfig.endpoint,
  projectId: frontendConfig.projectId,
  databaseId: frontendConfig.databaseId,
  videosCollectionId: frontendConfig.videosCollectionId,
  channelsCollectionId: frontendConfig.channelsCollectionId,
  storageBucketId: frontendConfig.storageBucketId,
};

export default client;
