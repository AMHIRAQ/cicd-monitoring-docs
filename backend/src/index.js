const express = require('express');
const client = require('prom-client');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// ─── MÉTRIQUES ──────────────────────────────────────────
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Durée des requêtes PostgreSQL',
  labelNames: ['query'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Connexions HTTP actives',
  registers: [register],
});

app.use((req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    end();
    activeConnections.dec();
  });
  next();
});

// ─── DB ─────────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'appdb',
  port: 5432,
  max: 20,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS requests_log (
      id SERIAL PRIMARY KEY,
      path VARCHAR(100),
      method VARCHAR(10),
      duration_ms INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('DB initialisée');
}

// ─── ROUTES DE BASE ─────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Backend OK', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─── CRUD USERS ─────────────────────────────────────────
// Créer un user
app.post('/users', async (req, res) => {
  const end = dbQueryDuration.startTimer({ query: 'insert_user' });
  try {
    const { name, email } = req.body;
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    end();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    end();
    res.status(400).json({ error: err.message });
  }
});

// Lister tous les users
app.get('/users', async (req, res) => {
  const end = dbQueryDuration.startTimer({ query: 'select_users' });
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 100');
    end();
    res.json(result.rows);
  } catch (err) {
    end();
    res.status(500).json({ error: err.message });
  }
});

// Lire un user
app.get('/users/:id', async (req, res) => {
  const end = dbQueryDuration.startTimer({ query: 'select_user' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    end();
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    end();
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un user
app.delete('/users/:id', async (req, res) => {
  const end = dbQueryDuration.startTimer({ query: 'delete_user' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    end();
    res.json({ deleted: req.params.id });
  } catch (err) {
    end();
    res.status(500).json({ error: err.message });
  }
});

// Stats DB
app.get('/db/stats', async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) as total FROM users');
    const logs  = await pool.query('SELECT COUNT(*) as total FROM requests_log');
    res.json({
      users: parseInt(users.rows[0].total),
      logs:  parseInt(logs.rows[0].total),
      pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CHARGE CPU ─────────────────────────────────────────
// Simule une charge CPU pendant N secondes
app.get('/dos/cpu/:seconds', (req, res) => {
  const seconds = Math.min(parseInt(req.params.seconds) || 1, 10); // max 10s
  const end = Date.now() + seconds * 1000;
  let iterations = 0;

  // Calcul intensif pour saturer le CPU
  while (Date.now() < end) {
    Math.sqrt(Math.random() * 999999);
    iterations++;
  }

  res.json({ type: 'cpu', seconds, iterations, message: `CPU chargé pendant ${seconds}s` });
});

// ─── CHARGE RAM ─────────────────────────────────────────
// Alloue N MB en mémoire puis libère
app.get('/dos/ram/:mb', (req, res) => {
  const mb = Math.min(parseInt(req.params.mb) || 50, 500); // max 500MB
  const buffers = [];

  for (let i = 0; i < mb; i++) {
    buffers.push(Buffer.alloc(1024 * 1024, 'x')); // 1MB par buffer
  }

  const used = process.memoryUsage().rss / 1024 / 1024;

  // Libère après 5 secondes
  setTimeout(() => buffers.length = 0, 5000);

  res.json({ type: 'ram', allocated_mb: mb, rss_mb: Math.round(used), message: `${mb}MB alloués, libération dans 5s` });
});

// ─── CHARGE DB ──────────────────────────────────────────
// Envoie N requêtes en parallèle à la DB
app.get('/dos/db/:count', async (req, res) => {
  const count = Math.min(parseInt(req.params.count) || 10, 200); // max 200
  const start = Date.now();

  try {
    const promises = Array.from({ length: count }, (_, i) =>
      pool.query(
        'INSERT INTO requests_log (path, method, duration_ms) VALUES ($1, $2, $3)',
        ['/dos/db', 'GET', i]
      )
    );
    await Promise.all(promises);
    const duration = Date.now() - start;
    res.json({ type: 'db', queries: count, duration_ms: duration, qps: Math.round(count / (duration / 1000)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CHARGE COMBINÉE ────────────────────────────────────
app.get('/dos/all', async (req, res) => {
  res.json({ message: 'Lance /dos/cpu/3 + /dos/ram/100 + /dos/db/50 en parallèle pour une charge complète' });
});

// ─── DÉMARRAGE ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Backend on port ${PORT}`);
  // Retry la connexion DB au démarrage
  let retries = 10;
  while (retries > 0) {
    try {
      await initDB();
      break;
    } catch (err) {
      console.log(`DB pas prête, retry dans 2s... (${retries} essais restants)`);
      retries--;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
});

module.exports = app;
