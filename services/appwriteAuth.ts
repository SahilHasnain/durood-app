import { OAuthProvider } from "appwrite";
import { Account as NativeAccount, Client as NativeClient, IdTokenProvider } from "react-native-appwrite";
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { account, config } from "@/config/appwrite";

export const nativeClient = new NativeClient()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);
const nativeAccount = new NativeAccount(nativeClient);
const GOOGLE_WEB_CLIENT_ID = "54913434337-226cbfet04pjn52fbgqulf6s83c2pggt.apps.googleusercontent.com";

const authAccount = Platform.OS === "web" ? account : nativeAccount;

const getRedirectUri = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/auth/appwrite-callback`;
  }

  // Appwrite's native callback scheme is tied to the project ID. This URI
  // must be registered as the native client platform in Appwrite Console.
  return `appwrite-callback-${config.projectId}://`;
};

export async function signInWithAppwriteGoogle(): Promise<void> {
  if (Platform.OS === "web") {
    const redirectUri = getRedirectUri();
    account.createOAuth2Session({
      provider: OAuthProvider.Google,
      success: redirectUri,
      failure: redirectUri,
    });
    return;
  }

  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices();
  // Clear the cached Google account so the account chooser appears again.
  try {
    await GoogleSignin.signOut();
  } catch {
    // No cached Google session is a valid first-sign-in state.
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error("Google did not return an ID token.");
  }

  await nativeAccount.createIdTokenSession({
    provider: IdTokenProvider.Google,
    idToken: response.data.idToken,
  });
}

export async function getAppwriteUser() {
  return authAccount.get();
}

export async function signOutFromAppwrite(): Promise<void> {
  await authAccount.deleteSession("current");
}

export const appwriteAuthConfig = {
  endpoint: config.endpoint,
  projectId: config.projectId,
};
