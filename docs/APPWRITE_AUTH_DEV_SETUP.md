# Appwrite Google Auth Development Test

The app is temporarily hardcoded to Appwrite authentication while Google OAuth is being validated. The environment variable remains documented for the later provider switch, but the temporary hardcoded value currently takes precedence.

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

Set this in `.env.local`:

```env
EXPO_PUBLIC_AUTH_PROVIDER=appwrite
```

Then start the app normally. The existing login and Profile buttons use Appwrite Google OAuth. On web, Appwrite redirects to `/auth/appwrite-callback`. On Android and iOS, the app uses the `appwrite-callback-6946f98a001db8a3ab3a://` deep link.

To use Clerk again locally:

```env
EXPO_PUBLIC_AUTH_PROVIDER=clerk
```

Restart Expo after changing the variable because Expo embeds public environment variables into the bundle.

## Native Development Build

Native OAuth callback handling requires a development build that contains the Appwrite callback scheme. Use the development EAS profile or rebuild after changing the scheme/configuration. An Expo Go session may not handle the custom callback consistently.

## Safety Boundary

- No Clerk users are migrated.
- No existing Clerk documents are rewritten.
- Appwrite user IDs are used only when Appwrite is selected.
- Production and preview continue to use Clerk.
- Switching back to Clerk is an environment-variable change.
