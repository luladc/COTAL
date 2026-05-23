// src/controllers/productController.js
const { validationResult } = require('express-validator');
const { Product, STATUS } = require('../models/Product');

/**
 * POST /api/products
 * HU-01: Solo OFERTANTE puede crear. Status inicial = PENDING.
 */
function create(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { title, description, price, category } = req.body;
  try {
    const product = Product.create({
      title:       title.trim(),
      description: description.trim(),
      price:       Number(price),
      category:    category.trim(),
      ownerId:     req.user.id,
    });
    return res.status(201).json({ message: 'Producto creado, pendiente de aprobación', product });
  } catch (err) {
    console.error('create product error:', err);
    return res.status(500).json({ error: 'Error al crear el producto' });
  }
}

/**
 * GET /api/products
 * Público: solo productos APPROVED.
 */
function listPublic(req, res) {
  const products = Product.findApproved();
  return res.json({ products });
}

/**
 * GET /api/products/my
 * OFERTANTE: lista todos sus productos (cualquier estado).
 */
function listMine(req, res) {
  const products = Product.findByOwner(req.user.id);
  return res.json({ products });
}

/**
 * GET /api/products/pending
 * ADMIN: lista todos los productos PENDING.
 */
function listPending(req, res) {
  const products = Product.findPending();
  return res.json({ products });
}

/**
 * GET /api/products/:id
 * Público: solo si está APPROVED.
 */
function getOne(req, res) {
  const product = Product.findById(Number(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  if (product.status !== STATUS.APPROVED) {
    return res.status(404).json({ error: 'Producto no disponible públicamente' });
  }
  return res.json({ product });
}

/**
 * PUT /api/products/:id
 * HU-02: OFERTANTE edita su propio producto.
 * Campos críticos → reset a PENDING automático.
 */
function update(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const id = Number(req.params.id);
  const product = Product.findById(id);

  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  // Verificar ownership
  if (product.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'No puedes editar productos de otro usuario' });
  }

  try {
    const result = Product.update(id, req.body);
    return res.json({
      message: result.resetToPending
        ? 'Producto actualizado. Vuelve a estar pendiente de aprobación.'
        : 'Producto actualizado correctamente.',
      product: result.product,
      resetToPending: result.resetToPending,
    });
  } catch (err) {
    console.error('update product error:', err);
    return res.status(500).json({ error: 'Error al actualizar el producto' });
  }
}

/**
 * DELETE /api/products/:id
 * HU-02: OFERTANTE elimina su propio producto.
 */
function remove(req, res) {
  const id = Number(req.params.id);
  const product = Product.findById(id);

  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  // Verificar ownership
  if (product.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'No puedes eliminar productos de otro usuario' });
  }

  Product.deleteById(id);
  return res.json({ message: 'Producto eliminado correctamente' });
}

/**
 * PATCH /api/products/:id/status
 * HU-03: Solo ADMIN puede cambiar el estado (APPROVED / REJECTED).
 */
function changeStatus(req, res) {
  const { status } = req.body;
  const validStatuses = [STATUS.APPROVED, STATUS.REJECTED];

  if (!validStatuses.includes(status)) {
    return res.status(422).json({
      error: `Estado inválido. Use: ${validStatuses.join(' | ')}`,
    });
  }

  const id = Number(req.params.id);
  const product = Product.findById(id);

  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }

  const updated = Product.setStatus(id, status);
  const msg = status === STATUS.APPROVED
    ? 'Producto aprobado. Ahora es visible públicamente.'
    : 'Producto rechazado.';

  return res.json({ message: msg, product: updated });
}

module.exports = { create, listPublic, listMine, listPending, getOne, update, remove, changeStatus };
