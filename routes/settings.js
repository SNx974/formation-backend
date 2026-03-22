const express = require('express');
const { query } = require('../database');

const router = express.Router();

// Public: get site settings
router.get('/', async (req, res) => {
  const result = await query('SELECT key, value FROM site_settings');
  const settings = {};
  result.rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

module.exports = router;
