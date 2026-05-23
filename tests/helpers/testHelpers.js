// tests/helpers/testHelpers.js
// Utilidades compartidas para todos los tests
const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const app      = require('../../src/app');
const { getDb, resetDb } = require('../../src/config/database');

/**
 * Crea los usuarios de prueba y retorna sus tokens JWT.
 * Cada test suite llama esto en beforeAll.
 */
async function setupTestUsers() {
  const db = getDb();
  const hash = await bcrypt.hash('password123', 10);

  db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role)
    VALUES
      ('Admin Test',     'admin@test.com',     ?, 'ADMIN'),
      ('Ofertante Test', 'ofertante@test.com', ?, 'OFERTANTE'),
      ('Otro Ofertante', 'otro@test.com',      ?, 'OFERTANTE'),
      ('Demandante Test','demandante@test.com',?, 'DEMANDANTE')
  `).run(hash, hash, hash, hash);

  // Login y obtener tokens
  const [adminRes, ofertanteRes, otroRes, demandanteRes] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'admin@test.com',      password: 'password123' }),
    request(app).post('/api/auth/login').send({ email: 'ofertante@test.com',  password: 'password123' }),
    request(app).post('/api/auth/login').send({ email: 'otro@test.com',       password: 'password123' }),
    request(app).post('/api/auth/login').send({ email: 'demandante@test.com', password: 'password123' }),
  ]);

  return {
    adminToken:      adminRes.body.token,
    ofertanteToken:  ofertanteRes.body.token,
    otroToken:       otroRes.body.token,
    demandanteToken: demandanteRes.body.token,
  };
}

/**
 * Crea un producto como ofertante y lo retorna.
 * Útil para setup de tests de edición/eliminación/moderación.
 */
async function createTestProduct(token, overrides = {}) {
  const data = {
    title:       'Servicio de consultoría',
    description: 'Asesoría profesional para tu empresa',
    price:       50000,
    category:    'Servicios',
    ...overrides,
  };
  const res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  return res.body.product;
}

module.exports = { setupTestUsers, createTestProduct, app };
