// src/routes/productRoutes.js
const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/productController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = Router();

// Validaciones para crear/editar
const productValidators = [
  body('title').optional().trim().notEmpty().withMessage('El título no puede estar vacío')
    .isLength({ max: 200 }).withMessage('Máximo 200 caracteres'),
  body('description').optional().trim().notEmpty().withMessage('La descripción no puede estar vacía'),
  body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número no negativo'),
  body('category').optional().trim().notEmpty().withMessage('La categoría no puede estar vacía'),
];

const createValidators = [
  body('title').trim().notEmpty().withMessage('El título es obligatorio'),
  body('description').trim().notEmpty().withMessage('La descripción es obligatoria'),
  body('price').notEmpty().isFloat({ min: 0 }).withMessage('El precio es obligatorio y debe ser >= 0'),
  body('category').trim().notEmpty().withMessage('La categoría es obligatoria'),
];

// ── Rutas públicas ──────────────────────────────────────────────────────────
router.get('/',          ctrl.listPublic);          // GET /api/products
router.get('/:id',       ctrl.getOne);              // GET /api/products/:id

// ── Rutas OFERTANTE ─────────────────────────────────────────────────────────
router.post('/',
  requireAuth,
  requireRole('OFERTANTE'),
  createValidators,
  ctrl.create
);

router.get('/my/list',                              // GET /api/products/my/list
  requireAuth,
  requireRole('OFERTANTE'),
  ctrl.listMine
);

router.put('/:id',
  requireAuth,
  requireRole('OFERTANTE'),
  productValidators,
  ctrl.update
);

router.delete('/:id',
  requireAuth,
  requireRole('OFERTANTE'),
  ctrl.remove
);

// ── Rutas ADMIN ─────────────────────────────────────────────────────────────
router.get('/admin/pending',
  requireAuth,
  requireRole('ADMIN'),
  ctrl.listPending
);

router.patch('/:id/status',
  requireAuth,
  requireRole('ADMIN'),
  ctrl.changeStatus
);

module.exports = router;
