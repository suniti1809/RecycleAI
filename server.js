require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { runSafeMigrations } = require('./utils/migrate');

const authRoutes = require('./routes/auth');
const bookingsRoutes = require('./routes/bookings');
const classifyRoutes = require('./routes/classify');
const valuationRoutes = require('./routes/valuation');
const listingsRoutes = require('./routes/listings');
const offersRoutes = require('./routes/offers');
const transactionsRoutes = require('./routes/transactions');
const recyclersRoutes = require('./routes/recyclers');
const notificationsRoutes = require('./routes/notifications');
const impactRoutes = require('./routes/impact');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Core & Marketplace Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/classify', classifyRoutes);
app.use('/api/valuation', valuationRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/recyclers', recyclersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/impact', impactRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Recycle AI API is running (Node.js)',
    supabase: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString()
  });
});

// Global JSON error handling middleware (prevents unparsed HTML 500 responses)
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err.name || 'Error', err.message);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error (${err.code}): ${err.message}${err.field ? ' in field ' + err.field : ''}` });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server & Sync DB
sequelize.sync().then(async () => {
  await runSafeMigrations().catch(e => console.warn('[Migration] Note:', e.message));
  console.log('Database synced successfully');
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`  ♻️  Recycle AI — Node.js & Supabase Backend API`);
    console.log(`  URL   : http://127.0.0.1:${PORT}`);
    console.log(`  Health: http://127.0.0.1:${PORT}/api/health`);
    console.log(`========================================================`);
  });
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
