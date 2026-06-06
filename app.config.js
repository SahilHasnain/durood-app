const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return "com.duroodepak.dev";
  }
  if (IS_PREVIEW) {
    return "com.duroodepak.preview";
  }
  return "com.duroodepak";
};

const getAppName = () => {
  if (IS_DEV) {
    return "Durood e Pak (Dev)";
  }
  if (IS_PREVIEW) {
    return "Durood e Pak (Preview)";
  }
  return "Durood e Pak";
};

export default {
  expo: {
    name: getAppName(),
    slug: "durood-e-pak",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "duroodapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A0A0F",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
      versionCode: 7,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0A0A0F",
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appwriteEndpoint: "https://fra.cloud.appwrite.io/v1",
      appwriteProjectId: "6946f98a001db8a3ab3a",
      appwriteDatabaseId: "69d787ad002831c59b48",
      appwriteVideosCollectionId: "69d787af0003b92d2963",
      appwriteChannelsCollectionId: "69d787ba001af3838dc9",
      appwriteStorageBucketId: "69d787c10015ff7916f7",
       "eas": {
        "projectId": "3c88a6d6-6eba-4672-a78d-d2c500ebe086"
      },
    },
  },
};
