import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const memoryCache = new Map<string, string>();

const createTokenCache = () => {
  return {
    getToken: async (key: string) => {
      try {
        if (Platform.OS === "web") {
          return null;
        }
        const cached = memoryCache.get(key);
        if (cached !== undefined) {
          return cached;
        }
        const item = await SecureStore.getItemAsync(key);
        if (item !== null) {
          memoryCache.set(key, item);
        }
        return item;
      } catch (error) {
        console.error("Error getting token:", error);
        return null;
      }
    },
    saveToken: async (key: string, token: string) => {
      try {
        if (Platform.OS === "web") {
          return;
        }
        memoryCache.set(key, token);
        return SecureStore.setItemAsync(key, token);
      } catch (error) {
        console.error("Error saving token:", error);
      }
    },
  };
};

export const tokenCache = createTokenCache();
