const { Client, Databases, ID, Permission, Role } = require("node-appwrite");
require("dotenv").config({ path: ".env.local" });

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;

async function setupTasbeehCollections() {
  try {
    console.log("Setting up Tasbeeh collections...");

    // Create Daily Progress Collection
    console.log("\n1. Creating tasbeeh_progress collection...");
    const progressCollection = await databases.createCollection(
      databaseId,
      "tasbeeh_progress",
      "Tasbeeh Daily Progress",
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ]
    );
    console.log("✓ Created tasbeeh_progress collection");

    // Create attributes for progress collection
    await databases.createStringAttribute(
      databaseId,
      progressCollection.$id,
      "userId",
      255,
      true
    );
    await databases.createStringAttribute(
      databaseId,
      progressCollection.$id,
      "date",
      10,
      true
    );
    await databases.createIntegerAttribute(
      databaseId,
      progressCollection.$id,
      "count",
      true
    );
    await databases.createIntegerAttribute(
      databaseId,
      progressCollection.$id,
      "target",
      true
    );
    await databases.createStringAttribute(
      databaseId,
      progressCollection.$id,
      "sessions",
      10000,
      false
    );
    await databases.createDatetimeAttribute(
      databaseId,
      progressCollection.$id,
      "createdAt",
      true
    );
    await databases.createDatetimeAttribute(
      databaseId,
      progressCollection.$id,
      "updatedAt",
      true
    );
    console.log("✓ Created attributes for tasbeeh_progress");

    // Create indexes
    await databases.createIndex(
      databaseId,
      progressCollection.$id,
      "userId_date",
      "key",
      ["userId", "date"]
    );
    await databases.createIndex(
      databaseId,
      progressCollection.$id,
      "date_desc",
      "key",
      ["date"],
      ["DESC"]
    );
    console.log("✓ Created indexes for tasbeeh_progress");

    // Create User Goals Collection
    console.log("\n2. Creating tasbeeh_progress_goals collection...");
    const goalsCollection = await databases.createCollection(
      databaseId,
      "tasbeeh_progress_goals",
      "Tasbeeh User Goals",
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ]
    );
    console.log("✓ Created tasbeeh_progress_goals collection");

    // Create attributes for goals collection
    await databases.createStringAttribute(
      databaseId,
      goalsCollection.$id,
      "userId",
      255,
      true
    );
    await databases.createIntegerAttribute(
      databaseId,
      goalsCollection.$id,
      "totalGoal",
      true
    );
    await databases.createIntegerAttribute(
      databaseId,
      goalsCollection.$id,
      "lifetimeTotal",
      true
    );
    await databases.createIntegerAttribute(
      databaseId,
      goalsCollection.$id,
      "currentStreak",
      true
    );
    await databases.createIntegerAttribute(
      databaseId,
      goalsCollection.$id,
      "longestStreak",
      true
    );
    await databases.createIntegerAttribute(
      databaseId,
      goalsCollection.$id,
      "dailyTarget",
      true
    );
    await databases.createStringAttribute(
      databaseId,
      goalsCollection.$id,
      "targetDate",
      10,
      false
    );
    await databases.createDatetimeAttribute(
      databaseId,
      goalsCollection.$id,
      "createdAt",
      true
    );
    await databases.createDatetimeAttribute(
      databaseId,
      goalsCollection.$id,
      "updatedAt",
      true
    );
    console.log("✓ Created attributes for tasbeeh_progress_goals");

    // Create index for goals
    await databases.createIndex(
      databaseId,
      goalsCollection.$id,
      "userId_unique",
      "unique",
      ["userId"]
    );
    console.log("✓ Created index for tasbeeh_progress_goals");

    console.log("\n✅ Tasbeeh collections setup complete!");
    console.log("\nCollection IDs:");
    console.log(`  - Progress: ${progressCollection.$id}`);
    console.log(`  - Goals: ${goalsCollection.$id}`);
  } catch (error) {
    console.error("❌ Error setting up collections:", error);
    process.exit(1);
  }
}

setupTasbeehCollections();
