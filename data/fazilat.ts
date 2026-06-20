export type FazilatEntry = {
  id: number;
  title: string;
  text: string;
  source?: string;
  arabic?: string;
};

const ASSET_REPO_OWNER = "SahilHasnain";
const ASSET_REPO_NAME = "dalail-khairat-assets";
const ASSET_REPO_REF = "main";

export const FAZILAT_DATA_URL = `https://raw.githubusercontent.com/${ASSET_REPO_OWNER}/${ASSET_REPO_NAME}/${ASSET_REPO_REF}/fazilat.json`;

export const FAZILAT_CACHE_KEY = "fazilat_data";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getDailySeed(): number {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return hashString(key);
}

export function shuffleEntries<T>(entries: T[]): T[] {
  if (entries.length <= 1) return [...entries];
  const rng = seededRandom(getDailySeed());
  const arr = [...entries];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
