import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "dalail:progress";
const COMPLETED_STORAGE_KEY = "dalail:completed-wirds";

export type DalailProgress = {
    lastPage: number;
    lastReadAt?: string;
};

export type CompletedDalailWird = {
    sectionId: string;
    completedDate: string;
    completedAt: string;
};

const defaultProgress: DalailProgress = {
    lastPage: 1,
};

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function useDalailProgress() {
    const [progress, setProgress] = useState<DalailProgress>(defaultProgress);
    const [completedWirds, setCompletedWirds] = useState<CompletedDalailWird[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const loadProgress = useCallback(async () => {
        try {
            const [storedProgress, storedCompleted] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEY),
                AsyncStorage.getItem(COMPLETED_STORAGE_KEY),
            ]);

            if (storedProgress) {
                const parsed = JSON.parse(storedProgress) as DalailProgress;
                setProgress({
                    lastPage: typeof parsed.lastPage === "number" ? parsed.lastPage : 1,
                    lastReadAt: parsed.lastReadAt,
                });
            } else {
                setProgress(defaultProgress);
            }

            setCompletedWirds(storedCompleted ? JSON.parse(storedCompleted) as CompletedDalailWird[] : []);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        void loadProgress();
    }, [loadProgress]);

    useFocusEffect(
        useCallback(() => {
            void loadProgress();
        }, [loadProgress])
    );

    const saveProgress = useCallback(async (page: number) => {
        const nextProgress: DalailProgress = {
            lastPage: page,
            lastReadAt: new Date().toISOString(),
        };
        setProgress(nextProgress);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
    }, []);

    const markWirdComplete = useCallback(async (sectionId: string) => {
        const completedDate = getLocalDateKey();
        const nextCompleted = [
            ...completedWirds.filter(
                (item) => !(item.sectionId === sectionId && item.completedDate === completedDate)
            ),
            {
                sectionId,
                completedDate,
                completedAt: new Date().toISOString(),
            },
        ];
        setCompletedWirds(nextCompleted);
        await AsyncStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(nextCompleted));
    }, [completedWirds]);

    const isWirdCompleteToday = useCallback((sectionId: string) => {
        const completedDate = getLocalDateKey();
        return completedWirds.some(
            (item) => item.sectionId === sectionId && item.completedDate === completedDate
        );
    }, [completedWirds]);

    return {
        progress,
        completedWirds,
        isLoaded,
        saveProgress,
        markWirdComplete,
        isWirdCompleteToday,
    };
}
