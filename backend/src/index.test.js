const assert = require('node:assert');
const { test } = require('node:test');
const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// Pour les tests on démarre l'app
const app = require('./index');

test('GET / retourne 200', async () => {
  const res = await get('/');
  assert.strictEqual(res.status, 200);
});

test('GET /health retourne healthy', async () => {
  const res = await get('/health');
  const body = JSON.parse(res.body);
  assert.strictEqual(body.status, 'healthy');
});

test('GET /metrics retourne des métriques Prometheus', async () => {
  const res = await get('/metrics');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.includes('http_requests_total'));
});
