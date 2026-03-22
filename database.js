require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

const query = (text, params) => pool.query(text, params);

async function initDB() {
  // Tables de base
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
      image_url TEXT,
      instructor TEXT,
      instructor_bio TEXT,
      duration TEXT,
      objectifs TEXT,
      prerequis TEXT,
      public_vise TEXT,
      lieu TEXT,
      sessions TEXT,
      modalites TEXT,
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

    CREATE TABLE IF NOT EXISTS inscription_requests (
      id SERIAL PRIMARY KEY,
      formation_id INTEGER REFERENCES formations(id) ON DELETE SET NULL,
      formation_title TEXT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT NOT NULL,
      telephone TEXT,
      niveau_etude TEXT,
      situation_pro TEXT,
      message TEXT,
      statut TEXT DEFAULT 'nouveau',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Migrations — ajout de colonnes si elles n'existent pas
  const migrations = [
    `ALTER TABLE formations ADD COLUMN IF NOT EXISTS objectifs TEXT`,
    `ALTER TABLE formations ADD COLUMN IF NOT EXISTS prerequis TEXT`,
    `ALTER TABLE formations ADD COLUMN IF NOT EXISTS public_vise TEXT`,
    `ALTER TABLE formations ADD COLUMN IF NOT EXISTS lieu TEXT`,
    `ALTER TABLE formations ADD COLUMN IF NOT EXISTS sessions TEXT`,
    `ALTER TABLE formations ADD COLUMN IF NOT EXISTS modalites TEXT`,
    `ALTER TABLE formations DROP COLUMN IF EXISTS price`,
  ];
  for (const m of migrations) {
    await pool.query(m).catch(() => {});
  }

  // Paramètres par défaut
  await pool.query(`
    INSERT INTO site_settings (key, value) VALUES
      ('hero_image', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&q=80'),
      ('hero_title', 'SE FORMER, ÉVOLUER'),
      ('hero_subtitle', 'La SYNERGIE de nos compétences au service de la formation'),
      ('about_image', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80'),
      ('qualiopi_active', 'true')
    ON CONFLICT (key) DO NOTHING
  `);

  console.log('✅ Base de données initialisée');
}

initDB().catch(err => console.error('❌ Erreur init DB:', err));

module.exports = { query, pool };
