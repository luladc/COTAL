// src/config/database.js
// Inicializa SQLite con better-sqlite3 y crea las tablas si no existen
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '../../data/marketplace.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      email     TEXT    UNIQUE NOT NULL,
      password  TEXT    NOT NULL,
      role      TEXT    NOT NULL DEFAULT 'DEMANDANTE'
                CHECK(role IN ('ADMIN','OFERTANTE','DEMANDANTE')),
      createdAt TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL,
      price       REAL    NOT NULL CHECK(price >= 0),
      category    TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'PENDING'
                  CHECK(status IN ('PENDING','APPROVED','REJECTED')),
      ownerId     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
      updatedAt   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** Cierra la conexión — útil para tests */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

/** Resetea la instancia — útil para tests en memoria */
function resetDb() {
  db = null;
}

module.exports = { getDb, closeDb, resetDb };
