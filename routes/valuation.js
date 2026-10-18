const express = require('express');
const { getPrice } = require('../utils/pricer');

const router = express.Router();

router.get('/estimate', (req, res) => {
  const { item_type, condition } = req.query;
  
  if (!item_type) {
    return res.status(400).json({ error: 'item_type is required' });
  }

  const valuation = getPrice(item_type, condition || 'good');
  res.json(valuation);
});

module.exports = router;
