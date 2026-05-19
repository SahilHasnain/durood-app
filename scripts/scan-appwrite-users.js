/**
 * Scan Appwrite for User Data
 * 
 * Shows all users and their data in Appwrite
 */

require('dotenv').config({ path: '.env.local' });
const { Client, Databases, Query } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;

const PROGRESS_COLLECTION_ID = 'tasbeeh_progress';
const GOALS_COLLECTION_ID = 'tasbeeh_progress_goals';

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function scan() {
  console.log('\n🔍 Scanning Appwrite...\n');

  const goalsResponse = await databases.listDocuments(
    DATABASE_ID,
    GOALS_COLLECTION_ID,
    [Query.limit(100)]
  );

  const userIds = new Set();
  for (const doc of goalsResponse.documents) {
    userIds.add(doc.userId);
  }

  console.log(`Found ${userIds.size} user(s):\n`);

  for (const userId of userIds) {
    const goalDoc = goalsResponse.documents.find(d => d.userId === userId);
    const progressResponse = await databases.listDocuments(
      DATABASE_ID,
      PROGRESS_COLLECTION_ID,
      [Query.equal('userId', userId), Query.limit(1)]
    );

    console.log(`User ID: ${userId}`);
    console.log(`  Lifetime: ${goalDoc?.lifetimeTotal || 0}`);
    console.log(`  Streak: ${goalDoc?.currentStreak || 0}`);
    console.log(`  Records: ${progressResponse.total}\n`);
  }
}

scan().catch(console.error);
