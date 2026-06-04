import { resolveDalailPage, type ResolvedDalailPage } from "@/lib/dalail-page-resolver";
import { useEffect, useState } from "react";

type ResolvedDalailPageState = {
    asset: ResolvedDalailPage | null;
    isLoading: boolean;
};

export function useResolvedDalailPage(page: number) {
    const [state, setState] = useState<ResolvedDalailPageState>({
        asset: null,
        isLoading: true,
    });

    useEffect(() => {
        let cancelled = false;

        setState((previousState) => ({
            asset: previousState.asset?.page === page ? previousState.asset : null,
            isLoading: true,
        }));

        void resolveDalailPage(page).then((asset) => {
            if (!cancelled) {
                setState({ asset, isLoading: false });
            }
        });

        return () => {
            cancelled = true;
        };
    }, [page]);

    return state;
}
