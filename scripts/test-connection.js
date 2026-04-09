const { Client, Databases, Storage } = require("node-appwrite");
require("dotenv").config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function testConnection() {
  console.log("🔍 Testing Appwrite Connection\n");

  try {
    // Test credentials
    console.log("📋 Configuration:");
    console.log(`   Endpoint: ${process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT}`);
    console.log(`   Project:  ${process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID}`);
    console.log(`   API Key:  ${process.env.APPWRITE_API_KEY ? "✅ Set" : "❌ Missing"}\n`);

    if (!process.env.APPWRITE_API_KEY) {
      throw new Error("APPWRITE_API_KEY not found in .env.local");
    }

    // Test database access
    const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;
    const videosCollectionId = process.env.EXPO_PUBLIC_APPWRITE_VIDEOS_COLLECTION_ID;
    const channelsCollectionId = process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID;
    const storageBucketId = process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID;

    if (!databaseId) {
      console.log("⚠️  Database not set up yet. Run 'npm run setup:appwrite' first.\n");
      return;
    }

    console.log("🔍 Testing Database Access...");
    const database = await databases.get(databaseId);
    console.log(`✅ Database: ${database.name} (${database.$id})\n`);

    // Test collections
    if (videosCollectionId) {
      console.log("🔍 Testing Videos Collection...");
      const videosCollection = await databases.getCollection(databaseId, videosCollectionId);
      const videosCount = await databases.listDocuments(databaseId, videosCollectionId);
      console.log(`✅ Videos Collection: ${videosCollection.name}`);
      console.log(`   Documents: ${videosCount.total}\n`);
    }

    if (channelsCollectionId) {
      console.log("🔍 Testing Channels Collection...");
      const channelsCollection = await databases.getCollection(databaseId, channelsCollectionId);
      const channelsCount = await databases.listDocuments(databaseId, channelsCollectionId);
      console.log(`✅ Channels Collection: ${channelsCollection.name}`);
      console.log(`   Documents: ${channelsCount.total}\n`);
    }

    // Test storage
    if (storageBucketId) {
      console.log("🔍 Testing Storage Bucket...");
      const bucket = await storage.getBucket(storageBucketId);
      const files = await storage.listFiles(storageBucketId);
      console.log(`✅ Storage Bucket: ${bucket.name}`);
      console.log(`   Files: ${files.total}\n`);
    }

    console.log("🎉 All tests passed! Your Appwrite backend is working correctly.\n");

    // Show next steps
    const channelsCount = await databases.listDocuments(databaseId, channelsCollectionId);
    const videosCount = await databases.listDocuments(databaseId, videosCollectionId);
    const files = await storage.listFiles(storageBucketId);

    if (channelsCount && channelsCount.total === 0) {
      console.log("📝 Next Steps:");
      console.log("1. Add channels: npm run add:channel");
      console.log("2. Add videos to database (manually or via API)");
      console.log("3. Upload video files: npm run upload:video");
      console.log("4. Start the app: npm start\n");
    } else if (videosCount && videosCount.total === 0) {
      console.log("📝 Next Steps:");
      console.log("1. Add videos to database (manually or via API)");
      console.log("2. Upload video files: npm run upload:video");
      console.log("3. Start the app: npm start\n");
    } else if (files && files.total === 0) {
      console.log("📝 Next Steps:");
      console.log("1. Upload video files: npm run upload:video");
      console.log("2. Start the app: npm start\n");
    } else {
      console.log("✨ Everything is set up! Run 'npm start' to launch the app.\n");
    }
  } catch (error) {
    console.error("\n❌ Connection Test Failed:", error.message);
    if (error.code === 401) {
      console.error("\n💡 Tip: Check your APPWRITE_API_KEY in .env.local");
    } else if (error.code === 404) {
      console.error("\n💡 Tip: Run 'npm run setup:appwrite' to create the backend");
    }
    process.exit(1);
  }
}

testConnection();
