const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false,
});

// Existing Core Models (Preserved and Enhanced)
const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'user' }, // 'user' (seller) or 'recycler' (buyer)
  phone: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  rating: { type: DataTypes.FLOAT, defaultValue: 5.0 },
  avatar_url: { type: DataTypes.STRING },
});

const Booking = sequelize.define('Booking', {
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  recycler_id: { type: DataTypes.INTEGER },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  item_name: { type: DataTypes.STRING, allowNull: false },
  item_category: { type: DataTypes.STRING },
  item_condition: { type: DataTypes.STRING, defaultValue: 'non-working' },
  item_quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  estimated_value: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  pickup_address: { type: DataTypes.TEXT, allowNull: false },
  pickup_date: { type: DataTypes.STRING, allowNull: false },
  notes: { type: DataTypes.TEXT },
});

const Valuation = sequelize.define('Valuation', {
  user_id: { type: DataTypes.INTEGER },
  item_name: { type: DataTypes.STRING },
  item_category: { type: DataTypes.STRING },
  confidence: { type: DataTypes.FLOAT },
  detected_class: { type: DataTypes.STRING },
  image_path: { type: DataTypes.STRING },
  condition: { type: DataTypes.STRING },
  min_value: { type: DataTypes.FLOAT },
  max_value: { type: DataTypes.FLOAT },
  estimated_value: { type: DataTypes.FLOAT },
});

// 1. Marketplace Listings (Created by Sellers)
const Listing = sequelize.define('Listing', {
  seller_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  detected_category: { type: DataTypes.STRING }, // From YOLOv8
  category: { type: DataTypes.STRING, allowNull: false }, // Final confirmed category
  confidence: { type: DataTypes.FLOAT, defaultValue: 0.0 }, // Actual model confidence
  condition: { type: DataTypes.STRING, defaultValue: 'poor' }, // 'good', 'fair', 'poor'
  weight_kg: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  asking_price: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  is_negotiable: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.STRING, defaultValue: 'active' }, // 'active', 'paused', 'media_incomplete', 'deal_pending', 'sold', 'cancelled'
  media_complete: { type: DataTypes.BOOLEAN, defaultValue: false }, // Must have 1 original + 2 photos + 1 video to be complete
  image_url: { type: DataTypes.STRING }, // Primary image URL (Original classification image)
  pickup_address: { type: DataTypes.TEXT, allowNull: false }, // Private full address
  approx_location: { type: DataTypes.STRING }, // City / Neighborhood for public privacy
  latitude: { type: DataTypes.FLOAT },
  longitude: { type: DataTypes.FLOAT },
  ai_recommendations: { type: DataTypes.TEXT }, // JSON stringified advice
  safety_warnings: { type: DataTypes.TEXT }, // JSON stringified safety warnings
});

// 2. Listing Media (1 AI Image + 2 Additional Photos + 1 Video)
const ListingMedia = sequelize.define('ListingMedia', {
  listing_id: { type: DataTypes.INTEGER, allowNull: false },
  media_type: { type: DataTypes.STRING, allowNull: false }, // 'classification_image', 'additional_photo_1', 'additional_photo_2', 'condition_video'
  storage_key: { type: DataTypes.TEXT, allowNull: false }, // Cloud or local persistent URL
  original_filename: { type: DataTypes.STRING },
  mime_type: { type: DataTypes.STRING },
  file_size: { type: DataTypes.INTEGER },
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
});

