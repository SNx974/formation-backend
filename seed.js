require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, pool } = require('./database');

async function seed() {
  // Attendre que la DB soit prête
  await new Promise(r => setTimeout(r, 3000));

  // Tester la connexion avant de continuer
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connexion PostgreSQL OK');
  } catch (e) {
    console.error('❌ Impossible de se connecter à PostgreSQL:', e.message);
    console.error('Vérifiez la variable DATABASE_URL');
    await pool.end().catch(() => {});
    process.exit(0); // exit 0 pour ne pas bloquer le démarrage du serveur
  }

  console.log('🌱 Seeding PostgreSQL...');

  // Admin
  const adminPass = bcrypt.hashSync('admin123', 10);
  await query(`INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
    ['Administrateur', 'admin@seformer.fr', adminPass, 'admin']);

  // User
  const userPass = bcrypt.hashSync('user123', 10);
  await query(`INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING`,
    ['Jean Dupont', 'user@seformer.fr', userPass, 'user']);

  const formations = [
    { title: 'Développement Web Full-Stack', short: 'Maîtrisez HTML, CSS, JavaScript, React et Node.js de A à Z', desc: 'Cette formation complète vous guidera à travers tous les aspects du développement web moderne.', cat: 'Développement', level: 'débutant', price: 299, instructor: 'Marie Leclerc', bio: 'Développeuse full-stack avec 10 ans d\'expérience', duration: '40h', img: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80' },
    { title: 'Data Science & Machine Learning', short: 'Python, Pandas, Scikit-learn et TensorFlow pour l\'IA', desc: 'Plongez dans le monde fascinant de la data science et du machine learning.', cat: 'Data Science', level: 'intermédiaire', price: 399, instructor: 'Dr. Ahmed Benali', bio: 'Docteur en intelligence artificielle', duration: '60h', img: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&q=80' },
    { title: 'UX/UI Design Moderne', short: 'Figma, prototypage et design systems pour créer des interfaces exceptionnelles', desc: 'Découvrez les principes fondamentaux du design d\'expérience utilisateur.', cat: 'Design', level: 'débutant', price: 249, instructor: 'Sophie Martin', bio: 'Designer senior avec 8 ans d\'expérience', duration: '35h', img: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&q=80' },
    { title: 'Cybersécurité Fondamentaux', short: 'Protégez vos systèmes et comprenez les menaces modernes', desc: 'Une introduction complète à la cybersécurité : cryptographie, sécurité réseau, tests d\'intrusion.', cat: 'Sécurité', level: 'intermédiaire', price: 349, instructor: 'Thomas Bernard', bio: 'Expert en sécurité, certifié CISSP', duration: '50h', img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80' },
    { title: 'Marketing Digital & SEO', short: 'Google Ads, réseaux sociaux et référencement naturel', desc: 'Développez vos compétences en marketing digital.', cat: 'Marketing', level: 'débutant', price: 199, instructor: 'Laura Petit', bio: 'Consultante marketing digital, 7 ans d\'expérience', duration: '30h', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80' },
    { title: 'Cloud Computing avec AWS', short: 'Architecture cloud, EC2, S3, Lambda et microservices', desc: 'Maîtrisez Amazon Web Services, la plateforme cloud leader mondial.', cat: 'Cloud', level: 'avancé', price: 449, instructor: 'Nicolas Rousseau', bio: 'Architecte cloud certifié AWS', duration: '55h', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80' },
  ];

  for (const f of formations) {
    const existing = await query('SELECT id FROM formations WHERE title = $1', [f.title]);
    if (existing.rows.length) continue;

    const res = await query(`
      INSERT INTO formations (title, short_description, description, category, level, price, instructor, instructor_bio, duration, image_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id
    `, [f.title, f.short, f.desc, f.cat, f.level, f.price, f.instructor, f.bio, f.duration, f.img]);

    const fid = res.rows[0].id;
    const m1 = await query('INSERT INTO modules (formation_id, title, order_num) VALUES ($1,$2,$3) RETURNING id', [fid, 'Introduction et bases', 1]);
    const m2 = await query('INSERT INTO modules (formation_id, title, order_num) VALUES ($1,$2,$3) RETURNING id', [fid, 'Concepts avancés', 2]);
    const m3 = await query('INSERT INTO modules (formation_id, title, order_num) VALUES ($1,$2,$3) RETURNING id', [fid, 'Projet pratique', 3]);

    for (const [mid, vids] of [
      [m1.rows[0].id, [['Présentation du cours','5:30'],['Installation et configuration','12:45'],['Premiers pas','18:20']]],
      [m2.rows[0].id, [['Concepts clés','22:10'],['Techniques avancées','35:00']]],
      [m3.rows[0].id, [['Mise en pratique','45:00'],['Projet final','60:00']]],
    ]) {
      for (const [i, [title, duration]] of vids.entries()) {
        await query('INSERT INTO videos (module_id, title, duration, order_num) VALUES ($1,$2,$3,$4)', [mid, title, duration, i + 1]);
      }
    }
  }

  console.log('✅ Seed terminé !');
  console.log('Admin : admin@seformer.fr / admin123');
  console.log('User  : user@seformer.fr  / user123');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
