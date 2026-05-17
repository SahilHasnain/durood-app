import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore is not supported on the web
// https://github.com/expo/expo/issues/7744#issuecomment-611093485
const createTokenCache = () => {
  return {
    getToken: async (key: string) => {
      try {
        if (Platform.OS === "web") {
          return null;
        }
        const item = await SecureStore.getItemAsync(key);
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
        return SecureStore.setItemAsync(key, token);
      } catch (error) {
        console.error("Error saving token:", error);
      }
    },
  };
};

export const tokenCache = createTokenCache();
