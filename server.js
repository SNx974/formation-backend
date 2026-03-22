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

// Gestion globale des erreurs async
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
