const express = require('express');
const { Booking } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const where = { user_id: req.user.id };
    if (status) where.status = status;
    
    const bookings = await Booking.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ bookings, total: bookings.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { item_type, address, pickup_date, estimated_value, condition, notes } = req.body;
    
    if (!item_type || !address || !pickup_date) {
      return res.status(400).json({ error: 'item_type, address, and pickup_date are required' });
    }

    const booking = await Booking.create({
      user_id: req.user.id,
      item_name: item_type,
      item_category: item_type,
      item_condition: condition || 'good',
      estimated_value: estimated_value || 0.0,
      pickup_address: address,
      pickup_date: pickup_date,
      notes: notes
    });

    res.status(201).json({ message: 'Booking created', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const bookings = await Booking.findAll({ where: { user_id: req.user.id } });
    const stats = {
      total: bookings.length,
      pending: 0,
      confirmed: 0,
      picked_up: 0,
      completed: 0,
      cancelled: 0,
      total_value: 0,
      co2_saved: 0
    };

    bookings.forEach(b => {
      stats[b.status] = (stats[b.status] || 0) + 1;
      if (b.status === 'completed') {
        stats.total_value += (b.estimated_value || 0);
        stats.co2_saved += parseFloat((((b.estimated_value || 0) / 1000) * 2.4).toFixed(1));
      }
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recycler stats
router.get('/recycler-stats', async (req, res) => {
  try {
    if (req.user.role !== 'recycler') return res.status(403).json({ error: 'Recycler access required' });

    const { Op } = require('sequelize');
    const allJobs = await Booking.findAll({ where: { recycler_id: req.user.id } });

    const stats = {
      total_jobs: allJobs.length,
      completed_jobs: 0,
      active_jobs: 0,
      total_earnings: 0,
      pending_payout: 0,
    };

    allJobs.forEach(b => {
      if (b.status === 'completed') {
        stats.completed_jobs += 1;
        stats.total_earnings += parseFloat(b.estimated_value || 0);
      } else if (['confirmed', 'picked_up'].includes(b.status)) {
        stats.active_jobs += 1;
        stats.pending_payout += parseFloat(b.estimated_value || 0);
      }
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recycler routes
router.get('/all', async (req, res) => {
  try {
    if (req.user.role !== 'recycler') return res.status(403).json({ error: 'Recycler access required' });
    
    const { status } = req.query;
    let where = {};
    if (status === 'pending') {
      where = { status: 'pending' };
    } else if (status === 'my_jobs') {
      where = { recycler_id: req.user.id };
    } else if (status) {
      where = { status, recycler_id: req.user.id };
    }

    const bookings = await Booking.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json({ bookings, total: bookings.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    if (req.user.role === 'recycler' && !booking.recycler_id) {
      booking.recycler_id = req.user.id;
    }

    booking.status = status;
    await booking.save();
    res.json({ message: `Status updated to ${status}`, booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (['picked_up', 'completed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot cancel a booking that is already picked up' });
    }

    booking.status = 'cancelled';
    await booking.save();
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
