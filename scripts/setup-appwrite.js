const { Client, Databases, Storage, ID, Permission, Role } = require("node-appwrite");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function setupAppwrite() {
  console.log("🚀 Setting up Appwrite for Durood App...\n");

  try {
    // Validate credentials
    if (!process.env.APPWRITE_API_KEY) {
      throw new Error(
        "APPWRITE_API_KEY not found in .env.local. Please add your API key."
      );
    }

    // 1. Create Database
    console.log("📦 Creating database...");
    const database = await databases.create(ID.unique(), "durood-app-db");
    console.log(`✅ Database created: ${database.$id}\n`);

    // 2. Create Videos Collection
    console.log("📝 Creating videos collection...");
    const videosCollection = await databases.createCollection(
      database.$id,
      ID.unique(),
      "videos",
      [Permission.read(Role.any()), Permission.write(Role.users())]
    );
    console.log(`✅ Videos collection created: ${videosCollection.$id}`);

    // Add attributes to videos collection
    console.log("   Adding video attributes...");
    await databases.createStringAttribute(database.$id, videosCollection.$id, "title", 500, true);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "youtubeId", 255, true);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "videoId", 255, true);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "thumbnailUrl", 1000, false);
    await databases.createIntegerAttribute(database.$id, videosCollection.$id, "duration", true);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "uploadDate", 255, true);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "channelName", 255, true);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "channelId", 255, true);
    await databases.createIntegerAttribute(database.$id, videosCollection.$id, "views", false);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "description", 5000, false);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "tags", 255, false, null, true); // array
    await databases.createStringAttribute(database.$id, videosCollection.$id, "language", 50, false);
    await databases.createStringAttribute(database.$id, videosCollection.$id, "topic", 255, false);
    await databases.createBooleanAttribute(database.$id, videosCollection.$id, "isShort", true);
    console.log("   ✅ Video attributes created");

    // Wait for attributes to be available
    console.log("   ⏳ Waiting for attributes to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create indexes
    console.log("   Creating video indexes...");
    await databases.createIndex(database.$id, videosCollection.$id, "isShort_idx", "key", ["isShort"]);
    await databases.createIndex(database.$id, videosCollection.$id, "channelId_idx", "key", ["channelId"]);
    await databases.createIndex(database.$id, videosCollection.$id, "videoId_idx", "key", ["videoId"]);
    console.log("   ✅ Video indexes created\n");

    // 3. Create Channels Collection
    console.log("📝 Creating channels collection...");
    const channelsCollection = await databases.createCollection(
      database.$id,
      ID.unique(),
      "channels",
      [Permission.read(Role.any()), Permission.write(Role.users())]
    );
    console.log(`✅ Channels collection created: ${channelsCollection.$id}`);

    // Add attributes to channels collection
    console.log("   Adding channel attributes...");
    await databases.createStringAttribute(database.$id, channelsCollection.$id, "name", 255, true);
    await databases.createStringAttribute(database.$id, channelsCollection.$id, "youtubeChannelId", 255, true);
    await databases.createStringAttribute(database.$id, channelsCollection.$id, "thumbnailUrl", 1000, false);
    await databases.createStringAttribute(database.$id, channelsCollection.$id, "description", 2000, false);
    await databases.createStringAttribute(database.$id, channelsCollection.$id, "type", 50, false);
    await databases.createBooleanAttribute(database.$id, channelsCollection.$id, "ignoreDuration", false);
    await databases.createBooleanAttribute(database.$id, channelsCollection.$id, "includeShorts", false);
    console.log("   ✅ Channel attributes created");

    // Wait for attributes to be available
    console.log("   ⏳ Waiting for attributes to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create index
    console.log("   Creating channel indexes...");
    await databases.createIndex(database.$id, channelsCollection.$id, "youtubeChannelId_idx", "key", ["youtubeChannelId"]);
    console.log("   ✅ Channel indexes created\n");

    // 4. Create Storage Bucket
    console.log("📦 Creating storage bucket...");
    const bucket = await storage.createBucket(
      ID.unique(),
      "durood-videos",
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );
    console.log(`✅ Storage bucket created: ${bucket.$id}\n`);

    // Update .env.local file
    console.log("📝 Updating .env.local file...");
    const envPath = path.join(__dirname, "..", ".env.local");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Add or update environment variables
    const updates = {
      EXPO_PUBLIC_APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
      EXPO_PUBLIC_APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
      EXPO_PUBLIC_APPWRITE_DATABASE_ID: database.$id,
      EXPO_PUBLIC_APPWRITE_VIDEOS_COLLECTION_ID: videosCollection.$id,
      EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID: channelsCollection.$id,
      EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID: bucket.$id,
    };

    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });

    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env.local updated\n");

    // Print configuration
    console.log("🎉 Setup complete! Your Appwrite backend is ready.\n");
    console.log("📋 Configuration Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Endpoint:            ${updates.EXPO_PUBLIC_APPWRITE_ENDPOINT}`);
    console.log(`Project ID:          ${updates.EXPO_PUBLIC_APPWRITE_PROJECT_ID}`);
    console.log(`Database ID:         ${database.$id}`);
    console.log(`Videos Collection:   ${videosCollection.$id}`);
    console.log(`Channels Collection: ${channelsCollection.$id}`);
    console.log(`Storage Bucket:      ${bucket.$id}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📝 Next Steps:");
    console.log("1. Add channels using: npm run add:channel");
    console.log("2. Ingest videos using: npm run ingest:videos");
    console.log("3. Upload video files using: npm run upload:video");
    console.log("4. Start the app: npm start\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response);
    }
    process.exit(1);
  }
}

setupAppwrite();
