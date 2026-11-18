const assert = require('node:assert/strict');
const { test } = require('node:test');
const { applyNeonMigration, migrationPath } = require('../database/neonMigration');

test('Neon migration runner submits the complete idempotent PostgreSQL schema', async () => {
  const statements = [];
  const db = {
    async query(sql) {
      statements.push(sql);
      return { rowCount: 0 };
    },
  };

  await applyNeonMigration(db);
  await applyNeonMigration(db);

  assert.equal(statements.length, 2);
  assert.equal(statements[0], statements[1]);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS users/);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS routes/);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS tickets/);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS active_drivers/);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS auth_challenges/);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS google_auth_nonces/);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS auth_rate_limits/);
  assert.match(statements[0], /email_verified SMALLINT NOT NULL DEFAULT 0/);
  assert.match(statements[0], /google_sub TEXT/);
  assert.match(statements[0], /user_type TEXT NOT NULL/);
  assert.match(statements[0], /commuter_id BIGINT NOT NULL REFERENCES users\(user_id\)/);
  assert.match(statements[0], /users_google_sub_unique/);
  assert.match(statements[0], /ON CONFLICT \(migration_id\) DO NOTHING/);
  assert.match(migrationPath, /20261118_neon_initial\.sql$/);
});