// 3. Buyer Offers & Negotiations
const Offer = sequelize.define('Offer', {
  listing_id: { type: DataTypes.INTEGER, allowNull: false },
  buyer_id: { type: DataTypes.INTEGER, allowNull: false },
  offered_price: { type: DataTypes.FLOAT, allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, // 'pending', 'countered', 'accepted', 'rejected', 'closed'
  pickup_proposal: { type: DataTypes.STRING },
  initial_message: { type: DataTypes.TEXT },
  seller_counter_count: { type: DataTypes.INTEGER, defaultValue: 0 }, // Strict limit: max 3 seller counter-offers
  last_counter_by: { type: DataTypes.STRING, defaultValue: 'buyer' }, // 'buyer' or 'seller'
  media_version_snapshot: { type: DataTypes.INTEGER, defaultValue: 1 }, // Preserve exact media evaluated
});

// 4. Negotiation Message Thread (Independent per buyer-listing pair)
const NegotiationMessage = sequelize.define('NegotiationMessage', {
  offer_id: { type: DataTypes.INTEGER, allowNull: false },
  sender_id: { type: DataTypes.INTEGER, allowNull: false },
  sender_role: { type: DataTypes.STRING, allowNull: false }, // 'seller' or 'buyer'
  message: { type: DataTypes.TEXT, allowNull: false },
  proposed_price: { type: DataTypes.FLOAT },
  is_counter_offer: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// 5. Completed / In-Progress Deal Transactions
const Transaction = sequelize.define('Transaction', {
  listing_id: { type: DataTypes.INTEGER, allowNull: false },
  offer_id: { type: DataTypes.INTEGER, allowNull: false },
  seller_id: { type: DataTypes.INTEGER, allowNull: false },
  buyer_id: { type: DataTypes.INTEGER, allowNull: false },
  agreed_price: { type: DataTypes.FLOAT, allowNull: false },
  agreed_quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  agreed_weight_kg: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  status: { type: DataTypes.STRING, defaultValue: 'deal_accepted' }, // 'deal_accepted', 'pickup_scheduled', 'picked_up', 'completed', 'cancelled'
  pickup_date: { type: DataTypes.STRING },
  pickup_time_slot: { type: DataTypes.STRING },
  authorized_pickup_address: { type: DataTypes.TEXT },
  handover_otp: { type: DataTypes.STRING }, // Single-use 6-digit handover verification code
  verified_weight_kg: { type: DataTypes.FLOAT },
  co2_saved_kg: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  notes: { type: DataTypes.TEXT },
  completed_at: { type: DataTypes.DATE },
});

// 6. In-App Notifications
const Notification = sequelize.define('Notification', {
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'general' },
  link: { type: DataTypes.STRING },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// 7. Verified Recycler Business Profiles
const RecyclerProfile = sequelize.define('RecyclerProfile', {
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  business_name: { type: DataTypes.STRING, allowNull: false },
  license_number: { type: DataTypes.STRING },
  accepted_categories: { type: DataTypes.TEXT }, // JSON array of supported e-waste classes
  service_city: { type: DataTypes.STRING, defaultValue: 'Prayagraj' },
  service_radius_km: { type: DataTypes.FLOAT, defaultValue: 30.0 },
  latitude: { type: DataTypes.FLOAT, defaultValue: 25.4358 },
  longitude: { type: DataTypes.FLOAT, defaultValue: 81.8463 },
  verification_status: { type: DataTypes.STRING, defaultValue: 'verified' },
  facility_address: { type: DataTypes.TEXT },
  contact_phone: { type: DataTypes.STRING },
  contact_email: { type: DataTypes.STRING },
  years_operating: { type: DataTypes.INTEGER, defaultValue: 3 },
  capacity_tons_month: { type: DataTypes.FLOAT, defaultValue: 25.0 }
});

// Relationships
User.hasMany(Booking, { foreignKey: 'user_id', as: 'userBookings' });
User.hasMany(Booking, { foreignKey: 'recycler_id', as: 'recyclerBookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Booking.belongsTo(User, { foreignKey: 'recycler_id', as: 'recycler' });

User.hasMany(Listing, { foreignKey: 'seller_id', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });

Listing.hasMany(ListingMedia, { foreignKey: 'listing_id', as: 'media' });
ListingMedia.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

Listing.hasMany(Offer, { foreignKey: 'listing_id', as: 'offers' });
Offer.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

User.hasMany(Offer, { foreignKey: 'buyer_id', as: 'buyerOffers' });
Offer.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });

Offer.hasMany(NegotiationMessage, { foreignKey: 'offer_id', as: 'messages' });
NegotiationMessage.belongsTo(Offer, { foreignKey: 'offer_id', as: 'offer' });
NegotiationMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

Listing.hasOne(Transaction, { foreignKey: 'listing_id', as: 'transaction' });
Transaction.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });
Transaction.belongsTo(Offer, { foreignKey: 'offer_id', as: 'offer' });
Transaction.belongsTo(User, { foreignKey: 'seller_id', as: 'seller' });
Transaction.belongsTo(User, { foreignKey: 'buyer_id', as: 'buyer' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(RecyclerProfile, { foreignKey: 'user_id', as: 'recyclerProfile' });
RecyclerProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Booking,
  Valuation,
  Listing,
  ListingMedia,
  Offer,
  NegotiationMessage,
  Transaction,
  Notification,
  RecyclerProfile
};
