const express = require('express');
const { query } = require('../database');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();
router.use(auth, admin);

// ── STATS ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const [users, formations, enrollments, revenue] = await Promise.all([
    query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']),
    query('SELECT COUNT(*) as count FROM formations'),
    query('SELECT COUNT(*) as count FROM enrollments'),
    query('SELECT SUM(f.price) as total FROM enrollments e JOIN formations f ON f.id = e.formation_id'),
  ]);
  res.json({
    users: parseInt(users.rows[0].count),
    formations: parseInt(formations.rows[0].count),
    enrollments: parseInt(enrollments.rows[0].count),
    revenue: parseFloat(revenue.rows[0].total) || 0
  });
});

// ── FORMATIONS ────────────────────────────────────────────────
router.get('/formations', async (req, res) => {
  const result = await query(`
    SELECT f.*, COUNT(DISTINCT e.id) as enrollment_count
    FROM formations f
    LEFT JOIN enrollments e ON e.formation_id = f.id
    GROUP BY f.id ORDER BY f.created_at DESC
  `);
  res.json(result.rows);
});

router.post('/formations', async (req, res) => {
  const { title, description, short_description, category, level, price, image_url, instructor, instructor_bio, duration } = req.body;
  const result = await query(`
    INSERT INTO formations (title, description, short_description, category, level, price, image_url, instructor, instructor_bio, duration)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id
  `, [title, description, short_description, category, level, price || 0, image_url, instructor, instructor_bio, duration]);
  res.status(201).json({ id: result.rows[0].id, message: 'Formation créée' });
});

router.put('/formations/:id', async (req, res) => {
  const { title, description, short_description, category, level, price, image_url, instructor, instructor_bio, duration, is_published } = req.body;
  await query(`
    UPDATE formations SET title=$1, description=$2, short_description=$3, category=$4, level=$5,
    price=$6, image_url=$7, instructor=$8, instructor_bio=$9, duration=$10, is_published=$11 WHERE id=$12
  `, [title, description, short_description, category, level, price, image_url, instructor, instructor_bio, duration, is_published, req.params.id]);
  res.json({ message: 'Formation mise à jour' });
});

router.delete('/formations/:id', async (req, res) => {
  await query('DELETE FROM formations WHERE id = $1', [req.params.id]);
  res.json({ message: 'Formation supprimée' });
});

// ── MODULES ───────────────────────────────────────────────────
router.get('/formations/:id/modules', async (req, res) => {
  const modResult = await query('SELECT * FROM modules WHERE formation_id = $1 ORDER BY order_num', [req.params.id]);
  const modules = modResult.rows;
  for (const mod of modules) {
    const vResult = await query('SELECT * FROM videos WHERE module_id = $1 ORDER BY order_num', [mod.id]);
    mod.videos = vResult.rows;
  }
  res.json(modules);
});

router.post('/formations/:id/modules', async (req, res) => {
  const { title, description, order_num } = req.body;
  const result = await query(
    'INSERT INTO modules (formation_id, title, description, order_num) VALUES ($1,$2,$3,$4) RETURNING id',
    [req.params.id, title, description, order_num || 0]
  );
  res.status(201).json({ id: result.rows[0].id });
});

router.put('/modules/:id', async (req, res) => {
  const { title, description, order_num } = req.body;
  await query('UPDATE modules SET title=$1, description=$2, order_num=$3 WHERE id=$4', [title, description, order_num, req.params.id]);
  res.json({ message: 'Module mis à jour' });
});

router.delete('/modules/:id', async (req, res) => {
  await query('DELETE FROM modules WHERE id = $1', [req.params.id]);
  res.json({ message: 'Module supprimé' });
});

// ── VIDEOS ────────────────────────────────────────────────────
router.post('/modules/:moduleId/videos', async (req, res) => {
  const { title, description, duration, url, order_num } = req.body;
  const result = await query(
    'INSERT INTO videos (module_id, title, description, duration, url, order_num) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [req.params.moduleId, title, description, duration, url, order_num || 0]
  );
  res.status(201).json({ id: result.rows[0].id });
});

router.put('/videos/:id', async (req, res) => {
  const { title, description, duration, url, order_num } = req.body;
  await query('UPDATE videos SET title=$1, description=$2, duration=$3, url=$4, order_num=$5 WHERE id=$6',
    [title, description, duration, url, order_num, req.params.id]);
  res.json({ message: 'Vidéo mise à jour' });
});

router.delete('/videos/:id', async (req, res) => {
  await query('DELETE FROM videos WHERE id = $1', [req.params.id]);
  res.json({ message: 'Vidéo supprimée' });
});

// ── USERS ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const result = await query(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
      COUNT(e.id) as enrollment_count
    FROM users u
    LEFT JOIN enrollments e ON e.user_id = u.id
    GROUP BY u.id ORDER BY u.created_at DESC
  `);
  res.json(result.rows);
});

router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Rôle invalide' });
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
  res.json({ message: 'Rôle mis à jour' });
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ message: 'Impossible de se supprimer soi-même' });
  await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'Utilisateur supprimé' });
});

// ── ENROLLMENTS ───────────────────────────────────────────────
router.get('/enrollments', async (req, res) => {
  const result = await query(`
    SELECT e.*, u.name as user_name, u.email as user_email, f.title as formation_title
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    JOIN formations f ON f.id = e.formation_id
    ORDER BY e.enrolled_at DESC
  `);
  res.json(result.rows);
});

module.exports = router;
