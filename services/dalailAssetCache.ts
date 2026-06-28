import { File, Directory, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DALAIL_ASSET_MANIFEST, getDalailPageUrl } from "@/data/dalail";

const CACHE_INDEX_KEY = "dalail_cached_pages";
const CONCURRENCY = 3;

interface CacheIndex {
  version: string;
  pages: number[];
}

let cachingPromise: Promise<void> | null = null;

function getDalailDir(): Directory {
  return new Directory(Paths.document, "dalail");
}

function getLocalFile(page: number): File {
  const pageToken = String(page).padStart(3, "0");
  const filename = DALAIL_ASSET_MANIFEST.filePattern.replace("{page}", pageToken);
  return new File(getDalailDir(), filename);
}

async function getCacheIndex(): Promise<CacheIndex> {
  try {
    const json = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    if (json) {
      const parsed = JSON.parse(json);
      if (parsed.version === DALAIL_ASSET_MANIFEST.version) {
        return parsed;
      }
    }
  } catch {}
  return { version: DALAIL_ASSET_MANIFEST.version, pages: [] };
}

async function saveCacheIndex(index: CacheIndex): Promise<void> {
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
}

export async function isPageCached(page: number): Promise<boolean> {
  const index = await getCacheIndex();
  if (!index.pages.includes(page)) return false;
  return getLocalFile(page).exists;
}

export async function getLocalPageUri(page: number): Promise<string | null> {
  const cached = await isPageCached(page);
  if (!cached) return null;
  return getLocalFile(page).uri;
}

export async function cacheAllDalailAssets(): Promise<void> {
  if (cachingPromise) return cachingPromise;

  cachingPromise = (async () => {
    const dir = getDalailDir();
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }

    const index = await getCacheIndex();
    const totalPages = DALAIL_ASSET_MANIFEST.totalPages;

    const cached = new Set(index.pages);
    const missing: number[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (!cached.has(p)) missing.push(p);
    }

    if (missing.length === 0) return;

    const queue = [...missing];
    const newPages: number[] = [];

    async function worker(): Promise<void> {
      while (queue.length > 0) {
        const page = queue.shift()!;
        const file = getLocalFile(page);
        const url = getDalailPageUrl(page);
        try {
          await File.downloadFileAsync(url, file, { idempotent: true });
          newPages.push(page);
        } catch {}
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);

    index.pages = [...new Set([...index.pages, ...newPages])];
    await saveCacheIndex(index);
  })();

  await cachingPromise;
  cachingPromise = null;
}

export async function getCachedCount(): Promise<number> {
  const index = await getCacheIndex();
  return index.pages.length;
}
