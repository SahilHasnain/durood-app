import client, { config } from "@/config/appwrite";
import { nativeClient } from "@/services/appwriteAuth";
import { Databases as WebDatabases, Realtime as WebRealtime } from "appwrite";
import { Databases as NativeDatabases } from "react-native-appwrite";
import { Platform } from "react-native";

const GLOBAL_STATS_COLLECTION_ID = "global_stats";
const GLOBAL_STATS_DOCUMENT_ID = "authenticated_total";
const GLOBAL_STATS_CHANNEL = `databases.${config.databaseId}.collections.${GLOBAL_STATS_COLLECTION_ID}.documents.${GLOBAL_STATS_DOCUMENT_ID}`;
const NATIVE_POLL_INTERVAL_MS = 30_000;

function readTotal(document: Record<string, unknown>): number {
  const value = document.totalRecitations ?? (document.data as Record<string, unknown> | undefined)?.totalRecitations;
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function getGlobalRecitations(): Promise<number> {
  const document = Platform.OS === "web"
    ? await new WebDatabases(client).getDocument(
        config.databaseId,
        GLOBAL_STATS_COLLECTION_ID,
        GLOBAL_STATS_DOCUMENT_ID,
      )
    : await new NativeDatabases(nativeClient).getDocument(
        config.databaseId,
        GLOBAL_STATS_COLLECTION_ID,
        GLOBAL_STATS_DOCUMENT_ID,
      );
  return readTotal(document as unknown as Record<string, unknown>);
}

export async function subscribeToGlobalRecitations(
  onChange: (total: number) => void,
): Promise<() => Promise<void>> {
  onChange(await getGlobalRecitations());
  const subscription = Platform.OS === "web"
    ? await new WebRealtime(client).subscribe(GLOBAL_STATS_CHANNEL, (event) => {
        onChange(readTotal(event.payload as Record<string, unknown>));
      })
    : undefined;

  if (Platform.OS !== "web") {
    const poller = setInterval(() => {
      void getGlobalRecitations().then(onChange).catch(() => undefined);
    }, NATIVE_POLL_INTERVAL_MS);

    return async () => clearInterval(poller);
  }

  return async () => subscription?.close();
}
