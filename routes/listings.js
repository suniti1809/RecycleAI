const express = require('express');
const multer = require('multer');
const { Op } = require('sequelize');
const { Listing, ListingMedia, User, Offer, Transaction, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { uploadMedia } = require('../supabase');

const router = express.Router();

const REQUIRED_MEDIA_TYPES = [
  'classification_image',
  'additional_photo_1',
  'additional_photo_2',
  'condition_video'
];

// Memory storage for multer
const storage = multer.memoryStorage();

// File filter & size limits
const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024 // 60MB max per upload request
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (file.fieldname === 'condition_video' || req.body.media_type === 'condition_video') {
      if (!isVideo) {
        return cb(new Error('Condition video must be a valid video file (MP4, WebM, or MOV)'));
      }
    } else {
      if (!isImage && !isVideo) {
        return cb(new Error('Unsupported file format. Please upload JPEG, PNG, WebP for photos or MP4, WebM for videos.'));
      }
    }
    cb(null, true);
  }
});

// Multer upload middleware for multi-slot listing creation using upload.any()
// Accepts all media fields gracefully, preventing MulterError: Unexpected field
const handleListingUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('[Listings Upload Error]:', err);
      if (err.name === 'MulterError') {
        return res.status(400).json({ error: `Upload error (${err.code}): ${err.message}${err.field ? ' in ' + err.field : ''}` });
      }
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    // Organize req.files array into an object keyed by fieldname
    const filesByField = {};
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        if (!filesByField[f.fieldname]) filesByField[f.fieldname] = [];
        filesByField[f.fieldname].push(f);
      }
    }
    req.files = filesByField;
    next();
  });
};

