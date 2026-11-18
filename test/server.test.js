const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { createServer } = require('node:http');
const { createAccessToken, createApp, verifyAccessToken } = require('../server');

const secret = 'test-secret-with-more-than-thirty-two-characters';
let server;
let baseUrl;
let ticket = { ticket_id: 3, commuter_id: '2', driver_id: null, status: 'pending' };
let insertedBooking;
let updatedDriverLocation;
let driverLocationActive = false;
const authVersions = new Map([['1', 0], ['2', 0], ['3', 0]]);

const db = {
  async execute(statement) {
    const sql = typeof statement === 'string' ? statement : statement.sql;
    const args = typeof statement === 'string' ? [] : statement.args;
    if (sql.includes('FROM users WHERE user_id = ?')) {
      const id = String(args[0]);
      return { rows: ['1', '2', '3'].includes(id)
        ? [{ user_id: id, userType: id === '2' ? 'driver' : 'commuter', username: 'test', email: 'test@example.com', auth_version: authVersions.get(id) }]
        : [] };
    }
    if (sql.includes('SELECT ticket_id, commuter_id, driver_id, status FROM tickets')) {
      return { rows: ticket.ticket_id === Number(args[0]) ? [{ ...ticket }] : [] };
    }
    if (sql.includes('SELECT route_id, start_point FROM routes')) {
      return { rows: [{ route_id: 5, start_point: 'Stage A' }] };
    }
    if (sql.includes('INSERT INTO tickets')) {
      insertedBooking = args;
      return { lastInsertRowid: 42n };
    }
    if (sql.includes('INSERT INTO active_drivers')) {
      updatedDriverLocation = args;
      driverLocationActive = true;
      return { rowsAffected: 1 };
    }
    if (sql.startsWith('UPDATE active_drivers SET is_active = 0')) {
      driverLocationActive = false;
      return { rowsAffected: 1 };
    }
    if (sql.includes('UPDATE users SET auth_version = auth_version + 1')) {
      authVersions.set(String(args[0]), authVersions.get(String(args[0])) + 1);
      return { rowsAffected: 1 };
    }
    if (sql.startsWith("UPDATE tickets SET status = 'cancelled'")) {
      if (ticket.status !== 'pending' || ticket.commuter_id !== String(args[1])) return { rowsAffected: 0 };
      ticket.status = 'cancelled';
      return { rowsAffected: 1 };
    }
    if (sql.startsWith('UPDATE tickets SET status = ?')) {
      if (ticket.status !== 'pending' || ticket.driver_id) return { rowsAffected: 0 };
      [ticket.status, ticket.driver_id] = [args[0], String(args[1])];
      return { rowsAffected: 1 };
    }
    if (sql.startsWith("UPDATE tickets SET status = 'completed'")) {
      if (ticket.status !== 'accepted' || ticket.driver_id !== String(args[1])) return { rowsAffected: 0 };
      ticket.status = 'completed';
      return { rowsAffected: 1 };
    }
    if (sql.includes('FROM tickets t') && sql.includes("t.status = 'pending'")) return { rows: [] };
    return { rows: [] };
  },
};

before(async () => {
  server = createServer(createApp({ db, secret }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path, { userId, ...options } = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (userId) headers.Authorization = `Bearer ${createAccessToken(userId, secret)}`;
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

test('access tokens are signed and expire', () => {
  const token = createAccessToken('17', secret, 1_000_000);
  assert.deepEqual(verifyAccessToken(token, secret, 1_000_001), { id: '17', version: 0 });
  assert.equal(verifyAccessToken(`${token.slice(0, -1)}x`, secret, 1_000_001), null);
  assert.equal(verifyAccessToken(token, secret, 1_000_000 + 8 * 24 * 60 * 60 * 1000), null);
});

test('private routes require a valid identity and driver role', async () => {
  const anonymous = await request('/driver/bookings');
  assert.equal(anonymous.status, 401);

  const commuter = await request('/driver/bookings', { userId: '1' });
  assert.equal(commuter.status, 403);

  const driver = await request('/driver/bookings', { userId: '2' });
  assert.equal(driver.status, 200);
  assert.deepEqual(await driver.json(), []);
});

test('revoked token versions cannot access protected routes', async () => {
  const revokedToken = createAccessToken('1', secret, Date.now(), 1);
  const response = await request('/users/me', {
    headers: { Authorization: `Bearer ${revokedToken}` },
  });
  assert.equal(response.status, 401);
});

test('a commuter can only cancel their own pending booking', async () => {
  ticket = { ticket_id: 3, commuter_id: '3', driver_id: null, status: 'pending' };
  const response = await request('/update-booking-status', {
    userId: '1',
    method: 'POST',
    body: JSON.stringify({ ticket_id: 3, status: 'cancelled' }),
  });
  assert.equal(response.status, 403);
});

test('only the accepting driver can complete an assigned request', async () => {
  ticket = { ticket_id: 3, commuter_id: '1', driver_id: null, status: 'pending' };
  const accepted = await request('/update-booking-status', {
    userId: '2',
    method: 'POST',
    body: JSON.stringify({ ticket_id: 3, status: 'accepted' }),
  });
  assert.equal(accepted.status, 200);
  assert.equal(ticket.driver_id, '2');

  const otherDriver = await request('/update-booking-status', {
    userId: '3',
    method: 'POST',
    body: JSON.stringify({ ticket_id: 3, status: 'completed' }),
  });
  assert.equal(otherDriver.status, 403);

  const completed = await request('/update-booking-status', {
    userId: '2',
    method: 'POST',
    body: JSON.stringify({ ticket_id: 3, status: 'completed' }),
  });
  assert.equal(completed.status, 200);
  assert.equal(ticket.status, 'completed');
});

test('booking ownership is taken from the authenticated user and boarding stage is checked', async () => {
  const invalidStage = await request('/book-ticket', {
    userId: '1',
    method: 'POST',
    body: JSON.stringify({ commuter_id: '2', route_id: 5, pickup_point: 'Unlisted stage' }),
  });
  assert.equal(invalidStage.status, 400);
  assert.equal(insertedBooking, undefined);

  const response = await request('/book-ticket', {
    userId: '1',
    method: 'POST',
    body: JSON.stringify({ commuter_id: '2', route_id: 5, pickup_point: 'Stage A' }),
  });
  assert.equal(response.status, 201);
  assert.equal(insertedBooking[0], '1');
  assert.equal(insertedBooking[1], 5);
  assert.equal(insertedBooking[2], 'Stage A');
});

test('driver location identity comes from authentication, not the request body', async () => {
  const response = await request('/driver/location', {
    userId: '2',
    method: 'POST',
    body: JSON.stringify({ driver_id: 1, latitude: -1.2, longitude: 36.8 }),
  });
  assert.equal(response.status, 200);
  assert.equal(updatedDriverLocation[0], '2');
});

test('driver logout stops location sharing and revokes the session', async () => {
  const loggedOut = await request('/logout', { userId: '2', method: 'POST' });
  assert.equal(loggedOut.status, 200);
  assert.equal(driverLocationActive, false);

  const oldToken = createAccessToken('2', secret);
  const response = await request('/users/me', {
    headers: { Authorization: `Bearer ${oldToken}` },
  });
  assert.equal(response.status, 401);
});

test('logout revokes previously issued access tokens', async () => {
  const loggedOut = await request('/logout', { userId: '1', method: 'POST' });
  assert.equal(loggedOut.status, 200);

  const oldToken = createAccessToken('1', secret);
  const response = await request('/users/me', {
    headers: { Authorization: `Bearer ${oldToken}` },
  });
  assert.equal(response.status, 401);
});
