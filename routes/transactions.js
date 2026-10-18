const express = require('express');
const { Transaction, Listing, ListingMedia, Offer, User, Notification, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ── GET /api/transactions — Get all user's transactions ──
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { seller_id: req.user.id },
          { buyer_id: req.user.id }
        ]
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Listing,
          as: 'listing',
          include: [{ model: ListingMedia, as: 'media' }]
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'phone', 'email']
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'phone', 'email', 'verified']
        }
      ]
    });

    const safeTx = transactions.map(t => t.toJSON());

    res.json({ transactions: safeTx, count: safeTx.length });
  } catch (error) {
    console.error('[Transactions] GET / error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/transactions/:id — Single transaction details ──
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [
        { model: Listing, as: 'listing', include: [{ model: ListingMedia, as: 'media' }] },
        { model: Offer, as: 'offer' },
        { model: User, as: 'seller', attributes: ['id', 'name', 'phone', 'email', 'rating'] },
        { model: User, as: 'buyer', attributes: ['id', 'name', 'phone', 'email', 'rating', 'verified'] }
      ]
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    if (transaction.seller_id !== req.user.id && transaction.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this transaction' });
    }

    res.json({ transaction: transaction.toJSON() });
  } catch (error) {
    console.error('[Transactions] GET /:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/transactions/:id/schedule-pickup — Schedule or update pickup date & time ──
router.post('/:id/schedule-pickup', async (req, res) => {
  try {
    const { pickup_date, pickup_time_slot, notes } = req.body;

    if (!pickup_date) {
      return res.status(400).json({ error: 'pickup_date is required' });
    }

    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{ model: Listing, as: 'listing' }]
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    if (transaction.seller_id !== req.user.id && transaction.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (['completed', 'cancelled'].includes(transaction.status)) {
      return res.status(400).json({ error: `Cannot schedule pickup for transaction in ${transaction.status} status` });
    }

    transaction.pickup_date = pickup_date;
    transaction.pickup_time_slot = pickup_time_slot || 'Morning (10:00 AM - 1:00 PM)';
    transaction.status = 'pickup_scheduled';
    if (notes) transaction.notes = notes;
    await transaction.save();

    // Notify the other party
    const otherUserId = req.user.id === transaction.seller_id ? transaction.buyer_id : transaction.seller_id;
    await Notification.create({
      user_id: otherUserId,
      title: 'Pickup Scheduled 🚚',
      message: `Doorstep pickup for "${transaction.listing?.title}" scheduled on ${pickup_date} (${transaction.pickup_time_slot}).`,
      type: 'pickup',
      link: `/bookings`
    });

    res.json({ message: 'Pickup scheduled successfully', transaction });
  } catch (error) {
    console.error('[Transactions] POST /:id/schedule-pickup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/transactions/:id/verify-handover & complete-handover — Recycler confirms pickup to complete deal (No OTP needed) ──
router.post(['/:id/verify-handover', '/:id/complete-handover'], async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { verified_weight_kg } = req.body;

    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{ model: Listing, as: 'listing' }],
      transaction: t,
      lock: true
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Only buyer/recycler conducts physical handover verification
    if (transaction.buyer_id !== req.user.id && req.user.role !== 'admin') {
      await t.rollback();
      return res.status(403).json({ error: 'Only the authorized recycler / buyer can confirm the handover' });
    }

    if (transaction.status === 'completed') {
      await t.rollback();
      return res.status(400).json({ error: 'This transaction is already completed' });
    }

    // Weight and CO2 calculations
    const finalWeight = verified_weight_kg ? parseFloat(verified_weight_kg) : transaction.agreed_weight_kg;
    // Standard industry lifecycle factor: ~2.4 kg CO2e emissions avoided per kg e-waste diverted from landfill
    const calculatedCo2 = parseFloat((finalWeight * 2.4).toFixed(2));

    transaction.status = 'completed';
    transaction.verified_weight_kg = finalWeight;
    transaction.co2_saved_kg = calculatedCo2;
    transaction.completed_at = new Date();
    await transaction.save({ transaction: t });

    // Mark listing as permanently sold
    if (transaction.listing) {
      transaction.listing.status = 'sold';
      await transaction.listing.save({ transaction: t });
    }

    // Notify both parties
    await Notification.create({
      user_id: transaction.seller_id,
      title: 'Recycling Completed! 🎉',
      message: `Pickup confirmed for "${transaction.listing?.title}". You earned ₹${transaction.agreed_price.toLocaleString('en-IN')} and saved ${calculatedCo2} kg of CO₂!`,
      type: 'completed',
      link: `/bookings`
    }, { transaction: t });

    await Notification.create({
      user_id: transaction.buyer_id,
      title: 'Handover Completed! 🚚',
      message: `Pickup for "${transaction.listing?.title}" confirmed and completed successfully.`,
      type: 'completed',
      link: `/bookings`
    }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Handover confirmed and transaction completed successfully! 🎉',
      transaction,
      co2_saved_kg: calculatedCo2
    });
  } catch (error) {
    await t.rollback();
    console.error('[Transactions] POST /:id/verify-handover error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/transactions/:id/cancel — Cancel transaction ──
router.post('/:id/cancel', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findByPk(req.params.id, {
      include: [{ model: Listing, as: 'listing' }, { model: Offer, as: 'offer' }],
      transaction: t,
      lock: true
    });

    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.seller_id !== req.user.id && transaction.buyer_id !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ error: 'Unauthorized to cancel this transaction' });
    }

    if (['completed', 'cancelled'].includes(transaction.status)) {
      await t.rollback();
      return res.status(400).json({ error: `Cannot cancel transaction in ${transaction.status} state` });
    }

    transaction.status = 'cancelled';
    transaction.notes = reason ? `Cancelled: ${reason}` : 'Cancelled by user';
    await transaction.save({ transaction: t });

    // Release listing back to active
    if (transaction.listing) {
      transaction.listing.status = 'active';
      await transaction.listing.save({ transaction: t });
    }

    if (transaction.offer) {
      transaction.offer.status = 'closed';
      await transaction.offer.save({ transaction: t });
    }

    // Notify other party
    const otherUserId = req.user.id === transaction.seller_id ? transaction.buyer_id : transaction.seller_id;
    await Notification.create({
      user_id: otherUserId,
      title: 'Deal Cancelled',
      message: `The transaction for "${transaction.listing?.title}" was cancelled (${reason || 'No reason provided'}).`,
      type: 'general',
      link: `/bookings`
    }, { transaction: t });

    await t.commit();

    res.json({ message: 'Transaction cancelled and listing reactivated', transaction });
  } catch (error) {
    await t.rollback();
    console.error('[Transactions] POST /:id/cancel error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
