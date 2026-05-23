// src/models/User.js
const { getDb } = require('../config/database');

const ROLES = { ADMIN: 'ADMIN', OFERTANTE: 'OFERTANTE', DEMANDANTE: 'DEMANDANTE' };

const User = {
  findByEmail(email) {
    return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
  },
  findById(id) {
    return getDb().prepare('SELECT id, name, email, role, createdAt FROM users WHERE id = ?').get(id);
  },
  create({ name, email, password, role = 'DEMANDANTE' }) {
    const stmt = getDb().prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    );
    const info = stmt.run(name, email, password, role);
    return { id: info.lastInsertRowid, name, email, role };
  },
};

module.exports = { User, ROLES };
