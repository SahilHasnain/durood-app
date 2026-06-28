import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      if (!connected) {
        setWasOffline(true);
      } else if (wasOffline) {
        setJustCameOnline(true);
        setWasOffline(false);
        setTimeout(() => setJustCameOnline(false), 2000);
      }
      setIsOnline(connected);
    });

    return unsubscribe;
  }, [wasOffline]);

  const checkNow = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? true;
  };

  return { isOnline, justCameOnline, checkNow };
}
