# Appwrite Google Auth Development Test

The app uses Appwrite authentication globally. Google OAuth is configured for web, Android, and iOS.

## Appwrite Console

1. Open the project configured in `config/appwrite.ts`.
2. Go to **Auth**, **Settings**, and enable the Google OAuth provider.
3. Add the Google OAuth client ID and client secret.
4. Add this Appwrite-provided OAuth redirect URL to the Google Cloud OAuth client:

   `https://fra.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/6946f98a001db8a3ab3a`
5. Add the app's web host under **Platforms**.

For local web testing, use the exact host and port shown by Expo, such as `http://localhost:8081`. The callback route used by this app is `/auth/appwrite-callback`.

The URL above is only the Google-to-Appwrite callback. Do not pass it as the app's `success` or `failure` URL. Native Appwrite OAuth returns to `appwrite-callback-6946f98a001db8a3ab3a://`.

## Run Locally

Start the app normally. The existing Login and Profile buttons use Appwrite Google OAuth. On web, Appwrite redirects to `/auth/appwrite-callback`. On Android and iOS, the app uses the `appwrite-callback-6946f98a001db8a3ab3a://` deep link.

## Native Development Build

Native OAuth callback handling requires a development build that contains the Appwrite callback scheme. Use the development EAS profile or rebuild after changing the scheme/configuration. An Expo Go session may not handle the custom callback consistently.

## Safety Boundary

- No Clerk users are migrated.
- No existing Clerk documents are rewritten.
- Appwrite user IDs are used only when Appwrite is selected.
- Existing Clerk-linked data is not rewritten automatically.
