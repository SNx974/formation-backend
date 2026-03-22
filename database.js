require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Helper : query rapide
const query = (text, params) => pool.query(text, params);

// Initialisation des tables
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS formations (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      short_description TEXT,
      category TEXT,
      level TEXT DEFAULT 'débutant',
      price NUMERIC DEFAULT 0,
      image_url TEXT,
      instructor TEXT,
      instructor_bio TEXT,
      duration TEXT,
      is_published INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS modules (
      id SERIAL PRIMARY KEY,
      formation_id INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      order_num INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      duration TEXT,
      url TEXT,
      order_num INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      formation_id INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
      progress INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      enrolled_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, formation_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      formation_id INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, formation_id)
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      formation_id INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
      issued_at TIMESTAMP DEFAULT NOW(),
      certificate_code TEXT UNIQUE
    );
  `);
  console.log('✅ Tables PostgreSQL initialisées');
}

initDB().catch(err => console.error('❌ Erreur init DB:', err));

module.exports = { query, pool };
