/**
 * Migration Script: Appwrite User → Clerk User
 * 
 * This script migrates a single user's data from Appwrite auth to Clerk auth.
 * 
 * Steps:
 * 1. Find old Appwrite user by email
 * 2. Get their Appwrite user ID
 * 3. Provide new Clerk user ID (from Google sign-in)
 * 4. Update all Appwrite documents to use new Clerk user ID
 * 
 * Usage:
 * node scripts/migrate-user-to-clerk.js <old-appwrite-user-id> <new-clerk-user-id>
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
  console.error('Required: EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, EXPO_PUBLIC_APPWRITE_DATABASE_ID');
  process.exit(1);
}

// Initialize Appwrite
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function migrateUser(oldUserId, newUserId) {
  console.log('\n🔄 Starting user migration...');
  console.log(`   Old User ID (Appwrite): ${oldUserId}`);
  console.log(`   New User ID (Clerk): ${newUserId}\n`);

  try {
    // Step 1: Find and update user goals
    console.log('📊 Migrating user goals...');
    const goalsResponse = await databases.listDocuments(
      DATABASE_ID,
      GOALS_COLLECTION_ID,
      [Query.equal('userId', oldUserId)]
    );

    if (goalsResponse.documents.length > 0) {
      for (const doc of goalsResponse.documents) {
        await databases.updateDocument(
          DATABASE_ID,
          GOALS_COLLECTION_ID,
          doc.$id,
          { userId: newUserId }
        );
        console.log(`   ✅ Updated goal document: ${doc.$id}`);
      }
    } else {
      console.log('   ⚠️  No goal documents found');
    }

    // Step 2: Find and update daily progress records
    console.log('\n📈 Migrating daily progress records...');
    let progressCount = 0;
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const progressResponse = await databases.listDocuments(
        DATABASE_ID,
        PROGRESS_COLLECTION_ID,
        [
          Query.equal('userId', oldUserId),
          Query.limit(limit),
          Query.offset(offset)
        ]
      );

      if (progressResponse.documents.length === 0) {
        hasMore = false;
        break;
      }

      for (const doc of progressResponse.documents) {
        await databases.updateDocument(
          DATABASE_ID,
          PROGRESS_COLLECTION_ID,
          doc.$id,
          { userId: newUserId }
        );
        progressCount++;
      }

      offset += limit;
      hasMore = progressResponse.documents.length === limit;
    }

    console.log(`   ✅ Updated ${progressCount} progress documents`);

    // Step 3: Summary
    console.log('\n✨ Migration completed successfully!');
    console.log(`   Total documents migrated: ${goalsResponse.documents.length + progressCount}`);
    console.log(`   - Goals: ${goalsResponse.documents.length}`);
    console.log(`   - Progress records: ${progressCount}`);
    console.log('\n🎉 User can now sign in with Google and access their data!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('\n❌ Invalid arguments!');
  console.error('\nUsage:');
  console.error('  node scripts/migrate-user-to-clerk.js <old-appwrite-user-id> <new-clerk-user-id>');
  console.error('\nExample:');
  console.error('  node scripts/migrate-user-to-clerk.js 6946f98a001db8a3ab3a user_2abc123xyz\n');
  process.exit(1);
}

const [oldUserId, newUserId] = args;
migrateUser(oldUserId, newUserId);
