# Authentication Implementation

## Overview
Email/password authentication has been implemented using Appwrite's authentication service. The app supports both authenticated and anonymous users.

## Features Implemented

### 1. Authentication Screens
- **Login Screen** (`app/auth/login.tsx`)
  - Email/password login
  - Link to registration
  - "Continue without account" option
  
- **Register Screen** (`app/auth/register.tsx`)
  - Name, email, password fields
  - Password confirmation
  - Validation (min 8 characters)
  - Link back to login
  - "Continue without account" option

### 2. Auth Context (`contexts/AuthContext.tsx`)
- Global authentication state management
- Functions: login, register, logout, refreshUser
- Loading states
- Automatic session check on app launch

### 3. Auth Service (`services/authService.ts`)
- Register new users
- Login with email/password
- Logout
- Get current user
- Password recovery
- Update user profile (name, email, password)
- **Anonymous data migration** - migrates data when user signs up/logs in

### 4. Profile Screen (`app/profile.tsx`)
- Shows user info when authenticated
- Menu items for account settings
- Logout button
- "Sign In" prompt when not authenticated

### 5. Data Sync
- **Updated `tasbeehService.ts`** to use authenticated user ID when available
- Falls back to anonymous ID if not logged in
- Seamless transition from anonymous to authenticated

## User Flow

### Anonymous User
1. App launches → redirects to home
2. User can use all features without signing in
3. Data stored with anonymous user ID
4. Can access auth screens from Profile tab

### Registration Flow
1. User taps Profile tab → sees "Sign In" prompt
2. Taps "Sign In" → goes to login screen
3. Taps "Sign Up" → goes to register screen
4. Fills form → creates account
5. **Anonymous data automatically migrated** to new account
6. Redirected to home screen

### Login Flow
1. User taps Profile tab → sees "Sign In" prompt
2. Taps "Sign In" → enters credentials
3. **Anonymous data automatically migrated** to account
4. Redirected to home screen

### Logout Flow
1. User taps Profile tab → sees profile
2. Taps "Logout" → confirmation dialog
3. Confirms → logged out
4. Becomes anonymous user again

## Navigation Structure

```
app/
├── _layout.tsx          # Main tabs (includes AuthProvider)
├── index.tsx            # Entry point (redirects to home)
├── home.tsx             # Home tab
├── progress.tsx         # Progress tab
├── planner.tsx          # Planner tab
├── videos.tsx           # Videos tab
├── shorts.tsx           # Shorts tab
├── profile.tsx          # Profile tab (NEW)
└── auth/
    ├── _layout.tsx      # Auth stack layout
    ├── login.tsx        # Login screen
    └── register.tsx     # Register screen
```

## Key Implementation Details

### AuthProvider Integration
The `AuthProvider` wraps the entire app in `app/_layout.tsx`:
```tsx
<AuthProvider>
  <TabBarVisibilityProvider>
    <RootLayoutContent />
  </TabBarVisibilityProvider>
</AuthProvider>
```

### User ID Resolution
The `tasbeehService.ts` now checks for authenticated user first:
```typescript
async function getUserId(): Promise<string> {
  try {
    const user = await account.get();
    if (user?.$id) return user.$id;
  } catch (error) {
    // Fall back to anonymous
  }
  // Return anonymous ID
}
```

### Data Migration
When a user signs up or logs in, their anonymous data is automatically migrated:
- User goals transferred
- Daily progress history preserved
- Anonymous ID cleared

## Testing Checklist

- [ ] Register new account
- [ ] Login with existing account
- [ ] Logout
- [ ] Continue without account
- [ ] Data persists after login
- [ ] Anonymous data migrates on signup
- [ ] Profile screen shows user info
- [ ] Auth screens accessible from profile tab

## Next Steps (Optional Enhancements)

1. **Email Verification**
   - Send verification email on signup
   - Show verification status in profile

2. **Password Recovery**
   - Implement forgot password flow
   - Add reset password screen

3. **Edit Profile**
   - Update name
   - Change email
   - Change password

4. **Social Login**
   - Google Sign-In
   - Apple Sign-In

5. **Session Management**
   - Handle session expiration
   - Auto-refresh tokens
   - Offline mode handling

6. **Data Sync Improvements**
   - Better conflict resolution
   - Batch migration for large histories
   - Progress indicators during migration
