/**
 * Automated Migration: Test Clerk → Production Clerk
 * 
 * This script automatically:
 * 1. Finds all user IDs in Appwrite
 * 2. Asks you to provide the Clerk user IDs (from app logs or Clerk dashboard)
 * 3. Migrates all data
 * 
 * Usage:
 * node scripts/migrate-test-to-production.js <test-clerk-user-id> <production-clerk-user-id>
 * 
 * Example:
 * node scripts/migrate-test-to-production.js user_2abc123test user_2xyz789prod
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

async function findAllUsers() {
  console.log('\n🔍 Scanning Appwrite for existing users...\n');

  try {
    const goalsResponse = await databases.listDocuments(
      DATABASE_ID,
      GOALS_COLLECTION_ID,
      [Query.limit(100)]
    );

    const userIds = new Set();
    for (const doc of goalsResponse.documents) {
      userIds.add(doc.userId);
    }

    if (userIds.size === 0) {
      console.log('⚠️  No users found in Appwrite');
      return [];
    }

    console.log(`👥 Found ${userIds.size} user(s) in Appwrite:\n`);

    const users = [];
    for (const userId of userIds) {
      const goalDoc = goalsResponse.documents.find(d => d.userId === userId);
      const progressResponse = await databases.listDocuments(
        DATABASE_ID,
        PROGRESS_COLLECTION_ID,
        [Query.equal('userId', userId), Query.limit(1)]
      );

      const userData = {
        userId,
        lifetimeTotal: goalDoc?.lifetimeTotal || 0,
        currentStreak: goalDoc?.currentStreak || 0,
        dailyTarget: goalDoc?.dailyTarget || 0,
        progressRecords: progressResponse.total
      };

      users.push(userData);

      console.log(`   User ID: ${userId}`);
      console.log(`   - Lifetime total: ${userData.lifetimeTotal}`);
      console.log(`   - Current streak: ${userData.currentStreak}`);
      console.log(`   - Daily target: ${userData.dailyTarget}`);
      console.log(`   - Progress records: ${userData.progressRecords}\n`);
    }

    return users;
  } catch (error) {
    console.error('❌ Failed to scan users:', error.message);
    return [];
  }
}

async function migrateUser(oldUserId, newUserId) {
  console.log('\n🔄 Starting migration...');
  console.log(`   From: ${oldUserId}`);
  console.log(`   To:   ${newUserId}\n`);

  try {
    let totalMigrated = 0;

    // Step 0: Delete any existing data for the new user ID
    console.log('🗑️  Cleaning up existing production user data...');
    
    // Delete existing goals
    const existingGoals = await databases.listDocuments(
      DATABASE_ID,
      GOALS_COLLECTION_ID,
      [Query.equal('userId', newUserId)]
    );
    
    for (const doc of existingGoals.documents) {
      await databases.deleteDocument(DATABASE_ID, GOALS_COLLECTION_ID, doc.$id);
      console.log(`   ✅ Deleted existing goal document`);
    }

    // Delete existing progress records
    let hasMore = true;
    let deletedProgress = 0;
    while (hasMore) {
      const existingProgress = await databases.listDocuments(
        DATABASE_ID,
        PROGRESS_COLLECTION_ID,
        [Query.equal('userId', newUserId), Query.limit(100)]
      );

      if (existingProgress.documents.length === 0) {
        break;
      }

      for (const doc of existingProgress.documents) {
        await databases.deleteDocument(DATABASE_ID, PROGRESS_COLLECTION_ID, doc.$id);
        deletedProgress++;
      }

      hasMore = existingProgress.documents.length === 100;
    }

    if (deletedProgress > 0) {
      console.log(`   ✅ Deleted ${deletedProgress} existing progress records`);
    }

    // Migrate goals
    console.log('\n📊 Migrating user goals...');
    const goalsResponse = await databases.listDocuments(
      DATABASE_ID,
      GOALS_COLLECTION_ID,
      [Query.equal('userId', oldUserId)]
    );

    for (const doc of goalsResponse.documents) {
      await databases.updateDocument(
        DATABASE_ID,
        GOALS_COLLECTION_ID,
        doc.$id,
        { userId: newUserId }
      );
      totalMigrated++;
      console.log(`   ✅ Migrated goal document`);
    }

    // Migrate progress records
    console.log('\n📈 Migrating progress records...');
    let offset = 0;
    const limit = 100;
    hasMore = true;
    let progressCount = 0;

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
        break;
      }

      for (const doc of progressResponse.documents) {
        await databases.updateDocument(
          DATABASE_ID,
          PROGRESS_COLLECTION_ID,
          doc.$id,
          { userId: newUserId }
        );
        totalMigrated++;
        progressCount++;
      }

      console.log(`   ✅ Migrated batch of ${progressResponse.documents.length} progress records (total: ${progressCount})`);

      offset += limit;
      hasMore = progressResponse.documents.length === limit;
    }

    console.log('\n✨ Migration completed successfully!');
    console.log(`   Total documents migrated: ${totalMigrated}`);
    console.log(`   - Goals: ${goalsResponse.documents.length}`);
    console.log(`   - Progress records: ${progressCount}\n`);

    return true;
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Durood App: Test → Production Clerk Migration            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('\n❌ Invalid arguments!');
    console.error('\nUsage:');
    console.error('  node scripts/migrate-test-to-production.js <test-clerk-user-id> <production-clerk-user-id>');
    console.error('\nHow to get Clerk user IDs:');
    console.error('  1. Sign in with test key - check console logs for user ID');
    console.error('  2. Sign in with production key - check console logs for user ID');
    console.error('  OR go to Clerk dashboard → Users → find mdsahil1631@gmail.com\n');
    console.error('Example:');
    console.error('  node scripts/migrate-test-to-production.js user_2abc123test user_2xyz789prod\n');
    process.exit(1);
  }

  const [testUserId, prodUserId] = args;

  // Step 1: Show existing users in Appwrite
  const users = await findAllUsers();

  if (users.length === 0) {
    console.log('\n⚠️  No data to migrate. Exiting...\n');
    return;
  }

  // Step 2: Validate user IDs
  if (!testUserId.startsWith('user_') || !prodUserId.startsWith('user_')) {
    console.error('\n❌ Invalid Clerk user IDs. They should start with "user_"\n');
    process.exit(1);
  }

  if (testUserId === prodUserId) {
    console.error('\n❌ User IDs are the same. No migration needed.\n');
    process.exit(1);
  }

  // Step 3: Check if test user ID exists in Appwrite
  const testUserExists = users.some(u => u.userId === testUserId);
  if (!testUserExists) {
    console.error(`\n❌ Test user ID "${testUserId}" not found in Appwrite.`);
    console.error('Available user IDs:');
    users.forEach(u => console.error(`   - ${u.userId}`));
    console.error('');
    process.exit(1);
  }

  // Step 4: Confirm and migrate
  console.log('\n⚠️  MIGRATION SUMMARY');
  console.log(`   From (Test):       ${testUserId}`);
  console.log(`   To (Production):   ${prodUserId}`);
  
  const userToMigrate = users.find(u => u.userId === testUserId);
  console.log(`\n   Data to migrate:`);
  console.log(`   - Lifetime total: ${userToMigrate.lifetimeTotal}`);
  console.log(`   - Current streak: ${userToMigrate.currentStreak}`);
  console.log(`   - Progress records: ${userToMigrate.progressRecords}`);
  console.log('');

  // Run migration
  const success = await migrateUser(testUserId, prodUserId);

  if (success) {
    console.log('🎉 All done! Sign in with Google in production mode to see your data.\n');
  } else {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
