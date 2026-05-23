// tests/auth.test.js
// Tests SDD para autenticación: registro, login, perfil
const request = require('supertest');
const { app } = require('./helpers/testHelpers');
const { resetDb } = require('../src/config/database');

// Reiniciar DB en memoria antes de cada suite
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  resetDb();
});

afterAll(() => {
  const { closeDb } = require('../src/config/database');
  closeDb();
});

// ─── REGISTRO ────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {

  it('✅ registra un usuario DEMANDANTE correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ana López', email: 'ana@test.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('DEMANDANTE');
    expect(res.body.user.email).toBe('ana@test.com');
  });

  it('✅ registra un usuario OFERTANTE con rol explícito', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Pedro Vendedor', email: 'pedro@test.com', password: 'secret123', role: 'OFERTANTE' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('OFERTANTE');
  });

  it('❌ falla con email duplicado → 409', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Test', email: 'dup@test.com', password: 'secret123' });

    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test2', email: 'dup@test.com', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/ya está registrado/i);
  });

  it('❌ falla sin nombre → 422', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'noname@test.com', password: 'secret123' });
    expect(res.status).toBe(422);
  });

  it('❌ falla con email inválido → 422', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'secret123' });
    expect(res.status).toBe(422);
  });

  it('❌ falla con contraseña muy corta → 422', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test', email: 'short@test.com', password: '123' });
    expect(res.status).toBe(422);
  });

  it('❌ falla con rol inválido → 422', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Test', email: 'badrole@test.com', password: 'secret123', role: 'SUPERADMIN' });
    expect(res.status).toBe(422);
  });
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Login User', email: 'logintest@test.com', password: 'mypassword' });
  });

  it('✅ login correcto retorna JWT y datos del usuario', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'logintest@test.com', password: 'mypassword' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('logintest@test.com');
  });

  it('❌ login con contraseña incorrecta → 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'logintest@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inválidas/i);
  });

  it('❌ login con usuario inexistente → 401', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'mypassword' });
    expect(res.status).toBe(401);
  });

  it('❌ login sin email → 422', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ password: 'mypassword' });
    expect(res.status).toBe(422);
  });
});

// ─── PERFIL ──────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Me User', email: 'me@test.com', password: 'secret123' });
    const loginRes = await request(app).post('/api/auth/login')
      .send({ email: 'me@test.com', password: 'secret123' });
    token = loginRes.body.token;
  });

  it('✅ retorna perfil con token válido', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });

  it('❌ sin token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('❌ con token inválido → 401', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', 'Bearer token.falso.aqui');
    expect(res.status).toBe(401);
  });
});
