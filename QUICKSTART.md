# Durood App - Quick Start Guide

Get your Durood app with Shorts tab up and running in minutes!

## Prerequisites

- Node.js installed
- Appwrite account with API key
- Your credentials already in `.env.local`

## Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `appwrite` - Client SDK
- `expo-video` - Video player
- `node-appwrite` - Server SDK for scripts
- `dotenv` - Environment variables

## Step 2: Set Up Appwrite Backend

Run the automated setup script:

```bash
npm run setup:appwrite
```

This script will:
- ✅ Create a new database
- ✅ Create videos collection with all attributes and indexes
- ✅ Create channels collection with all attributes and indexes
- ✅ Create storage bucket for video files
- ✅ Automatically update your `.env.local` with all IDs

**Expected Output:**
```
🚀 Setting up Appwrite for Durood App...

📦 Creating database...
✅ Database created: 67abc123...

📝 Creating videos collection...
✅ Videos collection created: 67def456...
   Adding video attributes...
   ✅ Video attributes created
   Creating video indexes...
   ✅ Video indexes created

📝 Creating channels collection...
✅ Channels collection created: 67ghi789...
   Adding channel attributes...
   ✅ Channel attributes created
   Creating channel indexes...
   ✅ Channel indexes created

📦 Creating storage bucket...
✅ Storage bucket created: 67jkl012...

📝 Updating .env.local file...
✅ .env.local updated

🎉 Setup complete! Your Appwrite backend is ready.
```

## Step 3: Add Channels

Add YouTube channels or playlists that contain Durood shorts:

```bash
npm run add:channel
```

**Example:**
```
📺 Add Durood Channel/Playlist

Channel/Playlist Name: Durood Collection
YouTube Channel ID or Playlist ID: UCxyz123abc
Type (channel/playlist) [channel]: channel
Include Shorts? (yes/no) [yes]: yes
Description (optional): Beautiful Durood recitations

⏳ Adding channel...

✅ Channel added successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Document ID:     67mno345...
Name:            Durood Collection
YouTube ID:      UCxyz123abc
Type:            channel
Include Shorts:  true
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 4: Add Video Metadata

For now, you'll need to manually add video documents to the database. You can:

### Option A: Use Appwrite Console (Easiest)

1. Go to your Appwrite console
2. Navigate to your database → videos collection
3. Click "Add Document"
4. Fill in the fields:
   ```json
   {
     "title": "Beautiful Durood Sharif",
     "youtubeId": "abc123xyz",
     "videoId": "",
     "thumbnailUrl": "https://i.ytimg.com/vi/abc123xyz/maxresdefault.jpg",
     "duration": 45,
     "uploadDate": "2024-01-15",
     "channelName": "Durood Channel",
     "channelId": "UCxyz123abc",
     "views": 10000,
     "description": "Beautiful recitation",
     "tags": ["durood", "islamic"],
     "language": "urdu",
     "topic": "durood",
     "isShort": true
   }
   ```

### Option B: Implement YouTube API Integration

The `ingest-videos.js` script is a placeholder. To implement:

1. Get YouTube Data API v3 key from Google Cloud Console
2. Add `YOUTUBE_API_KEY` to `.env.local`
3. Implement video fetching in `scripts/ingest-videos.js`
4. Run `npm run ingest:videos`

## Step 5: Upload Video Files

After adding video metadata, upload the actual video files:

```bash
npm run upload:video
```

**Example:**
```
📤 Upload Durood Video

Video file path: ./videos/durood-short-1.mp4
YouTube ID (for linking): abc123xyz

🔍 Checking for existing video document...
✅ Found video: Beautiful Durood Sharif

📤 Uploading video file...
✅ Video uploaded: 67pqr678...

📝 Updating video document...

✅ Upload complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Video Title:     Beautiful Durood Sharif
YouTube ID:      abc123xyz
Storage File ID: 67pqr678...
Document ID:     67stu901...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 6: Run the App

```bash
npm start
```

Then:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for web

## Verify Everything Works

1. Open the app
2. Tap the "Shorts" tab at the bottom
3. You should see your uploaded shorts
4. Swipe up/down to navigate
5. Videos should auto-play
6. Progress should be tracked

## Troubleshooting

### "Missing configuration" error
- Make sure you ran `npm run setup:appwrite`
- Check that `.env.local` has all EXPO_PUBLIC_* variables filled

### Videos not loading
- Verify storage bucket permissions are set to public read
- Check that `videoId` in database matches file ID in storage
- Ensure video file format is supported (mp4, webm, mov)

### No shorts appearing
- Verify videos have `isShort: true` in database
- Check that `channelId` matches a channel in channels collection
- Ensure `videoId` is not null or empty

### Script errors
- Verify `APPWRITE_API_KEY` is in `.env.local`
- Check that API key has proper permissions
- Ensure you're using the correct project ID

## File Structure

```
durood-app/
├── scripts/
│   ├── setup-appwrite.js    # ✅ Automated backend setup
│   ├── add-channel.js        # ✅ Add channels interactively
│   ├── ingest-videos.js      # 🚧 Placeholder for YouTube API
│   └── upload-video.js       # ✅ Upload video files
├── .env.local                # ✅ Auto-updated by setup script
└── package.json              # ✅ Scripts configured
```

## Next Steps

1. ✅ Backend is set up
2. ✅ Add more channels
3. ✅ Add video metadata (manually or via API)
4. ✅ Upload video files
5. 🎨 Customize UI/UX
6. 📱 Test on device
7. 🚀 Build and deploy

## Support

- Appwrite Docs: https://appwrite.io/docs
- Expo Docs: https://docs.expo.dev
- Check `SHORTS_SETUP.md` for detailed documentation
- Check `IMPLEMENTATION_SUMMARY.md` for technical details

## Quick Commands Reference

```bash
# Setup
npm install                  # Install dependencies
npm run setup:appwrite       # Set up Appwrite backend

# Content Management
npm run add:channel          # Add a channel/playlist
npm run ingest:videos        # Ingest videos (placeholder)
npm run upload:video         # Upload video file

# Development
npm start                    # Start Expo dev server
npm run android              # Run on Android
npm run ios                  # Run on iOS
npm run web                  # Run on web

# Build
npm run build:dev            # Development build
npm run build:prev           # Preview build
npm run build:prod           # Production build
```

That's it! Your Durood app with Shorts tab is ready to go! 🎉
