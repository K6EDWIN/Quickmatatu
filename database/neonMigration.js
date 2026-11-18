const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(__dirname, '..', 'migrations', '20261118_neon_initial.sql');

async function applyNeonMigration(db) {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  await db.query(migration);
}

module.exports = { applyNeonMigration, migrationPath };
