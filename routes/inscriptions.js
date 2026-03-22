const express = require('express');
const { query } = require('../database');

const router = express.Router();

// Public: submit inscription request
router.post('/', async (req, res) => {
  const { formation_id, formation_title, nom, prenom, email, telephone, niveau_etude, situation_pro, message } = req.body;
  if (!nom || !prenom || !email) return res.status(400).json({ message: 'Nom, prénom et email requis' });

  await query(`
    INSERT INTO inscription_requests (formation_id, formation_title, nom, prenom, email, telephone, niveau_etude, situation_pro, message)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `, [formation_id || null, formation_title || null, nom, prenom, email, telephone, niveau_etude, situation_pro, message]);

  res.status(201).json({ message: 'Demande envoyée avec succès' });
});

module.exports = router;
