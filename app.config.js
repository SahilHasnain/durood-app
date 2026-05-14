export default {
  expo: {
    name: "Durood e Pak",
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
      bundleIdentifier: "com.duroodepak",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.duroodepak",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
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
    },
  },
};
