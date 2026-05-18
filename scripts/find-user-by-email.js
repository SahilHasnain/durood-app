/**
 * Find Appwrite User ID by Email
 * 
 * This script searches for a user's data in Appwrite by looking at
 * the documents they created. Since we can't query Appwrite Auth users
 * directly with API key, we search through the data collections.
 * 
 * Usage:
 * node scripts/find-user-by-email.js <email>
 */

require('dotenv').config({ path: '.env.local' });
const { Client, Databases, Query } = require('node-appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID;

const PROGRESS_COLLECTION_ID = 'tasbeeh_progress';
const GOALS_COLLECTION_ID = 'tasbeeh_progress_goals';

// Validate environment variables
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

// Initialize Appwrite
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function findUserByEmail(email) {
  console.log(`\n🔍 Searching for user with email: ${email}\n`);

  try {
    // Get all user IDs from goals collection
    const goalsResponse = await databases.listDocuments(
      DATABASE_ID,
      GOALS_COLLECTION_ID,
      [Query.limit(100)]
    );

    console.log(`📊 Found ${goalsResponse.documents.length} user goal documents\n`);

    // Display all users
    const userIds = new Set();
    for (const doc of goalsResponse.documents) {
      userIds.add(doc.userId);
    }

    console.log('👥 Unique user IDs found:');
    for (const userId of userIds) {
      const progressCount = await databases.listDocuments(
        DATABASE_ID,
        PROGRESS_COLLECTION_ID,
        [Query.equal('userId', userId), Query.limit(1)]
      );

      const goalDoc = goalsResponse.documents.find(d => d.userId === userId);
      
      console.log(`\n   User ID: ${userId}`);
      console.log(`   - Lifetime total: ${goalDoc?.lifetimeTotal || 0}`);
      console.log(`   - Current streak: ${goalDoc?.currentStreak || 0}`);
      console.log(`   - Daily target: ${goalDoc?.dailyTarget || 0}`);
      console.log(`   - Progress records: ${progressCount.total}`);
    }

    console.log('\n💡 To migrate a user, run:');
    console.log('   node scripts/migrate-user-to-clerk.js <old-user-id> <new-clerk-user-id>\n');

  } catch (error) {
    console.error('\n❌ Search failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('\n❌ Invalid arguments!');
  console.error('\nUsage:');
  console.error('  node scripts/find-user-by-email.js <email>');
  console.error('\nExample:');
  console.error('  node scripts/find-user-by-email.js mdsahil1631@gmail.com\n');
  process.exit(1);
}

const [email] = args;
findUserByEmail(email);
