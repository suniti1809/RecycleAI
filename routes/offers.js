const express = require('express');
const { Listing, ListingMedia, Offer, NegotiationMessage, Transaction, Notification, User, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ── POST /api/offers — Buyer submits initial offer on a listing ──
router.post('/', async (req, res) => {
  try {
    const { listing_id, offered_price, quantity = 1, pickup_proposal, message } = req.body;

    if (!listing_id || !offered_price) {
      return res.status(400).json({ error: 'listing_id and offered_price are required' });
    }

    const price = parseFloat(offered_price);
    const qty = parseInt(quantity);
    if (price <= 0 || qty <= 0) {
      return res.status(400).json({ error: 'Offered price and quantity must be greater than zero' });
    }

    const listing = await Listing.findByPk(listing_id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.status !== 'active' || listing.media_complete === false) {
      return res.status(400).json({
        error: 'This listing is not currently accepting offers (listing media incomplete or not active)'
      });
    }

    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot make an offer on your own listing' });
    }

    if (req.user.role !== 'recycler') {
      return res.status(403).json({
        error: 'Only registered Recycler / Collector accounts can submit purchase offers on e-waste listings. Sellers cannot bid on scrap.'
      });
    }

    if (qty > listing.quantity) {
      return res.status(400).json({ error: `Offered quantity (${qty}) exceeds available quantity (${listing.quantity})` });
    }

    // Check if buyer already has an active offer on this listing
    let offer = await Offer.findOne({
      where: {
        listing_id,
        buyer_id: req.user.id,
        status: ['pending', 'countered']
      }
    });

    if (offer) {
      return res.status(400).json({ error: 'You already have an active negotiation on this listing. Use the negotiation thread to update your offer.' });
    }

    // Snapshot current listing media so buyer evaluates against this exact version
    const currentMedia = await ListingMedia.findAll({ where: { listing_id } });
    const snapshotJson = currentMedia.length > 0
      ? JSON.stringify(currentMedia.map(m => (m.toJSON ? m.toJSON() : m)))
      : null;

    // Create the new offer
    offer = await Offer.create({
      listing_id,
      buyer_id: req.user.id,
      offered_price: price,
      quantity: qty,
      status: 'pending',
      pickup_proposal: pickup_proposal || 'Doorstep collection as per seller convenience',
      initial_message: message || '',
      seller_counter_count: 0,
      last_counter_by: 'buyer',
      media_version_snapshot: snapshotJson
    });

    // Record initial message in negotiation thread
    if (message) {
      await NegotiationMessage.create({
        offer_id: offer.id,
        sender_id: req.user.id,
        sender_role: 'buyer',
        message: message.trim(),
        proposed_price: price,
        is_counter_offer: false
      });
    }

    // Notify the seller
    await Notification.create({
      user_id: listing.seller_id,
      title: 'New Offer Received!',
      message: `${req.user.name || 'A buyer'} offered ₹${price.toLocaleString('en-IN')} for "${listing.title}".`,
      type: 'offer',
      link: `/my-listings`
    });

    // Notify the buyer (confirmation of placed bid/deal offer)
    await Notification.create({
      user_id: req.user.id,
      title: 'Deal Bid Placed! 🎯',
      message: `Your deal offer of ₹${price.toLocaleString('en-IN')} for "${listing.title}" was submitted and is awaiting seller review.`,
      type: 'offer',
      link: `/negotiations/${offer.id}`
    });

    res.status(201).json({ message: 'Offer submitted successfully', offer });
  } catch (error) {
    console.error('[Offers] POST / error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/offers/listing/:listingId — Seller compares offers for a specific listing ──
router.get('/listing/:listingId', async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the seller can view all offers for this listing' });
    }

    const offers = await Offer.findAll({
      where: { listing_id: listing.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'phone', 'rating', 'verified']
        },
        {
          model: NegotiationMessage,
          as: 'messages',
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    res.json({ offers, count: offers.length });
  } catch (error) {
    console.error('[Offers] GET /listing/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/offers/my — Buyer views all offers they have made ──
router.get('/my', async (req, res) => {
  try {
    const offers = await Offer.findAll({
      where: { buyer_id: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Listing,
          as: 'listing',
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'name', 'rating', 'verified']
            }
          ]
        },
        {
          model: NegotiationMessage,
          as: 'messages',
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    res.json({ offers, count: offers.length });
  } catch (error) {
    console.error('[Offers] GET /my error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/offers/:id/thread — View private negotiation history ──
router.get('/:id/thread', async (req, res) => {
  try {
    const offer = await Offer.findByPk(req.params.id, {
      include: [
        {
          model: Listing,
          as: 'listing',
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'name', 'rating', 'verified']
            },
            {
              model: ListingMedia,
              as: 'media'
            }
          ]
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'rating', 'verified']
        },
        {
          model: NegotiationMessage,
          as: 'messages',
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'name']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    // Enforce privacy: ONLY the seller of the listing OR the buyer of this offer can see this thread!
    const isSeller = offer.listing.seller_id === req.user.id;
    const isBuyer = offer.buyer_id === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view this negotiation thread' });
    }

    let snapshotMedia = null;
    if (offer.media_version_snapshot) {
      try {
        snapshotMedia = typeof offer.media_version_snapshot === 'string'
          ? JSON.parse(offer.media_version_snapshot)
          : offer.media_version_snapshot;
      } catch (e) {}
    }

    res.json({
      offer,
      is_seller: isSeller,
      is_buyer: isBuyer,
      counter_offers_used: offer.seller_counter_count,
      max_counter_offers: 3,
      counter_offers_remaining: Math.max(0, 3 - offer.seller_counter_count),
      snapshot_media: snapshotMedia
    });
  } catch (error) {
    console.error('[Offers] GET /:id/thread error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/offers/:id/counter — Submit counter-offer (Enforces strict max 3 seller counter-offers) ──
router.post('/:id/counter', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { proposed_price, message } = req.body;

    if (!proposed_price || parseFloat(proposed_price) <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'A valid proposed price is required' });
    }

    const price = parseFloat(proposed_price);

    const offer = await Offer.findByPk(req.params.id, {
      include: [{ model: Listing, as: 'listing' }],
      transaction: t,
      lock: true
    });

    if (!offer) {
      await t.rollback();
      return res.status(404).json({ error: 'Offer not found' });
    }

    if (['accepted', 'rejected', 'closed'].includes(offer.status)) {
      await t.rollback();
      return res.status(400).json({ error: `Cannot counter an offer that is already ${offer.status}` });
    }

    const isSeller = offer.listing.seller_id === req.user.id;
    const isBuyer = offer.buyer_id === req.user.id;

    if (!isSeller && !isBuyer) {
      await t.rollback();
      return res.status(403).json({ error: 'Unauthorized to participate in this negotiation' });
    }

    // STRICT RULE: Maximum 3 seller counter-offers per buyer-listing negotiation
    if (isSeller) {
      if (offer.seller_counter_count >= 3) {
        await t.rollback();
        return res.status(400).json({
          error: 'Maximum limit of 3 seller counter-offers reached for this buyer. You may accept or reject the current offer.'
        });
      }
      offer.seller_counter_count += 1;
      offer.last_counter_by = 'seller';
    } else {
      // Buyer counter/response does NOT increment seller_counter_count
      offer.last_counter_by = 'buyer';
    }

    offer.offered_price = price;
    offer.status = 'countered';
    await offer.save({ transaction: t });

    // Record the message
    const newMsg = await NegotiationMessage.create({
      offer_id: offer.id,
      sender_id: req.user.id,
      sender_role: isSeller ? 'seller' : 'buyer',
      message: message ? message.trim() : `Proposed new price: ₹${price.toLocaleString('en-IN')}`,
      proposed_price: price,
      is_counter_offer: true
    }, { transaction: t });

    // Notify counterparty
    const recipientId = isSeller ? offer.buyer_id : offer.listing.seller_id;
    await Notification.create({
      user_id: recipientId,
      title: isSeller ? `Seller Counter-Offer (${offer.seller_counter_count}/3)` : 'Buyer Updated Offer',
      message: `${req.user.name} countered with ₹${price.toLocaleString('en-IN')} on "${offer.listing.title}".`,
      type: 'counter_offer',
      link: `/negotiations/${offer.id}`
    }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Counter-offer submitted successfully',
      offer,
      negotiation_message: newMsg,
      seller_counter_count: offer.seller_counter_count,
      remaining_seller_counters: Math.max(0, 3 - offer.seller_counter_count)
    });
  } catch (error) {
    await t.rollback();
    console.error('[Offers] POST /:id/counter error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/offers/:id/reject — Reject an offer ──
router.post('/:id/reject', async (req, res) => {
  try {
    const offer = await Offer.findByPk(req.params.id, {
      include: [{ model: Listing, as: 'listing' }]
    });

    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const isSeller = offer.listing.seller_id === req.user.id;
    const isBuyer = offer.buyer_id === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: 'Unauthorized to reject this offer' });
    }

    if (['accepted', 'rejected', 'closed'].includes(offer.status)) {
      return res.status(400).json({ error: `Offer is already ${offer.status}` });
    }

    offer.status = 'rejected';
    await offer.save();

    const recipientId = isSeller ? offer.buyer_id : offer.listing.seller_id;
    await Notification.create({
      user_id: recipientId,
      title: 'Offer Declined',
      message: `${req.user.name} declined the offer on "${offer.listing.title}".`,
      type: 'general',
      link: isSeller ? `/my-offers` : `/my-listings`
    });

    res.json({ message: 'Offer rejected', offer });
  } catch (error) {
    console.error('[Offers] POST /:id/reject error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/offers/:id/accept — Accept offer and atomically create deal transaction ──
router.post('/:id/accept', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const offer = await Offer.findByPk(req.params.id, {
      include: [{ model: Listing, as: 'listing' }],
      transaction: t,
      lock: true
    });

    if (!offer) {
      await t.rollback();
      return res.status(404).json({ error: 'Offer not found' });
    }

    const listing = offer.listing;
    const isSeller = listing.seller_id === req.user.id;
    const isBuyer = offer.buyer_id === req.user.id;

    // Both seller can accept buyer's offer, or buyer can accept seller's counter-offer
    if (!isSeller && !isBuyer) {
      await t.rollback();
      return res.status(403).json({ error: 'Unauthorized to accept this offer' });
    }

    if (['accepted', 'rejected', 'closed'].includes(offer.status)) {
      await t.rollback();
      return res.status(400).json({ error: `Offer is already ${offer.status}` });
    }

    if (listing.status === 'sold') {
      await t.rollback();
      return res.status(400).json({ error: 'This listing is already sold' });
    }

    // 1. Mark this offer as accepted
    offer.status = 'accepted';
    await offer.save({ transaction: t });

    // 2. Mark listing as deal_pending / sold
    listing.status = 'deal_pending';
    await listing.save({ transaction: t });

    // 3. Atomically close all competing active offers on this listing
    await Offer.update(
      { status: 'closed' },
      {
        where: {
          listing_id: listing.id,
          id: { [sequelize.Sequelize.Op.ne]: offer.id },
          status: ['pending', 'countered']
        },
        transaction: t
      }
    );

    // 4. Create Transaction record (without OTP requirement)
    const transaction = await Transaction.create({
      listing_id: listing.id,
      offer_id: offer.id,
      seller_id: listing.seller_id,
      buyer_id: offer.buyer_id,
      agreed_price: offer.offered_price,
      agreed_quantity: offer.quantity,
      agreed_weight_kg: listing.weight_kg,
      status: 'deal_accepted',
      authorized_pickup_address: listing.pickup_address,
      handover_otp: null,
      notes: `Deal accepted between ${req.user.name} and partner. Pickup ready for scheduling.`
    }, { transaction: t });

    // 5. Notify both seller and buyer
    await Notification.create({
      user_id: listing.seller_id,
      title: 'Deal Accepted! 🎉',
      message: `Deal confirmed for ₹${offer.offered_price.toLocaleString('en-IN')}. Doorstep pickup is ready for scheduling.`,
      type: 'deal_accepted',
      link: `/bookings`
    }, { transaction: t });

    await Notification.create({
      user_id: offer.buyer_id,
      title: 'Deal Accepted! 🎉',
      message: `Your deal for "${listing.title}" was accepted! Next step: Schedule doorstep pickup.`,
      type: 'deal_accepted',
      link: `/bookings`
    }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Deal accepted successfully! Transaction created.',
      offer,
      transaction
    });
  } catch (error) {
    await t.rollback();
    console.error('[Offers] POST /:id/accept error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
