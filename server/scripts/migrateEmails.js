/**
 * Migration Script: Update @medqueue.ai emails to @mediflow.ai
 * This script safely updates all email addresses in the database
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateEmails() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Collections to check for email fields
    const collections = ['users', 'hospitals', 'doctors'];

    console.log('📋 STEP 1: Finding all @medqueue emails (Dry Run)\n');
    console.log('='.repeat(60));

    let totalFound = 0;

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);

      // Find documents with @medqueue in email
      const docs = await collection.find({
        email: { $regex: /@medqueue/i }
      }).toArray();

      if (docs.length > 0) {
        console.log(`\n📁 Collection: ${collectionName}`);
        console.log('-'.repeat(40));

        for (const doc of docs) {
          const oldEmail = doc.email;
          const newEmail = oldEmail.replace(/@medqueue/gi, '@mediflow');
          console.log(`   ${oldEmail} → ${newEmail}`);
          totalFound++;
        }
      }
    }

    if (totalFound === 0) {
      console.log('\n✅ No @medqueue.ai emails found in the database.');
      console.log('   Database is already updated or empty.\n');
      await mongoose.disconnect();
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Total emails to update: ${totalFound}\n`);

    // Perform the actual update
    console.log('📋 STEP 2: Updating emails...\n');

    let totalUpdated = 0;

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);

      // Update all documents with @medqueue in email
      const result = await collection.updateMany(
        { email: { $regex: /@medqueue/i } },
        [{
          $set: {
            email: {
              $replaceAll: {
                input: "$email",
                find: "@medqueue",
                replacement: "@mediflow"
              }
            }
          }
        }]
      );

      if (result.modifiedCount > 0) {
        console.log(`   ✅ ${collectionName}: ${result.modifiedCount} email(s) updated`);
        totalUpdated += result.modifiedCount;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Migration Complete! ${totalUpdated} email(s) updated.\n`);

    // Show the updated emails
    console.log('📋 STEP 3: Verifying updates...\n');

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);

      const docs = await collection.find({
        email: { $regex: /@mediflow/i }
      }).toArray();

      if (docs.length > 0) {
        console.log(`📁 Collection: ${collectionName}`);
        for (const doc of docs) {
          console.log(`   ✅ ${doc.email}${doc.name ? ` (${doc.name})` : ''}`);
        }
        console.log('');
      }
    }

    console.log('='.repeat(60));
    console.log('✅ All done! You can now login with the new @mediflow.ai emails.\n');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Migration Error:', error.message);
    process.exit(1);
  }
}

migrateEmails();
