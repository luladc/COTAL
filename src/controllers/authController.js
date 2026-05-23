// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { User } = require('../models/User');
const { generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Crea un nuevo usuario. El rol por defecto es DEMANDANTE.
 * Para crear ADMIN u OFERTANTE se pasa el campo role.
 */
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  try {
    // Verificar email único
    if (User.findByEmail(email)) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = User.create({ name, email, password: hash, role: role || 'DEMANDANTE' });
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/auth/login
 * Autentica con email + password, retorna JWT.
 */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/auth/me
 * Retorna el perfil del usuario autenticado.
 */
function me(req, res) {
  const user = User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  return res.json({ user });
}

module.exports = { register, login, me };
