const { Client, Databases, ID } = require("node-appwrite");
const readline = require("readline");
require("dotenv").config({ path: ".env.local" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function addChannel() {
  console.log("📺 Add Durood Channel/Playlist\n");

  try {
    const name = await question("Channel/Playlist Name: ");
    const youtubeChannelId = await question(
      "YouTube Channel ID or Playlist ID: "
    );
    const type = await question("Type (channel/playlist) [channel]: ");
    const includeShorts = await question("Include Shorts? (yes/no) [yes]: ");
    const description = await question("Description (optional): ");

    const channelData = {
      name: name.trim(),
      youtubeChannelId: youtubeChannelId.trim(),
      type: type.trim() || "channel",
      includeShorts: includeShorts.toLowerCase() !== "no",
      description: description.trim() || undefined,
    };

    console.log("\n⏳ Adding channel...");

    const databaseId =
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ||
      (await question("Database ID: "));
    const collectionId =
      process.env.EXPO_PUBLIC_APPWRITE_CHANNELS_COLLECTION_ID ||
      (await question("Channels Collection ID: "));

    const result = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      channelData
    );

    console.log("\n✅ Channel added successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Document ID:     ${result.$id}`);
    console.log(`Name:            ${result.name}`);
    console.log(`YouTube ID:      ${result.youtubeChannelId}`);
    console.log(`Type:            ${result.type}`);
    console.log(`Include Shorts:  ${result.includeShorts}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response);
    }
  } finally {
    rl.close();
  }
}

addChannel();
