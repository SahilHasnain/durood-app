# Admin Users Function

Read-only endpoint used by the Expo admin screen. Its function ID is `admin-users`.

## Authorization model

- Set function Execute access to **Users** so an authenticated account can invoke it.
- The function requires the `x-appwrite-user-jwt` header and verifies it by calling `Account.get()` as that user.
- Only accounts with the Appwrite user label `admin` pass the server-side check.
- The function's ephemeral `x-appwrite-key` is used only after that check, to list users and read progress records. Configure only the `users.read` and `documents.read` function scopes.
- Never include the admin API key in the Expo app or its public environment variables.

Add the `admin` label to the intended account in the Appwrite Console. Do not use editable user preferences as the role source.

## Function settings

- Runtime: Node.js 25 (or a currently supported Node.js runtime)
- Entrypoint: `src/main.js`
- Function ID: `admin-users`
- Execute access: Users
- Environment variables:
  - `APPWRITE_FUNCTION_API_ENDPOINT`
  - `APPWRITE_FUNCTION_PROJECT_ID`
  - `APPWRITE_DATABASE_ID`
  - `APPWRITE_PROGRESS_COLLECTION_ID` (defaults to `tasbeeh_progress`)
  - `APPWRITE_GOALS_COLLECTION_ID` (defaults to `tasbeeh_progress_goals`)

Synchronous POST actions:

- `{"action":"listUsers","limit":25,"offset":0,"search":"","today":"YYYY-MM-DD"}`
- `{"action":"getUserDetails","userId":"..."}`

The function returns only account identity fields, goal summaries, today's count, and a capped 60-day daily history. It does not return user preferences or session payloads.

## Expo configuration

The Expo app invokes this function using the signed-in user's JWT. The default function ID is `admin-users`; set `EXPO_PUBLIC_ADMIN_USERS_FUNCTION_ID` only if you create it with a different ID.
