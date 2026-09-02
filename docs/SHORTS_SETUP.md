# Durood App - Shorts Tab Setup Guide

This guide will help you set up the Shorts tab feature in the Durood app with Appwrite backend.

## Prerequisites

- Node.js and npm installed
- Expo CLI installed
- Appwrite account (https://cloud.appwrite.io)

## Step 1: Install Dependencies

```bash
npm install
```

New dependencies added:
- `appwrite` - Appwrite SDK for client-side operations
- `expo-video` - Video player component

## Step 2: Set Up Appwrite Backend

### 2.1 Create Appwrite Project

1. Go to https://cloud.appwrite.io
2. Create a new project
3. Note down your Project ID

### 2.2 Create Database

1. In your Appwrite project, go to "Databases"
2. Create a new database
3. Note down the Database ID

### 2.3 Create Collections

#### Videos Collection

Create a collection named "videos" with the following attributes:

| Attribute | Type | Required | Array |
|-----------|------|----------|-------|
| title | String | Yes | No |
| youtubeId | String | Yes | No |
| videoId | String | Yes | No |
| thumbnailUrl | String | No | No |
| duration | Integer | Yes | No |
| uploadDate | String | Yes | No |
| channelName | String | Yes | No |
| channelId | String | Yes | No |
| views | Integer | No | No |
| description | String | No | No |
| tags | String | No | Yes |
| language | String | No | No |
| topic | String | No | No |
| isShort | Boolean | Yes | No |

**Indexes:**
- Create index on `isShort` (ASC)
- Create index on `channelId` (ASC)
- Create index on `videoId` (ASC)

#### Channels Collection

Create a collection named "channels" with the following attributes:

| Attribute | Type | Required | Array |
|-----------|------|----------|-------|
| name | String | Yes | No |
| youtubeChannelId | String | Yes | No |
| thumbnailUrl | String | No | No |
| description | String | No | No |
| type | String | No | No |
| ignoreDuration | Boolean | No | No |
| includeShorts | Boolean | No | No |

**Indexes:**
- Create index on `youtubeChannelId` (ASC)

### 2.4 Create Storage Bucket

1. Go to "Storage" in your Appwrite project
2. Create a new bucket named "videos"
3. Set permissions to allow public read access
4. Note down the Bucket ID

### 2.5 Set Permissions

For both collections:
- Set read permissions to "Any" (public read)
- Set write permissions as needed for your admin panel

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Appwrite credentials in `.env.local`:
   ```env
   EXPO_PUBLIC_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
   EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_APPWRITE_DATABASE_ID=your_database_id
   EXPO_PUBLIC_APPWRITE_VIDEOS_COLLECTION_ID=your_videos_collection_id
   EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID=your_channels_collection_id
   EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=your_storage_bucket_id
   ```

## Step 4: Upload Content

### Option 1: Manual Upload

1. Go to your Appwrite console
2. Add channels to the "channels" collection
3. Add videos to the "videos" collection with `isShort: true`
4. Upload video files to the storage bucket and link them via `videoId`

### Option 2: Use Scripts (Recommended)

You can create scripts similar to kids-shorts repo:
- `scripts/add-channel.js` - Add YouTube channels
- `scripts/ingest-videos.js` - Fetch and ingest videos from YouTube
- `scripts/upload-video.js` - Upload video files to Appwrite storage

## Step 5: Run the App

```bash
npm start
```

Then:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for web

## Features Implemented

### Frontend
- ✅ Shorts tab with vertical swipe navigation
- ✅ Video player with play/pause controls
- ✅ Progress tracking (saves watch position)
- ✅ Seen shorts tracking (marks shorts as seen after 80% watch)
- ✅ Infinite scroll with smart feed algorithm
- ✅ Pull to refresh
- ✅ Empty states and loading indicators
- ✅ Tab bar auto-hide on shorts screen

### Backend (Appwrite)
- ✅ Database collections for videos and channels
- ✅ Storage bucket for video files
- ✅ Query optimization with indexes
- ✅ Public read access for content

## Architecture

```
durood-app/
├── app/
│   ├── _layout.tsx          # Tab navigation setup
│   ├── index.tsx            # Tasbeeh counter (existing)
│   ├── home.tsx             # Home screen
│   └── shorts.tsx           # Shorts feed screen
├── components/
│   ├── AnimatedTabBar.tsx   # Custom animated tab bar
│   ├── CustomVideoPlayer.tsx # Video player component
│   └── EmptyState.tsx       # Empty state component
├── config/
│   └── appwrite.ts          # Appwrite client configuration
├── contexts/
│   └── TabBarVisibilityContext.tsx # Tab bar visibility state
├── hooks/
│   ├── useDuroodShorts.ts   # Shorts feed logic
│   └── useSeenShorts.ts     # Seen shorts tracking
├── services/
│   └── progressTracking.ts  # Video progress persistence
└── types/
    └── index.ts             # TypeScript types
```

## Troubleshooting

### Videos not loading
- Check Appwrite credentials in `.env.local`
- Verify storage bucket permissions are set to public read
- Ensure `videoId` in database matches file ID in storage

### Shorts not appearing
- Verify videos have `isShort: true` in database
- Check that `channelId` matches a channel in channels collection
- Ensure `videoId` is not null or empty

### App crashes on shorts tab
- Run `npm install` to ensure all dependencies are installed
- Clear cache: `expo start -c`
- Check console for error messages

## Next Steps

1. Add more channels to the channels collection
2. Ingest durood shorts from YouTube
3. Upload video files to Appwrite storage
4. Test the shorts feed
5. Customize UI/UX as needed

## Support

For issues or questions, refer to:
- Appwrite docs: https://appwrite.io/docs
- Expo docs: https://docs.expo.dev
- Kids-shorts repo for reference implementation
