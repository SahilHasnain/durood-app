import { DALAIL_ASSET_MANIFEST, getDalailPageUrl } from "@/data/dalail";

export type ResolvedDalailPage = {
    kind: "remote" | "missing";
    source?: { uri: string };
    uri?: string;
    page: number;
    manifestVersion: string;
};

export async function resolveDalailPage(page: number): Promise<ResolvedDalailPage> {
    if (page < 1 || page > DALAIL_ASSET_MANIFEST.totalPages) {
        return {
            kind: "missing",
            page,
            manifestVersion: DALAIL_ASSET_MANIFEST.version,
        };
    }

    const uri = getDalailPageUrl(page);
    return {
        kind: "remote",
        source: { uri },
        uri,
        page,
        manifestVersion: DALAIL_ASSET_MANIFEST.version,
    };
}
