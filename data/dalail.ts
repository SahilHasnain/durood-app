export type DalailSection = {
    id: string;
    title: string;
    subtitle: string;
    weekday?: number;
    cycleDay?: number;
    startPage: number;
    endPage: number;
};

export type DalailAssetManifest = {
    version: string;
    totalPages: number;
    baseUrl: string;
    filePattern: string;
    extension: string;
};

export const DALAIL_TITLE = "Dalailul Khairat";
export const DALAIL_FULL_TITLE = "Dalailul Khairat wa Shawariq al-Anwar";

const ASSET_REPO_OWNER = "SahilHasnain";
const ASSET_REPO_NAME = "dalail-khairat-assets";
const ASSET_REPO_REF = "main";

export const DALAIL_ASSET_MANIFEST: DalailAssetManifest = {
    version: "2026-06-04-v1",
    totalPages: 322,
    baseUrl: `https://cdn.jsdelivr.net/gh/${ASSET_REPO_OWNER}/${ASSET_REPO_NAME}@${ASSET_REPO_REF}/pages`,
    filePattern: "page-{page}.png",
    extension: "png",
};

export const DALAIL_SECTIONS: DalailSection[] = [
    {
        id: "opening",
        title: "Opening",
        subtitle: "Begin from the first page",
        startPage: 1,
        endPage: 86,
    },
    {
        id: "monday-1",
        title: "Monday Wird (Day 1)",
        subtitle: "Begin the cycle with today's portion",
        weekday: 1,
        cycleDay: 1,
        startPage: 87,
        endPage: 116,
    },
    {
        id: "tuesday",
        title: "Tuesday Wird (Day 2)",
        subtitle: "Continue the daily Dalail routine",
        weekday: 2,
        cycleDay: 2,
        startPage: 117,
        endPage: 144,
    },
    {
        id: "wednesday",
        title: "Wednesday Wird (Day 3)",
        subtitle: "Keep the weekly cycle steady",
        weekday: 3,
        cycleDay: 3,
        startPage: 145,
        endPage: 172,
    },
    {
        id: "thursday",
        title: "Thursday Wird (Day 4)",
        subtitle: "Read today's assigned wird",
        weekday: 4,
        cycleDay: 4,
        startPage: 173,
        endPage: 204,
    },
    {
        id: "friday",
        title: "Friday Wird (Day 5)",
        subtitle: "Salawat for the blessed day",
        weekday: 5,
        cycleDay: 5,
        startPage: 205,
        endPage: 236,
    },
    {
        id: "saturday",
        title: "Saturday Wird (Day 6)",
        subtitle: "Continue from the weekly cycle",
        weekday: 6,
        cycleDay: 6,
        startPage: 237,
        endPage: 267,
    },
    {
        id: "sunday",
        title: "Sunday Wird (Day 7)",
        subtitle: "Complete the cycle",
        weekday: 0,
        cycleDay: 7,
        startPage: 268,
        endPage: 304,
    },
    {
        id: "monday-8",
        title: "Monday Wird (Day 8 - Cycle End)",
        subtitle: "Return to the beginning",
        weekday: 1,
        cycleDay: 8,
        startPage: 305,
        endPage: 322,
    },
];

export function clampDalailPage(page: number) {
    return Math.min(Math.max(page, 1), DALAIL_ASSET_MANIFEST.totalPages);
}

export function getDalailPageUrl(page: number) {
    const safePage = clampDalailPage(page);
    const pageToken = String(safePage).padStart(3, "0");
    const filename = DALAIL_ASSET_MANIFEST.filePattern.replace("{page}", pageToken);
    return `${DALAIL_ASSET_MANIFEST.baseUrl.replace(/\/+$/, "")}/${filename}`;
}

export function getTodayDalailSection(date = new Date()) {
    return getTodayDalailSections(date)[0] ?? DALAIL_SECTIONS[1];
}

export function getTodayDalailSections(date = new Date()) {
    const weekday = date.getDay();
    const sections = DALAIL_SECTIONS.filter((section) => section.weekday === weekday);
    return sections.length > 0 ? sections : [DALAIL_SECTIONS[1]];
}

export function getDalailSectionForPage(page: number) {
    return DALAIL_SECTIONS.find(
        (section) => page >= section.startPage && page <= section.endPage
    ) ?? DALAIL_SECTIONS[0];
}

export function getDalailWeekSections() {
    return DALAIL_SECTIONS.filter((section) => typeof section.weekday === "number");
}
