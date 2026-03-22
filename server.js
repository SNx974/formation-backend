require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// En production (Dokploy), on accepte toutes les origines — le frontend est servi par Nginx
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/formations', require('./routes/formations'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', name: 'SE FORMER ÉVOLUER API' }));

// Route de setup : crée l'admin si inexistant (protégée par SETUP_TOKEN)
app.post('/api/setup', async (req, res) => {
  const { token } = req.body;
  if (token !== (process.env.SETUP_TOKEN || 'setup-seformer-2024')) {
    return res.status(403).json({ message: 'Token invalide' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const { query } = require('./database');
    const hash = bcrypt.hashSync('admin123', 10);
    await query(
      `INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
      ['Administrateur', 'admin@seformer.fr', hash, 'admin']
    );
    const userHash = bcrypt.hashSync('user123', 10);
    await query(
      `INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO NOTHING`,
      ['Jean Dupont', 'user@seformer.fr', userHash, 'user']
    );
    res.json({ message: '✅ Comptes créés : admin@seformer.fr / admin123' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Gestion globale des erreurs async
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
