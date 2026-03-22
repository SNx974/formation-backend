const express = require('express');
const { query } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/my-formations', auth, async (req, res) => {
  const result = await query(`
    SELECT f.*, e.progress, e.completed, e.enrolled_at,
      ROUND(AVG(r.rating)::numeric, 1) as avg_rating
    FROM enrollments e
    JOIN formations f ON f.id = e.formation_id
    LEFT JOIN ratings r ON r.formation_id = f.id
    WHERE e.user_id = $1
    GROUP BY f.id, e.progress, e.completed, e.enrolled_at
    ORDER BY e.enrolled_at DESC
  `, [req.user.id]);
  res.json(result.rows);
});

router.get('/certificates', auth, async (req, res) => {
  const result = await query(`
    SELECT c.*, f.title as formation_title, f.instructor
    FROM certificates c
    JOIN formations f ON f.id = c.formation_id
    WHERE c.user_id = $1 ORDER BY c.issued_at DESC
  `, [req.user.id]);
  res.json(result.rows);
});

router.get('/enrolled/:formationId', auth, async (req, res) => {
  const result = await query(
    'SELECT * FROM enrollments WHERE user_id = $1 AND formation_id = $2',
    [req.user.id, req.params.formationId]
  );
  res.json(result.rows[0] || null);
});

router.get('/stats', auth, async (req, res) => {
  const [total, completed, certs, avgProgress] = await Promise.all([
    query('SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1', [req.user.id]),
    query('SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1 AND completed = 1', [req.user.id]),
    query('SELECT COUNT(*) as count FROM certificates WHERE user_id = $1', [req.user.id]),
    query('SELECT AVG(progress) as avg FROM enrollments WHERE user_id = $1', [req.user.id]),
  ]);
  res.json({
    total: parseInt(total.rows[0].count),
    completed: parseInt(completed.rows[0].count),
    certificates: parseInt(certs.rows[0].count),
    avgProgress: Math.round(parseFloat(avgProgress.rows[0].avg) || 0)
  });
});

module.exports = router;
