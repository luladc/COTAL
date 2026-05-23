// server.js — Entry point de producción
require('dotenv').config();
const app  = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 Marketplace Sprint 2 corriendo en http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}\n`);
});
