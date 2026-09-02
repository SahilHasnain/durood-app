# Durood App - Shorts Feature

A TikTok-style shorts feed for Durood recitations, powered by Appwrite backend.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up Appwrite backend (automated)
npm run setup:appwrite

# 3. Test connection
npm run test:connection

# 4. Add channels
npm run add:channel

# 5. Add videos and upload files
# (See QUICKSTART.md for details)

# 6. Run the app
npm start
```

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Step-by-step setup guide
- **[SHORTS_SETUP.md](./SHORTS_SETUP.md)** - Detailed Appwrite configuration
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical architecture

## 🛠️ Available Scripts

### Setup & Testing
- `npm run setup:appwrite` - Automated Appwrite backend setup
- `npm run test:connection` - Test Appwrite connection and show status

### Content Management
- `npm run add:channel` - Add YouTube channel/playlist interactively
- `npm run ingest:videos` - Ingest videos (placeholder for YouTube API)
- `npm run upload:video` - Upload video file to Appwrite storage

### Development
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

### Build
- `npm run build:dev` - Development build
- `npm run build:prev` - Preview build
- `npm run build:prod` - Production build

## 🏗️ Architecture

```
Frontend (React Native + Expo)
├── Tabs Navigation (Home, Shorts)
├── Video Player (expo-video)
├── Progress Tracking (AsyncStorage)
└── Seen Shorts Tracking (AsyncStorage)

Backend (Appwrite)
├── Database
│   ├── Videos Collection (metadata)
│   └── Channels Collection (sources)
└── Storage
    └── Video Files Bucket
```

## 📦 What's Included

### Frontend Components
- ✅ Shorts feed with vertical swipe
- ✅ Custom video player with controls
- ✅ Animated tab bar (auto-hide)
- ✅ Progress tracking
- ✅ Seen shorts tracking
- ✅ Smart feed algorithm
- ✅ Pull to refresh
- ✅ Infinite scroll
- ✅ Empty states

### Backend Scripts
- ✅ Automated setup script
- ✅ Connection test script
- ✅ Add channel script
- ✅ Upload video script
- 🚧 Ingest videos script (placeholder)

### Configuration
- ✅ Appwrite client setup
- ✅ Environment variables
- ✅ TypeScript types
- ✅ Expo configuration

## 🔧 Setup Details

### Prerequisites
- Node.js and npm
- Expo CLI
- Appwrite account with API key

### Environment Variables

Your `.env.local` should have:

```env
# Admin credentials (for scripts)
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_API_KEY=your_api_key

# Frontend config (auto-populated by setup script)
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=auto_generated
EXPO_PUBLIC_APPWRITE_VIDEOS_COLLECTION_ID=auto_generated
EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID=auto_generated
EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=auto_generated
```

### Automated Setup

The `setup:appwrite` script automatically:
1. Creates database
2. Creates videos collection with attributes and indexes
3. Creates channels collection with attributes and indexes
4. Creates storage bucket with proper permissions
5. Updates `.env.local` with all generated IDs

## 📱 Features

### Smart Feed Algorithm
- Prioritizes unseen shorts
- Shuffles for variety
- Tracks served shorts
- Infinite scroll with pagination

### Video Player
- Auto-play active video
- Play/pause controls
- Loop playback
- Progress tracking
- Error handling

### Progress Tracking
- Saves position every 5 seconds
- Restores on revisit (5-95%)
- Marks as seen after 80% watch
- Persists to AsyncStorage

### Tab Bar Animation
- Smoothly hides on shorts screen
- Smoothly shows when leaving
- 60fps animations with Reanimated

## 🗂️ Database Schema

### Videos Collection
```typescript
{
  title: string;           // Video title
  youtubeId: string;       // YouTube video ID
  videoId: string;         // Appwrite storage file ID
  thumbnailUrl?: string;   // Thumbnail URL
  duration: number;        // Duration in seconds
  uploadDate: string;      // Upload date
  channelName: string;     // Channel name
  channelId: string;       // YouTube channel ID
  views?: number;          // View count
  description?: string;    // Description
  tags?: string[];         // Tags array
  language?: string;       // Language code
  topic?: string;          // Topic/category
  isShort: boolean;        // Is this a short?
}
```

### Channels Collection
```typescript
{
  name: string;              // Channel/playlist name
  youtubeChannelId: string;  // YouTube ID
  thumbnailUrl?: string;     // Thumbnail URL
  description?: string;      // Description
  type?: string;             // "channel" or "playlist"
  ignoreDuration?: boolean;  // Ignore duration filter
  includeShorts?: boolean;   // Include shorts
}
```

## 🔍 Testing

After setup, test your connection:

```bash
npm run test:connection
```

Expected output:
```
🔍 Testing Appwrite Connection

📋 Configuration:
   Endpoint: https://fra.cloud.appwrite.io/v1
   Project:  6946f98a001db8a3ab3a
   API Key:  ✅ Set

🔍 Testing Database Access...
✅ Database: durood-app-db (67abc123...)

🔍 Testing Videos Collection...
✅ Videos Collection: videos
   Documents: 0

🔍 Testing Channels Collection...
✅ Channels Collection: channels
   Documents: 0

🔍 Testing Storage Bucket...
✅ Storage Bucket: durood-videos
   Files: 0

🎉 All tests passed! Your Appwrite backend is working correctly.
```

## 🐛 Troubleshooting

### Setup script fails
- Check API key has proper permissions
- Verify project ID is correct
- Ensure you have internet connection

### Videos not loading
- Verify storage bucket has public read permissions
- Check videoId matches file ID in storage
- Ensure video format is supported (mp4, webm, mov)

### No shorts appearing
- Verify videos have `isShort: true`
- Check channelId matches a channel document
- Ensure videoId is not null/empty

### Connection test fails
- Verify credentials in `.env.local`
- Check API key is valid
- Run `npm run setup:appwrite` if database not found

## 📈 Next Steps

1. ✅ Run setup script
2. ✅ Test connection
3. ✅ Add channels
4. 📝 Add video metadata (manually or via API)
5. 📤 Upload video files
6. 🎨 Customize UI
7. 📱 Test on device
8. 🚀 Deploy

## 🤝 Contributing

To add YouTube API integration:
1. Get YouTube Data API v3 key
2. Add to `.env.local` as `YOUTUBE_API_KEY`
3. Implement in `scripts/ingest-videos.js`
4. Filter for shorts (duration < 60s)
5. Create video documents

## 📄 License

Same as main Durood app project.

## 🙏 Credits

- Architecture inspired by kids-shorts repo
- Built with Expo and React Native
- Backend powered by Appwrite
- Video player using expo-video

---

**Need help?** Check the documentation files or open an issue.
