const express = require('express');
const { Notification } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ── GET /api/notifications — Get all user notifications ──
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      notifications,
      unread_count: unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error('[Notifications] GET / error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/notifications/:id/read — Mark single notification as read ──
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    notification.is_read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('[Notifications] PUT /:id/read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/notifications/read-all — Mark all user notifications as read ──
router.put('/read-all', async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[Notifications] PUT /read-all error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
