const { sequelize, Listing, ListingMedia } = require('../models');

async function runSafeMigrations() {
  const queryInterface = sequelize.getQueryInterface();

  // 1. Safely add missing columns to Users
  const userTableInfo = await queryInterface.describeTable('Users').catch(() => ({}));
  if (!userTableInfo.verified) {
    console.log('[Migration] Adding column verified to Users');
    await sequelize.query('ALTER TABLE Users ADD COLUMN verified BOOLEAN DEFAULT 0;').catch(e => console.log(e.message));
  }
  if (!userTableInfo.rating) {
    console.log('[Migration] Adding column rating to Users');
    await sequelize.query('ALTER TABLE Users ADD COLUMN rating FLOAT DEFAULT 5.0;').catch(e => console.log(e.message));
  }
  if (!userTableInfo.avatar_url) {
    console.log('[Migration] Adding column avatar_url to Users');
    await sequelize.query('ALTER TABLE Users ADD COLUMN avatar_url TEXT;').catch(e => console.log(e.message));
  }

  // 2. Safely add missing columns to Listings
  const listingTableInfo = await queryInterface.describeTable('Listings').catch(() => ({}));
  if (listingTableInfo.id && !listingTableInfo.media_complete) {
    console.log('[Migration] Adding column media_complete to Listings');
    await sequelize.query('ALTER TABLE Listings ADD COLUMN media_complete BOOLEAN DEFAULT 0;').catch(e => console.log(e.message));
  }

  // 3. Safely add missing columns to Offers
  const offerTableInfo = await queryInterface.describeTable('Offers').catch(() => ({}));
  if (offerTableInfo.id && !offerTableInfo.media_version_snapshot) {
    console.log('[Migration] Adding column media_version_snapshot to Offers');
    await sequelize.query('ALTER TABLE Offers ADD COLUMN media_version_snapshot INTEGER DEFAULT 1;').catch(e => console.log(e.message));
  }

  // 4. Ensure ListingMedia table exists
  await ListingMedia.sync();

  // 5. Backfill existing listings to have a classification_image media record if image_url exists
  try {
    const existingListings = await Listing.findAll({
      include: [{ model: ListingMedia, as: 'media' }]
    });

    for (const l of existingListings) {
      if (l.image_url && (!l.media || l.media.length === 0)) {
        console.log(`[Migration] Creating classification_image media entry for listing #${l.id}`);
        await ListingMedia.create({
          listing_id: l.id,
          media_type: 'classification_image',
          storage_key: l.image_url,
          original_filename: 'classification-image.jpg',
          mime_type: 'image/jpeg',
          file_size: 1024 * 100,
          version: 1
        });
      }

      // Check if listing has all 4 media slots
      const mediaTypes = (l.media || []).map(m => m.media_type);
      const isComplete = ['classification_image', 'additional_photo_1', 'additional_photo_2', 'condition_video']
        .every(type => mediaTypes.includes(type));

      if (l.media_complete !== isComplete) {
        l.media_complete = isComplete;
        if (!isComplete && l.status === 'active') {
          // Existing listings without all 4 items are marked media_incomplete
          l.status = 'media_incomplete';
        }
        await l.save();
      }
    }
  } catch (err) {
    console.warn('[Migration] Backfill note:', err.message);
  }

  console.log('[Migration] Safe migrations completed.');
}

module.exports = { runSafeMigrations };

if (require.main === module) {
  runSafeMigrations().then(() => process.exit(0));
}
