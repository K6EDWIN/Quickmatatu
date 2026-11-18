const crypto = require('crypto');
const express = require('express');
const { createClient } = require('@libsql/client/http');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const allowedOrigins = new Set([
  'http://localhost:8081',
  'http://localhost:19006',
  process.env.EXPO_PUBLIC_WEB_ORIGIN,
].filter(Boolean));
const developmentSecret = crypto.randomBytes(32).toString('hex');
const databaseUrl = process.env.TURSO_DATABASE_URL;
if (process.env.NODE_ENV === 'production' && (!databaseUrl || !process.env.TURSO_AUTH_TOKEN)) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required in production.');
}
const turso = databaseUrl
  ? createClient({ url: databaseUrl, authToken: process.env.TURSO_AUTH_TOKEN })
  : null;
if (process.env.NODE_ENV === 'production'
  && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must contain at least 32 characters in production.');
}

function createAccessToken(userId, secret = process.env.SESSION_SECRET || developmentSecret, now = Date.now(), version = 0) {
  const payload = Buffer.from(JSON.stringify({
    sub: String(userId),
    exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
    ver: version,
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyAccessToken(token, secret = process.env.SESSION_SECRET || developmentSecret, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;

  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof decoded.sub !== 'string' || !/^\d+$/.test(decoded.sub)) return null;
    if (!Number.isInteger(decoded.exp) || decoded.exp <= Math.floor(now / 1000)) return null;
    if (!Number.isInteger(decoded.ver) || decoded.ver < 0) return null;
    return { id: decoded.sub, version: decoded.ver };
  } catch {
    return null;
  }
}

async function ensureColumn(db, table, column, definition) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  if (!result.rows.some((row) => row.name === column)) {
    try {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (error) {
      if (!/duplicate column name/i.test(error.message || '')) throw error;
    }
  }
}

async function ensureTablesExist(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      userType TEXT NOT NULL,
      username TEXT,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      license_number TEXT,
      id_number TEXT
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS routes (
      route_id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_name TEXT,
      start_point TEXT,
      end_point TEXT,
      intermediary_stops TEXT,
      estimated_duration TEXT,
      longitude DECIMAL(10, 8),
      latitude DECIMAL(10, 8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
      commuter_id TEXT,
      route_id INTEGER,
      pickup_point TEXT,
      booking_time TEXT,
      status TEXT DEFAULT 'pending'
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS active_drivers (
      driver_id INTEGER PRIMARY KEY,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(10, 8),
      is_active BOOLEAN DEFAULT 1,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await ensureColumn(db, 'users', 'driver_name', 'TEXT');
  await ensureColumn(db, 'users', 'vehicle_license_plate', 'TEXT');
  await ensureColumn(db, 'users', 'auth_version', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'tickets', 'driver_id', 'INTEGER');
}

const databaseInitialization = turso
  ? ensureTablesExist(turso).then(() => null, (error) => error)
  : Promise.resolve(null);

function validEmail(value) {
  return typeof value === 'string'
    && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function positiveIntegerId(value) {
  const formatted = String(value);
  if (!/^[1-9]\d*$/.test(formatted)) return null;
  const id = Number(formatted);
  return Number.isSafeInteger(id) ? id : null;
}

function createApp({ db = turso, secret = process.env.SESSION_SECRET || developmentSecret } = {}) {
  const app = express();
  const router = express.Router();
  const sessionSecret = secret;

  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    if (req.body === null || Array.isArray(req.body)
      || (req.body !== undefined && typeof req.body !== 'object')) {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }
    req.body = req.body || {};
    next();
  });

  const requireAuth = async (req, res, next) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    const tokenUser = verifyAccessToken(token, sessionSecret);
    if (!tokenUser) return res.status(401).json({ error: 'Authentication required.' });

    try {
      const result = await db.execute({
        sql: 'SELECT user_id, userType, username, email, auth_version FROM users WHERE user_id = ?',
        args: [tokenUser.id],
      });
      if (!result.rows.length) return res.status(401).json({ error: 'Authentication required.' });
      const user = result.rows[0];
      if (tokenUser.version !== Number(user.auth_version || 0)) {
        return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
      }
      req.user = {
        id: String(user.user_id),
        userType: user.userType,
        username: user.username,
        email: user.email,
      };
      next();
    } catch (error) {
      console.error('Authentication lookup failed:', error);
      res.status(500).json({ error: 'Unable to verify your account.' });
    }
  };
  const requireRole = (role) => (req, res, next) => {
    if (req.user.userType !== role) {
      return res.status(403).json({ error: 'You are not allowed to perform this action.' });
    }
    next();
  };
  const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

  router.use(async (_req, res, next) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    if (db !== turso) return next();
    try {
      const initializationError = await databaseInitialization;
      if (initializationError) throw initializationError;
      next();
    } catch (error) {
      console.error('Database initialization failed:', error);
      res.status(503).json({ error: 'Database is unavailable.' });
    }
  });

  router.get('/', (_req, res) => res.send('QuickMatatu API is running'));

  router.post('/register', asyncRoute(async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const {
      userType, username, email, password, license, nationalId,
      driverName, vehicleLicensePlate,
    } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanUsername = typeof username === 'string' ? username.trim() : '';
    if (!['commuter', 'driver'].includes(userType)
      || cleanUsername.length < 2 || cleanUsername.length > 60
      || !validEmail(normalizedEmail)
      || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Enter a valid name, email, and password (at least 8 characters).' });
    }
    if (userType === 'driver' && (!validText(driverName, 100)
      || !validText(vehicleLicensePlate, 32)
      || !validText(license, 100)
      || !validText(nationalId, 64))) {
      return res.status(400).json({ error: 'Driver name, vehicle registration, licence, and national ID are required.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await db.execute({
        sql: `INSERT INTO users
          (userType, username, email, password, license_number, id_number, driver_name, vehicle_license_plate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          userType, cleanUsername, normalizedEmail, hashedPassword,
          userType === 'driver' ? license.trim() : null,
          userType === 'driver' ? nationalId.trim() : null,
          userType === 'driver' ? driverName.trim() : null,
          userType === 'driver' ? vehicleLicensePlate.trim().toUpperCase() : null,
        ],
      });
      res.status(201).json({
        message: 'User registered successfully',
        userId: result.lastInsertRowid.toString(),
      });
    } catch (error) {
      if (/unique|constraint/i.test(error.message || '')) {
        return res.status(409).json({ error: 'Email already registered.' });
      }
      console.error('Register Error:', error);
      res.status(500).json({ error: 'Registration failed.' });
    }
  }));

  router.post('/login', asyncRoute(async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;
    if (!email || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }
    const result = await db.execute({
      sql: 'SELECT user_id, username, email, userType, password, auth_version FROM users WHERE email = ?',
      args: [email],
    });
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    res.json({
      message: 'Login successful',
      token: createAccessToken(user.user_id, sessionSecret, Date.now(), Number(user.auth_version || 0)),
      user: { id: String(user.user_id), username: user.username, userType: user.userType },
    });
  }));

  router.get('/get_user', requireAuth, (req, res) => res.json({ user: req.user }));
  router.get('/users/me', requireAuth, (req, res) => res.json(req.user));
  router.get('/users/:id', requireAuth, (req, res) => {
    if (String(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'You may only view your own profile.' });
    }
    res.json(req.user);
  });
  router.post('/logout', requireAuth, asyncRoute(async (req, res) => {
    await db.execute({
      sql: 'UPDATE users SET auth_version = auth_version + 1 WHERE user_id = ?',
      args: [req.user.id],
    });
    if (req.user.userType === 'driver') {
      await db.execute({
        sql: 'UPDATE active_drivers SET is_active = 0, last_updated = CURRENT_TIMESTAMP WHERE driver_id = ?',
        args: [req.user.id],
      });
    }
    res.json({ message: 'Logout successful' });
  }));

  router.post('/driver/location', requireAuth, requireRole('driver'), asyncRoute(async (req, res) => {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number'
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'A valid latitude and longitude are required.' });
    }
    await db.execute({
      sql: `INSERT INTO active_drivers (driver_id, latitude, longitude, is_active, last_updated)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(driver_id) DO UPDATE SET latitude=excluded.latitude,
          longitude=excluded.longitude, is_active=1, last_updated=CURRENT_TIMESTAMP`,
      args: [req.user.id, latitude, longitude],
    });
    res.json({ success: true });
  }));
  router.delete('/driver/location', requireAuth, requireRole('driver'), asyncRoute(async (req, res) => {
    await db.execute({
      sql: 'UPDATE active_drivers SET is_active = 0, last_updated = CURRENT_TIMESTAMP WHERE driver_id = ?',
      args: [req.user.id],
    });
    res.json({ success: true });
  }));
  router.get('/active-matatus', asyncRoute(async (_req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const result = await db.execute(`
      SELECT ad.driver_id, ad.latitude, ad.longitude, ad.last_updated, u.username
      FROM active_drivers ad JOIN users u ON ad.driver_id = u.user_id
      WHERE ad.is_active = 1 AND ad.last_updated > datetime('now', '-5 minutes')
        AND ad.latitude IS NOT NULL AND ad.longitude IS NOT NULL
        AND ad.latitude BETWEEN -90 AND 90 AND ad.longitude BETWEEN -180 AND 180
        AND u.userType = 'driver'
    `);
    res.json(result.rows);
  }));

  router.get('/routes', asyncRoute(async (_req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const result = await db.execute(`
      SELECT * FROM routes
      WHERE route_name IS NOT NULL AND trim(route_name) <> ''
        AND start_point IS NOT NULL AND trim(start_point) <> ''
        AND end_point IS NOT NULL AND trim(end_point) <> ''
      ORDER BY route_name
    `);
    res.json(result.rows);
  }));
  router.post('/book-ticket', requireAuth, requireRole('commuter'), asyncRoute(async (req, res) => {
    const { route_id: routeId, pickup_point: pickupPoint } = req.body;
    const parsedRouteId = positiveIntegerId(routeId);
    if (!parsedRouteId) {
      return res.status(400).json({ error: 'Select a valid route.' });
    }
    const routeResult = await db.execute({
      sql: `SELECT route_id, start_point FROM routes WHERE route_id = ?
        AND start_point IS NOT NULL AND trim(start_point) <> ''
        AND end_point IS NOT NULL AND trim(end_point) <> ''`,
      args: [parsedRouteId],
    });
    const route = routeResult.rows[0];
    if (!route) return res.status(404).json({ error: 'This route is not currently available for requests.' });
    if (typeof pickupPoint !== 'string' || pickupPoint.trim() !== route.start_point.trim()) {
      return res.status(400).json({ error: 'Choose the starting point recorded for this route.' });
    }
    const result = await db.execute({
      sql: `INSERT INTO tickets (commuter_id, route_id, pickup_point, booking_time, status)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'pending')`,
      args: [req.user.id, route.route_id, route.start_point],
    });
    res.status(201).json({
      message: 'Ride request submitted. Acceptance does not verify vehicle assignment or seat availability.',
      ticketId: result.lastInsertRowid.toString(),
      status: 'pending',
    });
  }));
  router.get('/user/bookings/:userId', requireAuth, requireRole('commuter'), asyncRoute(async (req, res) => {
    if (String(req.params.userId) !== req.user.id) {
      return res.status(403).json({ error: 'You may only view your own bookings.' });
    }
    const result = await db.execute({
      sql: `SELECT t.ticket_id, t.route_id, t.pickup_point, t.booking_time, t.status,
          r.route_name, r.start_point, r.end_point, r.estimated_duration
        FROM tickets t JOIN routes r ON t.route_id = r.route_id
        WHERE t.commuter_id = ? ORDER BY t.booking_time DESC`,
      args: [req.user.id],
    });
    res.json(result.rows);
  }));
  router.get('/driver/bookings', requireAuth, requireRole('driver'), asyncRoute(async (_req, res) => {
    const result = await db.execute(`
      SELECT t.ticket_id, t.route_id, t.pickup_point, t.booking_time, t.status,
        r.route_name, r.start_point, r.end_point, u.username AS commuter_name
      FROM tickets t JOIN users u ON t.commuter_id = u.user_id
        JOIN routes r ON t.route_id = r.route_id
      WHERE t.status = 'pending' AND t.driver_id IS NULL
      ORDER BY t.booking_time ASC
    `);
    res.json(result.rows);
  }));
  router.get('/driver/bookings/history', requireAuth, requireRole('driver'), asyncRoute(async (req, res) => {
    const result = await db.execute({
      sql: `SELECT t.ticket_id, t.route_id, t.pickup_point, t.booking_time, t.status,
          r.route_name, r.start_point, r.end_point, u.username AS commuter_name
        FROM tickets t JOIN routes r ON t.route_id = r.route_id
          JOIN users u ON t.commuter_id = u.user_id
        WHERE t.driver_id = ? ORDER BY t.booking_time DESC`,
      args: [req.user.id],
    });
    res.json(result.rows);
  }));
  router.post('/update-booking-status', requireAuth, asyncRoute(async (req, res) => {
    const { ticket_id: ticketId, status } = req.body;
    const parsedTicketId = positiveIntegerId(ticketId);
    if (!parsedTicketId
      || !['cancelled', 'accepted', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'A valid booking and status are required.' });
    }
    const ticketResult = await db.execute({
      sql: 'SELECT ticket_id, commuter_id, driver_id, status FROM tickets WHERE ticket_id = ?',
      args: [parsedTicketId],
    });
    const ticket = ticketResult.rows[0];
    if (!ticket) return res.status(404).json({ error: 'Booking not found.' });

    let update;
    if (status === 'cancelled' && req.user.userType === 'commuter'
      && String(ticket.commuter_id) === req.user.id && ticket.status === 'pending') {
      update = await db.execute({
        sql: "UPDATE tickets SET status = 'cancelled' WHERE ticket_id = ? AND commuter_id = ? AND status = 'pending'",
        args: [parsedTicketId, req.user.id],
      });
    } else if (['accepted', 'rejected'].includes(status) && req.user.userType === 'driver'
      && ticket.status === 'pending' && !ticket.driver_id) {
      update = await db.execute({
        sql: 'UPDATE tickets SET status = ?, driver_id = ? WHERE ticket_id = ? AND status = \'pending\' AND driver_id IS NULL',
        args: [status, req.user.id, parsedTicketId],
      });
    } else if (status === 'completed' && req.user.userType === 'driver'
      && String(ticket.driver_id) === req.user.id && ticket.status === 'accepted') {
      update = await db.execute({
        sql: "UPDATE tickets SET status = 'completed' WHERE ticket_id = ? AND driver_id = ? AND status = 'accepted'",
        args: [parsedTicketId, req.user.id],
      });
    } else {
      return res.status(403).json({ error: 'This booking transition is not allowed.' });
    }
    if (update.rowsAffected !== 1) {
      return res.status(409).json({ error: 'This booking has already changed. Refresh and try again.' });
    }
    res.json({ message: `Booking ${status}.`, status });
  }));

  app.use('/api', router);
  app.use((error, _req, res, _next) => {
    console.error('Unhandled API error:', error);
    const status = error.status === 400 ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? 'Invalid JSON request body.' : 'An unexpected server error occurred.',
    });
  });
  return app;
}

const app = createApp();

if (require.main === module) {
  if (!databaseUrl) throw new Error('TURSO_DATABASE_URL is required to start the API.');
  databaseInitialization.then((initializationError) => {
    if (initializationError) throw initializationError;
  })
    .then(() => app.listen(process.env.PORT || 3001, () => console.log('Server running')))
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exitCode = 1;
    });
}

module.exports = app;
module.exports.createApp = createApp;
module.exports.createAccessToken = createAccessToken;
module.exports.verifyAccessToken = verifyAccessToken;
module.exports.ensureTablesExist = ensureTablesExist;
