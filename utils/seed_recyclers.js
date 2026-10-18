const path = require('path');
const bcrypt = require('bcrypt');
const { User, RecyclerProfile, sequelize } = require('../models');
const dataset = require('../data/prayagraj_recyclers.json');

async function seedRecyclerProfiles() {
  try {
    console.log(`Starting Prayagraj Recycler Seeder with ${dataset.length} unique profiles...`);

    // Clean up any existing duplicate recycler profiles
    await RecyclerProfile.destroy({ where: {} });

    const defaultPasswordHash = await bcrypt.hash('Recycler@123', 10);

    for (let i = 0; i < dataset.length; i++) {
      const item = dataset[i];
      const email = item.contact_email.toLowerCase();

      // Find or create recycler user account
      let user = await User.findOne({ where: { email } });
      if (!user) {
        user = await User.create({
          name: item.business_name,
          email,
          password_hash: defaultPasswordHash,
          role: 'recycler',
          phone: item.contact_phone,
          address: item.facility_address,
          verified: true,
          rating: item.rating || 4.8
        });
      } else {
        await user.update({
          name: item.business_name,
          phone: item.contact_phone,
          address: item.facility_address,
          role: 'recycler',
          verified: true,
          rating: item.rating || user.rating
        });
      }

      // Create pristine RecyclerProfile
      await RecyclerProfile.create({
        user_id: user.id,
        business_name: item.business_name,
        license_number: item.license_number,
        accepted_categories: JSON.stringify(item.accepted_categories),
        service_city: item.service_city || 'Prayagraj',
        service_radius_km: item.service_radius_km || 35.0,
        facility_address: item.facility_address,
        latitude: item.latitude,
        longitude: item.longitude,
        verification_status: item.verification_status || 'verified',
        contact_phone: item.contact_phone,
        contact_email: item.contact_email,
        years_operating: item.years_operating,
        capacity_tons_month: item.capacity_tons_month
      });

      console.log(`[${i + 1}/${dataset.length}] Seeded unique recycler: ${item.business_name} (${item.facility_address})`);
    }

    console.log(`Successfully seeded all ${dataset.length} unique Prayagraj recyclers!`);
  } catch (err) {
    console.error('Error seeding recycler profiles:', err);
  }
}

module.exports = { seedRecyclerProfiles };

if (require.main === module) {
  sequelize.sync().then(() => seedRecyclerProfiles().then(() => process.exit(0)));
}
