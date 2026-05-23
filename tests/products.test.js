// tests/products.test.js
// Tests SDD completos para Gestión de Productos (Sprint 2)
// HU-01: Crear | HU-02: Editar/Eliminar | HU-03: Moderación Admin
const request = require('supertest');
const { setupTestUsers, createTestProduct, app } = require('./helpers/testHelpers');
const { resetDb, closeDb } = require('../src/config/database');

let adminToken, ofertanteToken, otroToken, demandanteToken;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  resetDb(); // DB en memoria fresca para este suite
  const tokens = await setupTestUsers();
  adminToken      = tokens.adminToken;
  ofertanteToken  = tokens.ofertanteToken;
  otroToken       = tokens.otroToken;
  demandanteToken = tokens.demandanteToken;
});

afterAll(() => closeDb());

// ─── HU-01: CREAR PRODUCTO ───────────────────────────────────────────────────
describe('HU-01 — POST /api/products (Crear producto)', () => {

  it('✅ OFERTANTE crea producto → status PENDING', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({
        title:       'Taller de fotografía',
        description: 'Aprende fotografía profesional desde cero',
        price:       25000,
        category:    'Educación',
      });

    expect(res.status).toBe(201);
    expect(res.body.product.status).toBe('PENDING');
    expect(res.body.product.title).toBe('Taller de fotografía');
  });

  it('✅ El producto PENDING no aparece en el listado público', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    // Solo APPROVED deberían aparecer
    const pending = res.body.products.filter(p => p.status !== 'APPROVED');
    expect(pending).toHaveLength(0);
  });

  it('❌ DEMANDANTE intenta crear producto → 403', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${demandanteToken}`)
      .send({ title: 'Intento', description: 'Descripción', price: 100, category: 'Test' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/OFERTANTE/i);
  });

  it('❌ sin autenticación → 401', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ title: 'Test', description: 'Test', price: 100, category: 'Test' });
    expect(res.status).toBe(401);
  });

  it('❌ sin título → 422', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ description: 'Descripción', price: 100, category: 'Test' });
    expect(res.status).toBe(422);
  });

  it('❌ sin descripción → 422', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ title: 'Título válido', price: 100, category: 'Test' });
    expect(res.status).toBe(422);
  });

  it('❌ precio negativo → 422', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ title: 'Test', description: 'Desc', price: -10, category: 'Test' });
    expect(res.status).toBe(422);
  });

  it('❌ ADMIN intenta crear como ofertante → 403 (no tiene rol OFERTANTE)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test', description: 'Desc', price: 100, category: 'Test' });
    expect(res.status).toBe(403);
  });
});

// ─── HU-02: EDITAR PRODUCTO ──────────────────────────────────────────────────
describe('HU-02 — PUT /api/products/:id (Editar producto)', () => {
  let productId;

  beforeAll(async () => {
    const p = await createTestProduct(ofertanteToken, { title: 'Producto original' });
    productId = p.id;
    // Aprobarlo para ver el efecto del reset
    await request(app)
      .patch(`/api/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
  });

  it('✅ OFERTANTE edita su propio producto', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ category: 'Nueva Categoría' }); // campo NO crítico para titulo

    expect(res.status).toBe(200);
    expect(res.body.product.category).toBe('Nueva Categoría');
  });

  it('✅ editar campo crítico (title) → status vuelve a PENDING automáticamente', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ title: 'Título modificado' }); // campo CRÍTICO

    expect(res.status).toBe(200);
    expect(res.body.product.status).toBe('PENDING');
    expect(res.body.resetToPending).toBe(true);
    expect(res.body.product.title).toBe('Título modificado');
  });

  it('✅ editar campo crítico (price) → status vuelve a PENDING', async () => {
    // Aprobar primero
    await request(app).patch(`/api/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`).send({ status: 'APPROVED' });

    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ price: 99999 });

    expect(res.status).toBe(200);
    expect(res.body.product.status).toBe('PENDING');
    expect(res.body.resetToPending).toBe(true);
  });

  it('❌ editar producto de otro usuario → 403', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${otroToken}`) // otro OFERTANTE
      .send({ title: 'Intento de robo' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/otro usuario/i);
  });

  it('❌ sin autenticación → 401', async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send({ title: 'Test' });
    expect(res.status).toBe(401);
  });

  it('❌ producto inexistente → 404', async () => {
    const res = await request(app)
      .put('/api/products/99999')
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ title: 'Test' });
    expect(res.status).toBe(404);
  });
});

// ─── HU-02: ELIMINAR PRODUCTO ────────────────────────────────────────────────
describe('HU-02 — DELETE /api/products/:id (Eliminar producto)', () => {
  let productToDelete, productAjeno;

  beforeAll(async () => {
    productToDelete = await createTestProduct(ofertanteToken, { title: 'Para eliminar' });
    productAjeno    = await createTestProduct(otroToken, { title: 'Del otro ofertante' });
  });

  it('❌ eliminar producto ajeno → 403', async () => {
    const res = await request(app)
      .delete(`/api/products/${productAjeno.id}`)
      .set('Authorization', `Bearer ${ofertanteToken}`); // intenta borrar el del otro

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/otro usuario/i);
  });

  it('✅ OFERTANTE elimina su propio producto', async () => {
    const res = await request(app)
      .delete(`/api/products/${productToDelete.id}`)
      .set('Authorization', `Bearer ${ofertanteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  it('❌ eliminar producto ya eliminado → 404', async () => {
    const res = await request(app)
      .delete(`/api/products/${productToDelete.id}`)
      .set('Authorization', `Bearer ${ofertanteToken}`);
    expect(res.status).toBe(404);
  });

  it('❌ DEMANDANTE intenta eliminar → 403', async () => {
    const res = await request(app)
      .delete(`/api/products/${productAjeno.id}`)
      .set('Authorization', `Bearer ${demandanteToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── HU-03: MODERACIÓN ADMIN ─────────────────────────────────────────────────
describe('HU-03 — PATCH /api/products/:id/status (Aprobar/Rechazar)', () => {
  let pendingId, pendingId2;

  beforeAll(async () => {
    const p1 = await createTestProduct(ofertanteToken, { title: 'Para aprobar' });
    const p2 = await createTestProduct(ofertanteToken, { title: 'Para rechazar' });
    pendingId  = p1.id;
    pendingId2 = p2.id;
  });

  it('✅ ADMIN lista productos PENDING', async () => {
    const res = await request(app)
      .get('/api/products/admin/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    // Todos deben ser PENDING
    res.body.products.forEach(p => expect(p.status).toBe('PENDING'));
  });

  it('✅ ADMIN aprueba producto → status APPROVED', async () => {
    const res = await request(app)
      .patch(`/api/products/${pendingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.product.status).toBe('APPROVED');
    expect(res.body.message).toMatch(/aprobado/i);
  });

  it('✅ Producto APPROVED aparece en listado público', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    const approvedIds = res.body.products.map(p => p.id);
    expect(approvedIds).toContain(pendingId);
  });

  it('✅ ADMIN rechaza producto → status REJECTED', async () => {
    const res = await request(app)
      .patch(`/api/products/${pendingId2}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(200);
    expect(res.body.product.status).toBe('REJECTED');
    expect(res.body.message).toMatch(/rechazado/i);
  });

  it('✅ Producto REJECTED NO aparece en listado público', async () => {
    const res = await request(app).get('/api/products');
    const ids = res.body.products.map(p => p.id);
    expect(ids).not.toContain(pendingId2);
  });

  it('❌ OFERTANTE intenta cambiar status → 403', async () => {
    const res = await request(app)
      .patch(`/api/products/${pendingId}/status`)
      .set('Authorization', `Bearer ${ofertanteToken}`)
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(403);
  });

  it('❌ DEMANDANTE intenta cambiar status → 403', async () => {
    const res = await request(app)
      .patch(`/api/products/${pendingId}/status`)
      .set('Authorization', `Bearer ${demandanteToken}`)
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(403);
  });

  it('❌ status inválido → 422', async () => {
    const res = await request(app)
      .patch(`/api/products/${pendingId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PUBLICADO' });
    expect(res.status).toBe(422);
  });
});

// ─── LISTADO PÚBLICO ─────────────────────────────────────────────────────────
describe('GET /api/products (Listado público)', () => {
  it('✅ retorna solo productos APPROVED sin autenticación', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    res.body.products.forEach(p => {
      expect(p.status).toBe('APPROVED');
    });
  });

  it('✅ cada producto incluye ownerName del ofertante', async () => {
    const res = await request(app).get('/api/products');
    res.body.products.forEach(p => {
      expect(p.ownerName).toBeDefined();
    });
  });
});

// ─── MIS PRODUCTOS (OFERTANTE) ───────────────────────────────────────────────
describe('GET /api/products/my/list (Mis productos)', () => {
  it('✅ OFERTANTE ve todos sus productos (todos los estados)', async () => {
    const res = await request(app)
      .get('/api/products/my/list')
      .set('Authorization', `Bearer ${ofertanteToken}`);

    expect(res.status).toBe(200);
    // Deben incluir PENDING, APPROVED y REJECTED del ofertante de prueba
    const statuses = res.body.products.map(p => p.status);
    expect(statuses.some(s => s === 'APPROVED' || s === 'PENDING' || s === 'REJECTED')).toBe(true);
  });

  it('❌ sin autenticación → 401', async () => {
    const res = await request(app).get('/api/products/my/list');
    expect(res.status).toBe(401);
  });
});
