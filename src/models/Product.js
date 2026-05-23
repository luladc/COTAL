// src/models/Product.js
const { getDb } = require('../config/database');

const STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' };

/** Campos cuya edición fuerza status a PENDING */
const CRITICAL_FIELDS = ['title', 'description', 'category', 'price'];

const Product = {

  // ── CREATE ────────────────────────────────────────────────────────────────
  create({ title, description, price, category, ownerId }) {
    const stmt = getDb().prepare(`
      INSERT INTO products (title, description, price, category, status, ownerId)
      VALUES (?, ?, ?, ?, 'PENDING', ?)
    `);
    const info = stmt.run(title, description, price, category, ownerId);
    return Product.findById(info.lastInsertRowid);
  },

  // ── READ ──────────────────────────────────────────────────────────────────
  findById(id) {
    return getDb().prepare(`
      SELECT p.*, u.name AS ownerName, u.email AS ownerEmail
      FROM products p
      JOIN users u ON u.id = p.ownerId
      WHERE p.id = ?
    `).get(id);
  },

  /** Solo productos APPROVED (listado público) */
  findApproved() {
    return getDb().prepare(`
      SELECT p.*, u.name AS ownerName
      FROM products p
      JOIN users u ON u.id = p.ownerId
      WHERE p.status = 'APPROVED'
      ORDER BY p.updatedAt DESC
    `).all();
  },

  /** Todos los productos de un propietario (todos los estados) */
  findByOwner(ownerId) {
    return getDb().prepare(`
      SELECT * FROM products WHERE ownerId = ? ORDER BY createdAt DESC
    `).all(ownerId);
  },

  /** Solo productos PENDING (moderación admin) */
  findPending() {
    return getDb().prepare(`
      SELECT p.*, u.name AS ownerName, u.email AS ownerEmail
      FROM products p
      JOIN users u ON u.id = p.ownerId
      WHERE p.status = 'PENDING'
      ORDER BY p.createdAt ASC
    `).all();
  },

  // ── UPDATE ────────────────────────────────────────────────────────────────
  /**
   * Actualiza un producto.
   * Si se modifica algún campo crítico, el status vuelve automáticamente a PENDING.
   * @returns {{ product, resetToPending: boolean }}
   */
  update(id, changes) {
    const existing = Product.findById(id);
    if (!existing) return null;

    // Determinar si hay cambio en campo crítico
    const hasCriticalChange = CRITICAL_FIELDS.some(
      f => changes[f] !== undefined && changes[f] !== existing[f]
    );

    const newTitle       = changes.title       ?? existing.title;
    const newDescription = changes.description ?? existing.description;
    const newPrice       = changes.price       ?? existing.price;
    const newCategory    = changes.category    ?? existing.category;
    const newStatus      = hasCriticalChange ? STATUS.PENDING : existing.status;

    getDb().prepare(`
      UPDATE products
      SET title = ?, description = ?, price = ?, category = ?,
          status = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(newTitle, newDescription, newPrice, newCategory, newStatus, id);

    return { product: Product.findById(id), resetToPending: hasCriticalChange };
  },

  /** Cambia el status directamente — solo para Admin */
  setStatus(id, status) {
    getDb().prepare(`
      UPDATE products SET status = ?, updatedAt = datetime('now') WHERE id = ?
    `).run(status, id);
    return Product.findById(id);
  },

  // ── DELETE ────────────────────────────────────────────────────────────────
  deleteById(id) {
    const info = getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
    return info.changes > 0;
  },
};

module.exports = { Product, STATUS, CRITICAL_FIELDS };
