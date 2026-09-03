import { OAuthProvider } from "appwrite";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { account, config } from "@/config/appwrite";

const getRedirectUri = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/auth/appwrite-callback`;
  }

  // Appwrite's native callback scheme is tied to the project ID. This URI
  // must be registered as the native client platform in Appwrite Console.
  return `appwrite-callback-${config.projectId}://`;
};

export async function signInWithAppwriteGoogle(): Promise<void> {
  const redirectUri = getRedirectUri();

  if (Platform.OS === "web") {
    account.createOAuth2Session({
      provider: OAuthProvider.Google,
      success: redirectUri,
      failure: redirectUri,
    });
    return;
  }

  // Native builds must use the token flow. createOAuth2Session relies on a
  // browser page redirect and is only appropriate for web.
  // The web SDK sees Expo's native global window and incorrectly tries to
  // assign window.location.href. Build the token endpoint URL explicitly.
  const oauthUrl = new URL(
    `${config.endpoint}/account/tokens/oauth2/${OAuthProvider.Google}`,
  );
  oauthUrl.searchParams.set("project", config.projectId);
  oauthUrl.searchParams.set("success", redirectUri);
  oauthUrl.searchParams.set("failure", redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(oauthUrl.toString(), redirectUri);
  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled.");
  }

  const callbackUrl = new URL(result.url);
  const error = callbackUrl.searchParams.get("error");
  if (error) {
    throw new Error(error);
  }
  const userId = callbackUrl.searchParams.get("userId");
  const secret = callbackUrl.searchParams.get("secret");

  if (!userId || !secret) {
    throw new Error("Appwrite OAuth callback did not contain a session.");
  }

  await account.createSession({ userId, secret });
}

export async function getAppwriteUser() {
  return account.get();
}

export async function signOutFromAppwrite(): Promise<void> {
  await account.deleteSession("current");
}

export const appwriteAuthConfig = {
  endpoint: config.endpoint,
  projectId: config.projectId,
};
