import { Account, Client, Databases, Storage } from "appwrite";

const config = {
  endpoint: "https://fra.cloud.appwrite.io/v1",
  projectId: "6946f98a001db8a3ab3a",
  databaseId: "69d787ad002831c59b48",
  videosCollectionId: "69d787af0003b92d2963",
  channelsCollectionId: "69d787ba001af3838dc9",
  storageBucketId: "69d787c10015ff7916f7",
} as const;

const client = new Client();

client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);

export { config };

export default client;
