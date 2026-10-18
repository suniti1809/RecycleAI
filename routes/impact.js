const express = require('express');
const { Transaction, Listing, Booking, User, sequelize } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/impact — Global platform & personal impact analytics ──
router.get('/', async (req, res) => {
  try {
    // 1. Fetch completed marketplace transactions
    const completedTransactions = await Transaction.findAll({
      where: { status: 'completed' },
      include: [{ model: Listing, as: 'listing' }]
    });

    // 2. Fetch completed legacy bookings (preserved from existing system)
    const completedBookings = await Booking.findAll({
      where: { status: 'completed' }
    });

    let totalWeightKg = 0;
    let totalValueInr = 0;
    let totalUnits = 0;
    let totalCo2SavedKg = 0;
    const categoryBreakdown = {};

    completedTransactions.forEach(tx => {
      const weight = parseFloat(tx.verified_weight_kg || tx.agreed_weight_kg || 1.0);
      const value = parseFloat(tx.agreed_price || 0.0);
      const units = parseInt(tx.agreed_quantity || 1);
      const co2 = parseFloat(tx.co2_saved_kg || (weight * 2.4).toFixed(2));
      const cat = tx.listing ? tx.listing.category : 'ELECTRONIC_COMPONENT';

      totalWeightKg += weight;
      totalValueInr += value;
      totalUnits += units;
      totalCo2SavedKg += co2;

      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + weight;
    });

    completedBookings.forEach(bk => {
      const weight = parseFloat(bk.item_quantity || 1.0) * 1.5;
      const value = parseFloat(bk.estimated_value || 0.0);
      const units = parseInt(bk.item_quantity || 1);
      const co2 = parseFloat(((value / 1000) * 2.4).toFixed(1)) || (weight * 2.4);
      const cat = bk.item_category || 'ELECTRONIC_COMPONENT';

      totalWeightKg += weight;
      totalValueInr += value;
      totalUnits += units;
      totalCo2SavedKg += co2;

      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + weight;
    });

    const totalDeals = completedTransactions.length + completedBookings.length;
    const treesEquivalent = parseFloat((totalCo2SavedKg / 21.7).toFixed(1)); // 1 tree absorbs ~21.7kg CO2/year

    // 3. User personal impact if authenticated
    let personalImpact = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        if (decoded && decoded.id) {
          const userTx = completedTransactions.filter(
            t => t.seller_id === decoded.id || t.buyer_id === decoded.id
          );
          const userBk = completedBookings.filter(
            b => b.user_id === decoded.id || b.recycler_id === decoded.id
          );

          let userWeight = 0;
          let userValue = 0;
          let userCo2 = 0;

          userTx.forEach(t => {
            const w = parseFloat(t.verified_weight_kg || t.agreed_weight_kg || 1.0);
            userWeight += w;
            userValue += parseFloat(t.agreed_price || 0);
            userCo2 += parseFloat(t.co2_saved_kg || (w * 2.4).toFixed(2));
          });

          userBk.forEach(b => {
            const w = parseFloat(b.item_quantity || 1.0) * 1.5;
            userWeight += w;
            userValue += parseFloat(b.estimated_value || 0);
            userCo2 += parseFloat(((b.estimated_value / 1000) * 2.4).toFixed(1)) || (w * 2.4);
          });

          personalImpact = {
            completed_deals: userTx.length + userBk.length,
            weight_diverted_kg: parseFloat(userWeight.toFixed(1)),
            total_value_inr: Math.round(userValue),
            co2_emissions_avoided_kg: parseFloat(userCo2.toFixed(1)),
            trees_equivalent: parseFloat((userCo2 / 21.7).toFixed(1))
          };
        }
      } catch (e) {}
    }

    res.json({
      metrics: {
        total_completed_transactions: totalDeals,
        total_weight_diverted_kg: parseFloat(totalWeightKg.toFixed(1)),
        total_payout_generated_inr: Math.round(totalValueInr),
        total_units_recycled: totalUnits,
        total_co2_avoided_kg: parseFloat(totalCo2SavedKg.toFixed(1)),
        trees_planted_equivalent: treesEquivalent,
        carbon_factor_note: 'Based on EPA and UNEP WEEE Lifecycle Analysis factors (~2.4 kg CO2e emissions avoided per kg electronic waste diverted from landfill).'
      },
      category_breakdown: categoryBreakdown,
      personal_impact: personalImpact
    });
  } catch (error) {
    console.error('[Impact] GET / error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
