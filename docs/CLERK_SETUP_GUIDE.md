# Clerk Authentication Setup Guide

## ✅ Completed Steps

### 1. Package Installation
- ✅ Installed `@clerk/clerk-expo@^2.19.31`
- ✅ Installed `expo-secure-store` for token caching
- ✅ Installed `expo-web-browser` for OAuth flow

### 2. Configuration Files
- ✅ Created `.env` file with Clerk configuration template
- ✅ Created `utils/tokenCache.ts` for secure token storage
- ✅ Updated `app/_layout.tsx` with ClerkProvider wrapper

### 3. Authentication Context
- ✅ Updated `contexts/AuthContext.tsx` to use Clerk hooks
- ✅ Removed old Appwrite email/password auth logic
- ✅ Added Clerk user transformation to match app's User interface

### 4. Login Screen
- ✅ Updated `app/auth/login.tsx` with Google OAuth button
- ✅ Removed email/password input fields
- ✅ Added "Continue without account" option
- ✅ Integrated `useOAuth` hook for Google sign-in

### 5. Data Layer Integration
- ✅ Updated `hooks/useTasbeehData.ts` to use Clerk user IDs
- ✅ Modified all TasbeehService calls to accept optional user ID parameter
- ✅ Maintained AsyncStorage fallback for offline functionality

---

## 🔧 Required Configuration

### Step 1: Get Clerk Publishable Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application (or create a new one)
3. Go to **API Keys** section
4. Copy the **Publishable Key**
5. Update `.env` file:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

### Step 2: Configure Google OAuth in Clerk

1. In Clerk Dashboard, go to **User & Authentication** → **Social Connections**
2. Enable **Google** provider
3. Configure OAuth consent screen:
   - Add your app name
   - Add support email
   - Add authorized domains
4. Get Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs from Clerk
5. Add Google Client ID and Secret to Clerk

### Step 3: Configure Expo for OAuth

Update `app.config.js` to add Clerk scheme:

```javascript
export default {
  // ... existing config
  expo: {
    // ... existing expo config
    scheme: "duroodapp", // Add this
    plugins: [
      // ... existing plugins
      [
        "@clerk/clerk-expo/plugin",
        {
          // Optional: customize Clerk plugin
        }
      ]
    ]
  }
};
```

---

## 📝 Next Steps (To Be Done)

### 1. Update TasbeehService Functions

The following functions in `services/tasbeehService.ts` need to be updated to accept an optional `userId` parameter:

- `getUserGoal(userId?: string)`
- `getTodayProgress(userId?: string)`
- `calculateStreak(userId?: string)`
- `createOrUpdateDailyProgress(count, target, userId?: string)`
- `createOrUpdateUserGoal(data, userId?: string)`
- `syncFromLocalStorage(userId?: string)`

**Implementation approach:**
- If `userId` is provided, use it to query/create Appwrite documents
- If `userId` is not provided (user not signed in), use device-specific identifier or skip cloud sync
- Maintain backward compatibility with existing local-only users

### 2. Remove Old Auth Files (Optional Cleanup)

These files are no longer needed:
- `app/auth/register.tsx` (if exists)
- `services/authService.ts` (old Appwrite auth)

### 3. Test Authentication Flow

1. **Test Google Sign-In:**
   - Open app → Navigate to Profile
   - Tap "Sign In" → Tap "Continue with Google"
   - Complete Google OAuth flow
   - Verify user data appears in profile

2. **Test Data Sync:**
   - Sign in with Google
   - Add some tasbeeh counts
   - Close app and reopen
   - Verify data persists

3. **Test Offline Mode:**
   - Use app without signing in
   - Add tasbeeh counts
   - Verify data saves to AsyncStorage
   - Sign in later and verify data syncs

### 4. Add Phone Authentication (Phase 2)

Once Google OAuth is working:

1. Enable Phone provider in Clerk Dashboard
2. Update login screen to add phone number option
3. Use Clerk's `useSignIn` hook with phone strategy
4. Add OTP verification screen

---

## 🔍 Key Changes Summary

### Authentication Flow
**Before:** Email/Password → Appwrite Session → User ID
**After:** Google OAuth → Clerk Session → Clerk User ID → Appwrite Data

### Data Storage
- **User Authentication:** Clerk (replaces Appwrite Auth)
- **User Data (tasbeeh counts, goals, etc.):** Appwrite (unchanged)
- **Offline Cache:** AsyncStorage (unchanged)

### User ID Mapping
- Old: Appwrite `$id` field
- New: Clerk `id` field
- Both are unique strings, so Appwrite documents can use Clerk IDs directly

---

## 🚨 Important Notes

1. **Existing Users:** Current Appwrite users with email/password won't be able to sign in. You'll need to implement a migration strategy or let them create new accounts.

2. **Data Migration:** User data is tied to Appwrite user IDs. When users sign in with Google (new Clerk ID), they'll start fresh unless you implement data migration.

3. **Offline First:** The app still works without authentication. Users can use it offline, and data syncs when they sign in.

4. **Testing:** Test thoroughly in development before deploying to production. Use Clerk's test mode.

---

## 📚 Resources

- [Clerk Expo Documentation](https://clerk.com/docs/quickstarts/expo)
- [Clerk OAuth Documentation](https://clerk.com/docs/authentication/social-connections/oauth)
- [Expo Web Browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)