// Multer upload middleware for individual media slot replacement
const handleSingleMediaUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('[Single Media Upload Error]:', err);
      if (err.name === 'MulterError') {
        return res.status(400).json({ error: `Upload error (${err.code}): ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    if (Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

/**
 * Validate a media buffer and mime type
 */
function validateMediaPayload(file, expectedType) {
  if (!file) return 'No file provided';

  const isVideo = file.mimetype.startsWith('video/');
  const isImage = file.mimetype.startsWith('image/');

  if (expectedType === 'condition_video') {
    if (!isVideo) return 'Condition video must be an MP4, WebM, or MOV video file.';
    if (file.size > 50 * 1024 * 1024) return 'Video exceeds the maximum size limit of 50MB.';
  } else {
    if (!isImage) return 'Photos must be in JPEG, PNG, or WebP format.';
    if (file.size > 15 * 1024 * 1024) return 'Photo exceeds the maximum size limit of 15MB.';
  }
  return null;
}

// ── GET /api/listings — Public marketplace browse with filters ──
router.get('/', async (req, res) => {
  try {
    const {
      category,
      condition,
      min_price,
      max_price,
      search,
      sort = 'newest',
      status = 'active',
      limit = 50,
      offset = 0
    } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') {
      where[Op.or] = [
        { category: category },
        { detected_category: category }
      ];
    }

    if (condition && condition !== 'all') {
      where.condition = condition;
    }

    if (min_price || max_price) {
      where.asking_price = {};
      if (min_price) where.asking_price[Op.gte] = parseFloat(min_price);
      if (max_price) where.asking_price[Op.lte] = parseFloat(max_price);
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { approx_location: { [Op.like]: `%${search}%` } }
      ];
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') order = [['asking_price', 'ASC']];
    if (sort === 'price_desc') order = [['asking_price', 'DESC']];

    const listings = await Listing.findAll({
      where,
      order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'rating', 'verified']
        },
        {
          model: Offer,
          as: 'offers',
          attributes: ['id', 'status', 'offered_price']
        },
        {
          model: ListingMedia,
          as: 'media'
        }
      ]
    });

    // Mask exact pickup_address for public marketplace privacy
    const safeListings = listings.map(l => {
      const data = l.toJSON();
      data.total_offers = (data.offers || []).length;
      delete data.pickup_address; // Protect private address
      return data;
    });

    res.json({ listings: safeListings, count: safeListings.length });
  } catch (error) {
    console.error('[Listings] GET / error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/listings/my — Seller's own listings ──
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const listings = await Listing.findAll({
      where: { seller_id: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Offer,
          as: 'offers',
          include: [
            {
              model: User,
              as: 'buyer',
              attributes: ['id', 'name', 'email', 'rating', 'verified']
            }
          ]
        },
        {
          model: Transaction,
          as: 'transaction'
        },
        {
          model: ListingMedia,
          as: 'media'
        }
      ]
    });

    res.json({ listings, count: listings.length });
  } catch (error) {
    console.error('[Listings] GET /my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/listings/:id — Single listing details with all media ──
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'phone', 'email', 'rating', 'verified']
        },
        {
          model: Offer,
          as: 'offers',
          include: [
            {
              model: User,
              as: 'buyer',
              attributes: ['id', 'name', 'rating', 'verified']
            }
          ]
        },
        {
          model: Transaction,
          as: 'transaction'
        },
        {
          model: ListingMedia,
          as: 'media'
        }
      ]
    });

    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const data = listing.toJSON();

    // Check caller token if provided to see if address can be unmasked
    let canViewPrivateAddress = false;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded && (decoded.id === listing.seller_id || (data.transaction && data.transaction.buyer_id === decoded.id))) {
          canViewPrivateAddress = true;
        }
      } catch (e) {}
    }

    if (!canViewPrivateAddress) {
      delete data.pickup_address;
    }

    res.json({ listing: data });
  } catch (error) {
    console.error('[Listings] GET /:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/listings — Create a new listing with all 4 media items ──
router.post('/', authenticateToken, handleListingUpload, async (req, res) => {
  try {
    const {
      title,
      description,
      detected_category,
      category,
      confidence,
      condition = 'poor',
      weight_kg = 1.0,
      quantity = 1,
      asking_price = 0.0,
      is_negotiable = true,
      pickup_address,
      approx_location,
      latitude,
      longitude,
      ai_recommendations,
      safety_warnings,
      // URLs if already uploaded via separate endpoints
      classification_image_url,
      additional_photo_1_url,
      additional_photo_2_url,
      condition_video_url,
      image_url: legacyImageUrl
    } = req.body;

    if (req.user.role === 'recycler') {
      return res.status(403).json({
        error: 'Recycler accounts are registered as commercial buyers. To list e-waste for sale, please sign in with a Seller account.'
      });
    }

    if (!title || !category || !pickup_address) {
      return res.status(400).json({ error: 'Title, category, and pickup address are required' });
    }

    if (parseFloat(asking_price) < 0 || parseInt(quantity) <= 0 || parseFloat(weight_kg) <= 0) {
      return res.status(400).json({ error: 'Price, quantity, and weight must be positive numbers' });
    }

    const files = req.files || {};
    const mediaSlots = {};

    // Helper to safely get first file by multiple possible keys
    const getFileByKeys = (...keys) => {
      for (const k of keys) {
        if (files[k] && files[k][0]) return files[k][0];
      }
      return null;
    };

    // 1. Classification Image (Primary)
    const classImg = getFileByKeys('classification_image', 'image', 'photo_0', 'file_0');
    if (classImg) {
      const err = validateMediaPayload(classImg, 'classification_image');
      if (err) return res.status(400).json({ error: err });
      const stored = await uploadMedia(classImg.buffer, classImg.originalname, classImg.mimetype);
      mediaSlots['classification_image'] = { ...stored, original_filename: classImg.originalname };
    } else if (classification_image_url || legacyImageUrl) {
      mediaSlots['classification_image'] = {
        url: classification_image_url || legacyImageUrl,
        original_filename: 'classification-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 100
      };
    }

    // 2. Additional Photo 1
    const photo1 = getFileByKeys('additional_photo_1', 'photo1', 'photo_1', 'file_1');
    if (photo1) {
      const err = validateMediaPayload(photo1, 'additional_photo_1');
      if (err) return res.status(400).json({ error: err });
      const stored = await uploadMedia(photo1.buffer, photo1.originalname, photo1.mimetype);
      mediaSlots['additional_photo_1'] = { ...stored, original_filename: photo1.originalname };
    } else if (additional_photo_1_url) {
      mediaSlots['additional_photo_1'] = {
        url: additional_photo_1_url,
        original_filename: 'photo-1.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 100
      };
    }

    // 3. Additional Photo 2
    const photo2 = getFileByKeys('additional_photo_2', 'photo2', 'photo_2', 'file_2');
    if (photo2) {
      const err = validateMediaPayload(photo2, 'additional_photo_2');
      if (err) return res.status(400).json({ error: err });
      const stored = await uploadMedia(photo2.buffer, photo2.originalname, photo2.mimetype);
      mediaSlots['additional_photo_2'] = { ...stored, original_filename: photo2.originalname };
    } else if (additional_photo_2_url) {
      mediaSlots['additional_photo_2'] = {
        url: additional_photo_2_url,
        original_filename: 'photo-2.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 100
      };
    }

    // 4. Item Condition Video
    const videoFile = getFileByKeys('condition_video', 'video', 'video_file', 'file_3');
    if (videoFile) {
      const err = validateMediaPayload(videoFile, 'condition_video');
      if (err) return res.status(400).json({ error: err });
      const stored = await uploadMedia(videoFile.buffer, videoFile.originalname, videoFile.mimetype);
      mediaSlots['condition_video'] = { ...stored, original_filename: videoFile.originalname };
    } else if (condition_video_url) {
      mediaSlots['condition_video'] = {
        url: condition_video_url,
        original_filename: 'condition-video.mp4',
        mimeType: 'video/mp4',
        fileSize: 1024 * 500
      };
    }

    // Check completeness: Must have all 4 media types
    const missingMedia = REQUIRED_MEDIA_TYPES.filter(type => !mediaSlots[type]);
    const isMediaComplete = missingMedia.length === 0;

    // Derived locality
    const derivedApprox = approx_location || pickup_address.split(',').slice(-2).join(',').trim() || 'Prayagraj';

    const listing = await Listing.create({
      seller_id: req.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      detected_category: detected_category || category,
      category: category.trim(),
      confidence: confidence ? parseFloat(confidence) : 0.0,
      condition,
      weight_kg: parseFloat(weight_kg),
      quantity: parseInt(quantity),
      asking_price: parseFloat(asking_price),
      is_negotiable: is_negotiable === 'false' || is_negotiable === false ? false : true,
      status: isMediaComplete ? 'active' : 'media_incomplete',
      media_complete: isMediaComplete,
      image_url: mediaSlots['classification_image'] ? mediaSlots['classification_image'].url : '',
      pickup_address: pickup_address.trim(),
      approx_location: derivedApprox,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      ai_recommendations: typeof ai_recommendations === 'object' ? JSON.stringify(ai_recommendations) : (ai_recommendations || null),
      safety_warnings: typeof safety_warnings === 'object' ? JSON.stringify(safety_warnings) : (safety_warnings || null)
    });

    // Create ListingMedia entries for all uploaded slots
    const createdMedia = [];
    for (const [type, data] of Object.entries(mediaSlots)) {
      const m = await ListingMedia.create({
        listing_id: listing.id,
        media_type: type,
        storage_key: data.url,
        original_filename: data.original_filename || `${type}.jpg`,
        mime_type: data.mimeType || 'image/jpeg',
        file_size: data.fileSize || 0,
        version: 1
      });
      createdMedia.push(m);
    }

    res.status(201).json({
      message: isMediaComplete
        ? 'Listing created and published successfully!'
        : `Listing saved as media_incomplete. Please upload: ${missingMedia.join(', ')}`,
      listing,
      media: createdMedia,
      media_complete: isMediaComplete,
      missing_media: missingMedia
    });
  } catch (error) {
    console.error('[Listings] POST / error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/listings/:id/media — Upload or replace an individual media slot ──
router.post('/:id/media', authenticateToken, handleSingleMediaUpload, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: Only the seller can manage media for this listing' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const { media_type } = req.body;
    if (!media_type || !REQUIRED_MEDIA_TYPES.includes(media_type)) {
      return res.status(400).json({
        error: `Invalid media_type. Must be one of: ${REQUIRED_MEDIA_TYPES.join(', ')}`
      });
    }

    const validationErr = validateMediaPayload(req.file, media_type);
    if (validationErr) {
      return res.status(400).json({ error: validationErr });
    }

    // Upload to Supabase Storage (with local fallback)
    const stored = await uploadMedia(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Check if an accepted deal already exists on this listing
    const acceptedDeal = await Transaction.findOne({ where: { listing_id: listing.id } });

    // Look for existing media in this slot
    const existingMedia = await ListingMedia.findOne({
      where: { listing_id: listing.id, media_type },
      order: [['version', 'DESC']]
    });

    let savedMedia;
    if (acceptedDeal) {
      // Versioning snapshot: if an accepted deal exists, preserve the old version for the buyer!
      const nextVersion = (existingMedia ? existingMedia.version : 1) + 1;
      savedMedia = await ListingMedia.create({
        listing_id: listing.id,
        media_type,
        storage_key: stored.url,
        original_filename: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        version: nextVersion
      });
    } else if (existingMedia) {
      // No deal yet, update slot directly
      existingMedia.storage_key = stored.url;
      existingMedia.original_filename = req.file.originalname;
      existingMedia.mime_type = req.file.mimetype;
      existingMedia.file_size = req.file.size;
      await existingMedia.save();
      savedMedia = existingMedia;
    } else {
      savedMedia = await ListingMedia.create({
        listing_id: listing.id,
        media_type,
        storage_key: stored.url,
        original_filename: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        version: 1
      });
    }

    // If updating classification_image, keep primary image_url in sync
    if (media_type === 'classification_image') {
      listing.image_url = stored.url;
    }

    // Re-verify if all 4 required media types exist on this listing
    const allListingMedia = await ListingMedia.findAll({ where: { listing_id: listing.id } });
    const presentTypes = Array.from(new Set(allListingMedia.map(m => m.media_type)));
    const missingTypes = REQUIRED_MEDIA_TYPES.filter(t => !presentTypes.includes(t));
    const isComplete = missingTypes.length === 0;

    listing.media_complete = isComplete;
    if (isComplete && listing.status === 'media_incomplete') {
      listing.status = 'active'; // Eligible for buyer offers!
    }
    await listing.save();

    res.json({
      message: `Media slot '${media_type}' uploaded successfully`,
      media_item: savedMedia,
      media_complete: isComplete,
      missing_media: missingTypes,
      all_media: allListingMedia
    });
  } catch (error) {
    console.error('[Listings] POST /:id/media error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/listings/:id/media — Retrieve all media for a listing ──
router.get('/:id/media', async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const { version } = req.query;
    const where = { listing_id: listing.id };
    if (version) where.version = parseInt(version);

    const media = await ListingMedia.findAll({
      where,
      order: [['createdAt', 'ASC']]
    });

    res.json({
      listing_id: listing.id,
      media_complete: listing.media_complete,
      media
    });
  } catch (error) {
    console.error('[Listings] GET /:id/media error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/listings/:id — Edit listing ──
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to edit this listing' });
    }

    if (['deal_pending', 'sold'].includes(listing.status)) {
      return res.status(400).json({ error: 'Cannot modify a listing that has an active or completed deal' });
    }

    const {
      title,
      description,
      category,
      condition,
      weight_kg,
      quantity,
      asking_price,
      is_negotiable,
      pickup_address,
      approx_location
    } = req.body;

    if (title) listing.title = title.trim();
    if (description !== undefined) listing.description = description.trim();
    if (category) listing.category = category.trim();
    if (condition) listing.condition = condition;
    if (weight_kg !== undefined) listing.weight_kg = parseFloat(weight_kg);
    if (quantity !== undefined) listing.quantity = parseInt(quantity);
    if (asking_price !== undefined) listing.asking_price = parseFloat(asking_price);
    if (is_negotiable !== undefined) listing.is_negotiable = is_negotiable;
    if (pickup_address) listing.pickup_address = pickup_address.trim();
    if (approx_location) listing.approx_location = approx_location.trim();

    await listing.save();
    res.json({ message: 'Listing updated', listing });
  } catch (error) {
    console.error('[Listings] PUT /:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/listings/:id/status — Pause, resume, or cancel ──
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this listing' });
    }

    const { status } = req.body;
    if (!['active', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    if (status === 'active' && !listing.media_complete) {
      return res.status(400).json({
        error: 'Cannot publish listing to active status. All 4 required media items (AI image, 2 photos, 1 video) must be uploaded first.'
      });
    }

    if (listing.status === 'sold') {
      return res.status(400).json({ error: 'Sold listings cannot change status' });
    }

    listing.status = status;
    await listing.save();
    res.json({ message: `Listing status updated to ${status}`, listing });
  } catch (error) {
    console.error('[Listings] PUT /:id/status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
