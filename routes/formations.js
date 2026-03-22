const express = require('express');
const { query } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all formations
router.get('/', async (req, res) => {
  const { category, level, search } = req.query;
  let sql = `
    SELECT f.*,
      ROUND(AVG(r.rating)::numeric, 1) as avg_rating,
      COUNT(DISTINCT r.id) as rating_count,
      COUNT(DISTINCT e.id) as enrollment_count
    FROM formations f
    LEFT JOIN ratings r ON r.formation_id = f.id
    LEFT JOIN enrollments e ON e.formation_id = f.id
    WHERE f.is_published = 1
  `;
  const params = [];
  let i = 1;

  if (category) { sql += ` AND f.category = $${i++}`; params.push(category); }
  if (level) { sql += ` AND f.level = $${i++}`; params.push(level); }
  if (search) { sql += ` AND (f.title ILIKE $${i} OR f.short_description ILIKE $${i++})`; params.push(`%${search}%`); }

  sql += ' GROUP BY f.id ORDER BY f.created_at DESC';
  const result = await query(sql, params);
  res.json(result.rows);
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  const result = await query('SELECT DISTINCT category FROM formations WHERE is_published = 1 AND category IS NOT NULL');
  res.json(result.rows.map(r => r.category));
});

// Get single formation with modules and videos
router.get('/:id', async (req, res) => {
  const fResult = await query(`
    SELECT f.*,
      ROUND(AVG(r.rating)::numeric, 1) as avg_rating,
      COUNT(DISTINCT r.id) as rating_count,
      COUNT(DISTINCT e.id) as enrollment_count
    FROM formations f
    LEFT JOIN ratings r ON r.formation_id = f.id
    LEFT JOIN enrollments e ON e.formation_id = f.id
    WHERE f.id = $1 AND f.is_published = 1
    GROUP BY f.id
  `, [req.params.id]);

  if (!fResult.rows.length) return res.status(404).json({ message: 'Formation non trouvée' });
  const formation = fResult.rows[0];

  const modResult = await query('SELECT * FROM modules WHERE formation_id = $1 ORDER BY order_num', [req.params.id]);
  const modules = modResult.rows;

  for (const mod of modules) {
    const vResult = await query('SELECT * FROM videos WHERE module_id = $1 ORDER BY order_num', [mod.id]);
    mod.videos = vResult.rows;
  }

  const reviewResult = await query(`
    SELECT r.*, u.name as user_name FROM ratings r
    JOIN users u ON u.id = r.user_id
    WHERE r.formation_id = $1 ORDER BY r.created_at DESC LIMIT 10
  `, [req.params.id]);

  res.json({ ...formation, modules, reviews: reviewResult.rows });
});

// Enroll
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    await query(
      'INSERT INTO enrollments (user_id, formation_id) VALUES ($1, $2)',
      [req.user.id, req.params.id]
    );
    res.status(201).json({ message: 'Inscription réussie' });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Déjà inscrit' });
    throw e;
  }
});

// Update progress
router.put('/:id/progress', auth, async (req, res) => {
  const { progress } = req.body;
  await query(
    'UPDATE enrollments SET progress = $1, completed = $2 WHERE user_id = $3 AND formation_id = $4',
    [progress, progress >= 100 ? 1 : 0, req.user.id, req.params.id]
  );
  if (progress >= 100) {
    const code = `CERT-${Date.now()}-${req.user.id}`;
    await query(
      'INSERT INTO certificates (user_id, formation_id, certificate_code) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id, code]
    );
  }
  res.json({ message: 'Progression mise à jour' });
});

// Rate
router.post('/:id/rate', auth, async (req, res) => {
  const { rating, comment } = req.body;
  if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Note entre 1 et 5' });
  await query(`
    INSERT INTO ratings (user_id, formation_id, rating, comment)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, formation_id) DO UPDATE SET rating = $3, comment = $4
  `, [req.user.id, req.params.id, rating, comment]);
  res.json({ message: 'Avis enregistré' });
});

module.exports = router;
