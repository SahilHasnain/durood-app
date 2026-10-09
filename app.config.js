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
    return "Durood Moments (Dev)";
  }
  if (IS_PREVIEW) {
    return "Durood Moments (Preview)";
  }
  return "Durood Moments";
};

export default {
  expo: {
    name: getAppName(),
    slug: "durood-e-pak",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
      scheme: ["duroodapp", "appwrite-callback-6946f98a001db8a3ab3a"],
      userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A0A0F",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
    },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/android-launcher-icons/adaptive-foreground.png",
          backgroundColor: "#075B46",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
      versionCode: 16,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-navigation-bar",
        {
          enforceContrast: false,
          style: "dark",
        },
      ],
      "expo-sqlite",
      "expo-web-browser",
      "@react-native-google-signin/google-signin",
      [
        "expo-location",
        {
          locationWhenInUsePermission: "Allow Durood Moments to use your location once to suggest your city for the optional city leaderboard.",
        },
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0A0A0F",
          image: "./assets/images/icon.png",
          imageWidth: 200,
        },
      ],
      "./plugins/withAndroidLauncherIcons.js",
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
