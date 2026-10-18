const express = require('express');
const { RecyclerProfile, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Calculate distance between two lat/lng pairs in kilometers (Haversine formula)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// ── GET /api/recyclers/nearby — Discover nearby recyclers with category matching ──
router.get('/nearby', async (req, res) => {
  try {
    const {
      lat,
      lng,
      category,
      radius = 50, // default 50 km radius
      city
    } = req.query;

    const userLat = lat ? parseFloat(lat) : 25.4358; // Default Prayagraj coordinates if not provided
    const userLng = lng ? parseFloat(lng) : 81.8463;
    const maxRadius = parseFloat(radius);

    const profiles = await RecyclerProfile.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'email', 'rating', 'verified']
        }
      ]
    });

    const results = [];

    for (const p of profiles) {
      let acceptedCats = [];
      try {
        acceptedCats = typeof p.accepted_categories === 'string' ? JSON.parse(p.accepted_categories) : (p.accepted_categories || []);
      } catch (e) {
        acceptedCats = [];
      }

      // Check category match if category filter supplied
      let matchesCategory = true;
      if (category && category !== 'all') {
        matchesCategory = acceptedCats.includes(category);
      }

      // Calculate distance if coordinates available
      const distance = (p.latitude && p.longitude)
        ? calculateDistance(userLat, userLng, p.latitude, p.longitude)
        : null;

      // Filter by radius if distance available and radius supplied
      if (distance !== null && distance > maxRadius && !city) {
        continue;
      }

      results.push({
        id: p.id,
        user_id: p.user_id,
        business_name: p.business_name,
        license_number: p.license_number,
        facility_address: p.facility_address,
        address: p.facility_address,
        service_city: p.service_city,
        service_radius_km: p.service_radius_km,
        latitude: p.latitude,
        longitude: p.longitude,
        distance_km: distance,
        verification_status: p.verification_status,
        is_verified_recycleai: p.verification_status === 'verified',
        accepted_categories: acceptedCats,
        matches_category: matchesCategory,
        capacity_tons_month: p.capacity_tons_month,
        years_operating: p.years_operating,
        contact_phone: p.contact_phone,
        contact_email: p.contact_email,
        rating: p.user ? p.user.rating : 5.0,
        source: 'RecycleAI Verified Database'
      });
    }

    // Sort by: Category Match first, then by distance
    results.sort((a, b) => {
      if (a.matches_category !== b.matches_category) {
        return a.matches_category ? -1 : 1;
      }
      return (a.distance_km || 9999) - (b.distance_km || 9999);
    });

    res.json({
      recyclers: results,
      total: results.length,
      searched_category: category || 'all',
      center_coords: { lat: userLat, lng: userLng }
    });
  } catch (error) {
    console.error('[Recyclers] GET /nearby error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/recyclers/:id — Recycler profile details ──
router.get('/:id', async (req, res) => {
  try {
    const profile = await RecyclerProfile.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'phone', 'email', 'rating', 'verified']
        }
      ]
    });

    if (!profile) return res.status(404).json({ error: 'Recycler profile not found' });
    res.json({ profile });
  } catch (error) {
    console.error('[Recyclers] GET /:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/recyclers/profile — Update recycler business profile ──
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'recycler') {
      return res.status(403).json({ error: 'Recycler privileges required' });
    }

    let profile = await RecyclerProfile.findOne({ where: { user_id: req.user.id } });
    const {
      business_name,
      license_number,
      accepted_categories,
      service_city,
      service_radius_km,
      facility_address,
      latitude,
      longitude,
      contact_phone,
      contact_email
    } = req.body;

    const data = {
      business_name: business_name || req.user.name,
      license_number,
      accepted_categories: Array.isArray(accepted_categories) ? JSON.stringify(accepted_categories) : accepted_categories,
      service_city,
      service_radius_km: service_radius_km ? parseFloat(service_radius_km) : 30.0,
      facility_address,
      latitude: latitude ? parseFloat(latitude) : 25.4358,
      longitude: longitude ? parseFloat(longitude) : 81.8463,
      contact_phone,
      contact_email
    };

    if (profile) {
      await profile.update(data);
    } else {
      profile = await RecyclerProfile.create({
        user_id: req.user.id,
        ...data,
        verification_status: 'pending'
      });
    }

    res.json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error('[Recyclers] PUT /profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
