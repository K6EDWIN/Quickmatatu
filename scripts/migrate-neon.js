require('dotenv').config();

const { Pool } = require('pg');
const { applyNeonMigration } = require('../database/neonMigration');

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL (or NEON_DATABASE_URL) is required.');
  }
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await applyNeonMigration(pool);
    console.log('Neon schema migration applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Neon schema migration failed:', error.message);
  process.exitCode = 1;
});
