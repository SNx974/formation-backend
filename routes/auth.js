const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Tous les champs sont requis' });

  const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (exists.rows.length) return res.status(409).json({ message: 'Email déjà utilisé' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = await query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
    [name, email, hashed]
  );
  const id = result.rows[0].id;

  const token = jwt.sign({ id, email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id, name, email, role: 'user' } });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ message: 'Identifiants incorrects' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Identifiants incorrects' });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Get current user
router.get('/me', auth, async (req, res) => {
  const result = await query('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows.length) return res.status(404).json({ message: 'Utilisateur non trouvé' });
  res.json(result.rows[0]);
});

// Update profile
router.put('/me', auth, async (req, res) => {
  const { name, avatar } = req.body;
  await query('UPDATE users SET name = $1, avatar = $2 WHERE id = $3', [name, avatar, req.user.id]);
  res.json({ message: 'Profil mis à jour' });
});

module.exports = router;
