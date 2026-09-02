# Hardcoded Environment Variables

## Overview
All frontend environment variables have been hardcoded directly in the configuration files. The app no longer depends on `process.env` or `expo-constants` for runtime configuration.

## Changes Made

### 1. `app.config.js`
**Before:**
```javascript
extra: {
  appwriteEndpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  appwriteProjectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  // ... other env vars
}
```

**After:**
```javascript
extra: {
  appwriteEndpoint: "https://fra.cloud.appwrite.io/v1",
  appwriteProjectId: "6946f98a001db8a3ab3a",
  appwriteDatabaseId: "69d787ad002831c59b48",
  appwriteVideosCollectionId: "69d787af0003b92d2963",
  appwriteChannelsCollectionId: "69d787ba001af3838dc9",
  appwriteStorageBucketId: "69d787c10015ff7916f7",
}
```

### 2. `config/appwrite.ts`
**Before:**
```typescript
import Constants from "expo-constants";

const frontendConfig = {
  endpoint: Constants.expoConfig?.extra?.appwriteEndpoint || "",
  projectId: Constants.expoConfig?.extra?.appwriteProjectId || "",
  // ... reading from Constants
};
```

**After:**
```typescript
const config = {
  endpoint: "https://fra.cloud.appwrite.io/v1",
  projectId: "6946f98a001db8a3ab3a",
  databaseId: "69d787ad002831c59b48",
  videosCollectionId: "69d787af0003b92d2963",
  channelsCollectionId: "69d787ba001af3838dc9",
  storageBucketId: "69d787c10015ff7916f7",
} as const;
```

## Hardcoded Values

| Variable | Value |
|----------|-------|
| Endpoint | `https://fra.cloud.appwrite.io/v1` |
| Project ID | `6946f98a001db8a3ab3a` |
| Database ID | `69d787ad002831c59b48` |
| Videos Collection ID | `69d787af0003b92d2963` |
| Channels Collection ID | `69d787ba001af3838dc9` |
| Storage Bucket ID | `69d787c10015ff7916f7` |

## Backend Scripts
Backend scripts in the `scripts/` directory still use `.env.local` file for configuration:
- `setup-appwrite.js`
- `test-connection.js`
- `ingest-videos.js`
- `add-channel.js`
- `upload-video.js`

These scripts require:
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `YOUTUBE_API_KEY`

## Benefits
1. **No runtime dependencies** - App doesn't need `expo-constants` for config
2. **Faster startup** - No need to read from environment at runtime
3. **Simpler deployment** - No need to manage environment variables in build process
4. **Type safety** - Config is now `as const` for better TypeScript support

## Security Note
These are **public** Appwrite credentials meant for client-side use. The actual security is handled by:
- Appwrite's built-in authentication
- Collection-level permissions
- API key restrictions (for backend scripts only)

## Updating Configuration
To change any configuration value:
1. Update the value in `config/appwrite.ts`
2. Optionally update `app.config.js` (though it's not used by the app anymore)
3. Rebuild the app

## Testing
After hardcoding, verify:
- [ ] App starts without errors
- [ ] Videos load correctly
- [ ] Authentication works
- [ ] Tasbeeh counter syncs to Appwrite
- [ ] Progress and planner screens work
