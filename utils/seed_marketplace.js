const path = require('path');
const fs = require('fs');
const { Listing, ListingMedia, User, sequelize } = require('../models');

async function seedMarketplace() {
  await sequelize.sync();

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Ensure a realistic seller exists
  let seller = await User.findOne({ where: { role: 'user' } });
  if (!seller) {
    seller = await User.create({
      name: 'Priya Sharma (Homeowner)',
      email: 'priya.sharma@gmail.com',
      password_hash: '$2b$10$wT8Kj8wVq0Gz0D8E7H3j4.rP4W7L8H1I9J2K3L4M5N6O7P8Q9R0S1',
      role: 'user',
      phone: '+91 98765 43210',
      address: 'Civil Lines, Prayagraj, UP',
      verified: true,
      rating: 4.9
    });
  }

  // Helper to create a valid colorful SVG converted or generated JPEG image
  // Minimal valid 134-byte Base64 JPEG
  const sampleJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const sampleBuffer = Buffer.from(sampleJpgBase64, 'base64');

  const items = [
    {
      title: 'Lithium-Ion Inverter Battery Pack (Exide 12V 150Ah)',
      description: 'Used 12V backup battery from solar setup. Case is intact with clean lead terminals. Suitable for cell salvage and lithium/cobalt refining.',
      category: 'ENERGY_STORAGE',
      detected_category: 'ENERGY_STORAGE',
      confidence: 0.94,
      condition: 'fair',
      weight_kg: 18.5,
      quantity: 1,
      asking_price: 2800,
      is_negotiable: true,
      status: 'active',
      media_complete: true,
      pickup_address: '42 Sardar Patel Marg, Civil Lines, Prayagraj',
      approx_location: 'Civil Lines, Prayagraj',
      latitude: 25.4529,
      longitude: 81.8349
    },
    {
      title: 'HP Pavilion Laptop & Charger (Burnt Motherboard)',
      description: 'Defective laptop after thunderstorm voltage surge. Screen, keyboard, aluminum chassis, and cooling fans in good shape for scrap extraction.',
      category: 'LAPTOP',
      detected_category: 'LAPTOP',
      confidence: 0.96,
      condition: 'poor',
      weight_kg: 2.3,
      quantity: 1,
      asking_price: 1500,
      is_negotiable: true,
      status: 'active',
      media_complete: true,
      pickup_address: '15 Katra Road, Prayagraj',
      approx_location: 'Katra, Prayagraj',
      latitude: 25.4612,
      longitude: 81.8542
    },
    {
      title: 'Commercial Server Motherboard & Heat Sinks',
      description: 'Retired dual-socket server board with gold-plated PCI slots, copper heat pipes, and VRM capacitors. Perfect for precious metal recovery.',
      category: 'ELECTRONIC_COMPONENT',
      detected_category: 'ELECTRONIC_COMPONENT',
      confidence: 0.91,
      condition: 'poor',
      weight_kg: 3.1,
      quantity: 2,
      asking_price: 1850,
      is_negotiable: true,
      status: 'active',
      media_complete: true,
      pickup_address: 'Naini Industrial Area, Prayagraj',
      approx_location: 'Naini, Prayagraj',
      latitude: 25.3941,
      longitude: 81.8672
    },
    {
      title: 'Samsung Galaxy S20 Broken Screen & Logic Board',
      description: 'Screen broken, power IC dead. Battery was safely disconnected. Good camera sensors and internal flex cables.',
      category: 'SMARTPHONE',
      detected_category: 'SMARTPHONE',
      confidence: 0.89,
      condition: 'poor',
      weight_kg: 0.25,
      quantity: 1,
      asking_price: 650,
      is_negotiable: true,
      status: 'active',
      media_complete: true,
      pickup_address: 'George Town, Prayagraj',
      approx_location: 'George Town, Prayagraj',
      latitude: 25.4410,
      longitude: 81.8610
    }
  ];

  for (let i = 0; i < items.length; i++) {
    const itemData = items[i];
    
    // Check if listing with this title already exists
    let listing = await Listing.findOne({ where: { title: itemData.title } });
    if (!listing) {
      // Create media files on disk
      const ts = Date.now() + i * 1000;
      const fClass = `item-${ts}-classification.jpg`;
      const fPhoto1 = `item-${ts}-angle1.jpg`;
      const fPhoto2 = `item-${ts}-angle2.jpg`;
      const fVideo = `item-${ts}-video.mp4`;

      fs.writeFileSync(path.join(uploadsDir, fClass), sampleBuffer);
      fs.writeFileSync(path.join(uploadsDir, fPhoto1), sampleBuffer);
      fs.writeFileSync(path.join(uploadsDir, fPhoto2), sampleBuffer);
      fs.writeFileSync(path.join(uploadsDir, fVideo), Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]));

      listing = await Listing.create({
        ...itemData,
        seller_id: seller.id,
        image_url: `/uploads/${fClass}`
      });

      // Create 4 ListingMedia records
      await ListingMedia.create({
        listing_id: listing.id,
        media_type: 'classification_image',
        storage_key: `/uploads/${fClass}`,
        original_filename: fClass,
        mime_type: 'image/jpeg',
        file_size: sampleBuffer.length,
        version: 1
      });

      await ListingMedia.create({
        listing_id: listing.id,
        media_type: 'additional_photo_1',
        storage_key: `/uploads/${fPhoto1}`,
        original_filename: fPhoto1,
        mime_type: 'image/jpeg',
        file_size: sampleBuffer.length,
        version: 1
      });

      await ListingMedia.create({
        listing_id: listing.id,
        media_type: 'additional_photo_2',
        storage_key: `/uploads/${fPhoto2}`,
        original_filename: fPhoto2,
        mime_type: 'image/jpeg',
        file_size: sampleBuffer.length,
        version: 1
      });

      await ListingMedia.create({
        listing_id: listing.id,
        media_type: 'condition_video',
        storage_key: `/uploads/${fVideo}`,
        original_filename: fVideo,
        mime_type: 'video/mp4',
        file_size: 12,
        version: 1
      });

      console.log(`[Seed] Created active listing: "${listing.title}" with 4 media items.`);
    }
  }

  console.log('[Seed] Marketplace seed complete.');
}

if (require.main === module) {
  seedMarketplace().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { seedMarketplace };
