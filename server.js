const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const EMAIL_CODE_TTL_SECONDS = 15 * 60;
const GOOGLE_NONCE_TTL_SECONDS = 5 * 60;
const MAX_EMAIL_CODE_ATTEMPTS = 5;
const GENERIC_EMAIL_MESSAGE = 'If the address is eligible, instructions will be sent by email.';
const googleOAuthClient = new OAuth2Client();
let lastAuthDataCleanup = 0;
const allowedOrigins = new Set([
  'http://localhost:8081',
  'http://localhost:19006',
  process.env.EXPO_PUBLIC_WEB_ORIGIN,
].filter(Boolean));
const developmentSecret = crypto.randomBytes(32).toString('hex');
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (process.env.NODE_ENV === 'production' && !databaseUrl) {
  throw new Error('DATABASE_URL (or NEON_DATABASE_URL) is required in production.');
}
const database = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
if (database) {
  database.on('error', (error) => console.error('Unexpected PostgreSQL pool error:', error.code || 'DATABASE_ERROR'));
}
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

function validEmail(value) {
  return typeof value === 'string'
    && value.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validText(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function createEmailSender(env = process.env) {
  const user = env.SMTP_USER;
  const password = env.SMTP_APP_PASSWORD;
  if (!user || !password) return null;

  const port = Number(env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number.isInteger(port) && port > 0 ? port : 465,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : true,
    auth: { user, pass: password },
  });
  const from = env.EMAIL_FROM || `QuickMatatu <${user}>`;

  return ({ to, purpose, code }) => {
    const verification = purpose === 'verify_email';
    return transport.sendMail({
      from,
      to,
      subject: verification ? 'Verify your QuickMatatu email' : 'Reset your QuickMatatu password',
      text: `Your QuickMatatu ${verification ? 'email verification' : 'password reset'} code is ${code}. `
        + `It expires in 15 minutes. If you did not request this, you can ignore this message.`,
    });
  };
}

async function verifyGoogleIdToken(idToken, audiences) {
  const ticket = await googleOAuthClient.verifyIdToken({ idToken, audience: audiences });
  return ticket.getPayload();
}

function hashGoogleNonce(nonce, secret) {
  return crypto.createHmac('sha256', secret).update(`quickmatatu-google-nonce:${nonce}`).digest('hex');
}

function hashEmailCode(challengeId, code, secret) {
  return crypto.createHmac('sha256', secret)
    .update(`quickmatatu-auth-code:${challengeId}:${code}`)
    .digest('hex');
}

function safeEqualHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string'
    || !/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

async function consumeRateLimit(db, secret, action, identifier, limit, windowSeconds, nowSeconds) {
  if (nowSeconds - lastAuthDataCleanup >= 3600) {
    await db.query('DELETE FROM auth_rate_limits WHERE window_started_at < $1', [nowSeconds - 86_400]);
    await db.query('DELETE FROM auth_challenges WHERE expires_at < $1', [nowSeconds - 86_400]);
    await db.query('DELETE FROM google_auth_nonces WHERE expires_at < $1', [nowSeconds]);
    lastAuthDataCleanup = nowSeconds;
  }
  const keyHash = crypto.createHmac('sha256', secret)
    .update(`${action}:${identifier}`)
    .digest('hex');
  const result = await db.query(
    `INSERT INTO auth_rate_limits (action, key_hash, window_started_at, attempts)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT(action, key_hash) DO UPDATE SET
        attempts = CASE WHEN auth_rate_limits.window_started_at <= $4
          THEN 1 ELSE auth_rate_limits.attempts + 1 END,
        window_started_at = CASE WHEN auth_rate_limits.window_started_at <= $5
          THEN $6 ELSE auth_rate_limits.window_started_at END
      RETURNING attempts`,
    [action, keyHash, nowSeconds, nowSeconds - windowSeconds, nowSeconds - windowSeconds, nowSeconds],
  );
  const attempts = Number(result.rows[0]?.attempts);
  return Number.isSafeInteger(attempts) && attempts <= limit;
}

async function isAuthRequestAllowed(db, secret, req, action, email, limit, windowSeconds, nowSeconds) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const [emailAllowed, ipAllowed] = await Promise.all([
    consumeRateLimit(db, secret, `${action}:email`, email, limit, windowSeconds, nowSeconds),
    consumeRateLimit(db, secret, `${action}:ip`, ip, limit * 5, windowSeconds, nowSeconds),
  ]);
  return emailAllowed && ipAllowed;
}

async function issueEmailCode(db, sendEmail, secret, clock, userId, email, purpose) {
  const nowSeconds = Math.floor(clock() / 1000);
  const challengeId = crypto.randomUUID();
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const codeHash = hashEmailCode(challengeId, code, secret);
  await db.query('DELETE FROM auth_challenges WHERE expires_at < $1', [nowSeconds - 86_400]);
  await db.query(
    `UPDATE auth_challenges SET consumed_at = $1
      WHERE user_id = $2 AND purpose = $3 AND consumed_at IS NULL`,
    [nowSeconds, userId, purpose],
  );
  await db.query(
    `INSERT INTO auth_challenges
      (challenge_id, user_id, purpose, code_hash, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)`,
    [challengeId, userId, purpose, codeHash, nowSeconds + EMAIL_CODE_TTL_SECONDS, nowSeconds],
  );
  try {
    await sendEmail({ to: email, purpose, code });
  } catch (error) {
    console.error('Auth email delivery failed:', { purpose, code: error.code || 'SMTP_ERROR' });
    await db.query(
      'UPDATE auth_challenges SET consumed_at = $1 WHERE challenge_id = $2 AND consumed_at IS NULL',
      [nowSeconds, challengeId],
    );
    return false;
  }
  return true;
}

async function consumeEmailCode(db, email, purpose, code, secret, clock) {
  if (!/^\d{6}$/.test(code || '')) return null;
  const result = await db.query(
    `SELECT c.challenge_id, c.user_id, c.code_hash, c.expires_at, c.attempts
      FROM auth_challenges c JOIN users u ON u.user_id = c.user_id
      WHERE u.email = $1 AND c.purpose = $2 AND c.consumed_at IS NULL
      ORDER BY c.created_at DESC LIMIT 1`,
    [email, purpose],
  );
  const challenge = result.rows[0];
  const nowSeconds = Math.floor(clock() / 1000);
  if (!challenge || Number(challenge.expires_at) <= nowSeconds
    || Number(challenge.attempts) >= MAX_EMAIL_CODE_ATTEMPTS) return null;

  const attempted = await db.query(
    `UPDATE auth_challenges SET attempts = attempts + 1
      WHERE challenge_id = $1 AND consumed_at IS NULL AND expires_at > $2 AND attempts < $3
      RETURNING challenge_id`,
    [challenge.challenge_id, nowSeconds, MAX_EMAIL_CODE_ATTEMPTS],
  );
  if (attempted.rowCount !== 1) return null;

  const submittedHash = hashEmailCode(challenge.challenge_id, code, secret);
  if (!safeEqualHex(submittedHash, challenge.code_hash)) return null;

  const consumed = await db.query(
    `UPDATE auth_challenges SET consumed_at = $1
      WHERE challenge_id = $2 AND consumed_at IS NULL AND expires_at > $3 AND code_hash = $4
      RETURNING challenge_id`,
    [nowSeconds, challenge.challenge_id, nowSeconds, submittedHash],
  );
  return consumed.rowCount === 1 ? String(challenge.user_id) : null;
}

function positiveIntegerId(value) {
  const formatted = String(value);
  if (!/^[1-9]\d*$/.test(formatted)) return null;
  const id = Number(formatted);
  return Number.isSafeInteger(id) ? id : null;
}

function createApp({
  db = database,
  secret = process.env.SESSION_SECRET || developmentSecret,
  sendEmail = createEmailSender(),
  googleVerifier = verifyGoogleIdToken,
  googleClientIds = (process.env.GOOGLE_OAUTH_CLIENT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean),
  clock = Date.now,
} = {}) {
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

  router.use((_req, res, next) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    next();
  });

  const requireAuth = async (req, res, next) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    const tokenUser = verifyAccessToken(token, sessionSecret);
    if (!tokenUser) return res.status(401).json({ error: 'Authentication required.' });

    try {
      const result = await db.query(
        'SELECT user_id, user_type, username, email, auth_version, email_verified FROM users WHERE user_id = $1',
        [tokenUser.id],
      );
      if (!result.rows.length) return res.status(401).json({ error: 'Authentication required.' });
      const user = result.rows[0];
      if (Number(user.email_verified) !== 1) {
        return res.status(403).json({ error: 'Verify your email before using your account.' });
      }
      if (tokenUser.version !== Number(user.auth_version || 0)) {
        return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
      }
      req.user = {
        id: String(user.user_id),
        userType: user.user_type,
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

  router.get('/', (_req, res) => res.send('QuickMatatu API is running'));

  router.post('/register', asyncRoute(async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    if (!sendEmail) return res.status(503).json({ error: 'Email delivery is not configured.' });
    const {
      userType, username, email, password, license, nationalId,
      driverName, vehicleLicensePlate,
    } = req.body;
    const normalizedEmail = normalizeEmail(email);
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
    const nowSeconds = Math.floor(clock() / 1000);
    if (!await isAuthRequestAllowed(db, sessionSecret, req, 'register', normalizedEmail, 3, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await db.query(
        `INSERT INTO users
          (user_type, username, email, password, license_number, id_number, driver_name,
            vehicle_license_plate, email_verified)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
          RETURNING user_id`,
        [
          userType, cleanUsername, normalizedEmail, hashedPassword,
          userType === 'driver' ? license.trim() : null,
          userType === 'driver' ? nationalId.trim() : null,
          userType === 'driver' ? driverName.trim() : null,
          userType === 'driver' ? vehicleLicensePlate.trim().toUpperCase() : null,
        ],
      );
      await issueEmailCode(db, sendEmail, sessionSecret, clock,
        result.rows[0].user_id, normalizedEmail, 'verify_email');
      res.status(202).json({ message: GENERIC_EMAIL_MESSAGE, email: normalizedEmail });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(202).json({ message: GENERIC_EMAIL_MESSAGE, email: normalizedEmail });
      }
      console.error('Register Error:', error);
      res.status(500).json({ error: 'Registration failed.' });
    }
  }));

  router.post('/login', asyncRoute(async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || typeof password !== 'string') {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }
    const nowSeconds = Math.floor(clock() / 1000);
    if (!await isAuthRequestAllowed(db, sessionSecret, req, 'login', email, 10, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    const result = await db.query(
      `SELECT user_id, username, email, user_type, password, auth_version, email_verified
        FROM users WHERE email = $1`,
      [email],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (Number(user.email_verified) !== 1) {
      return res.status(403).json({ error: 'Verify your email before signing in.' });
    }

    res.json({
      message: 'Login successful',
      token: createAccessToken(user.user_id, sessionSecret, Date.now(), Number(user.auth_version || 0)),
      user: { id: String(user.user_id), username: user.username, email: user.email, userType: user.user_type },
    });
  }));

  router.post('/auth/verify-email', asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { code } = req.body;
    if (!validEmail(email) || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the email address and six-digit code.' });
    }
    const nowSeconds = Math.floor(clock() / 1000);
    if (!await isAuthRequestAllowed(db, sessionSecret, req, 'verify_email', email, 10, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many attempts. Request a new code and try later.' });
    }
    const userId = await consumeEmailCode(db, email, 'verify_email', code, sessionSecret, clock);
    if (!userId) return res.status(400).json({ error: 'The code is invalid or expired.' });
    await db.query('UPDATE users SET email_verified = 1 WHERE user_id = $1', [userId]);
    res.json({ message: 'Email verified. You can now sign in.' });
  }));

  router.post('/auth/resend-verification', asyncRoute(async (req, res) => {
    if (!sendEmail) return res.status(503).json({ error: 'Email delivery is not configured.' });
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const nowSeconds = Math.floor(clock() / 1000);
    if (!await isAuthRequestAllowed(db, sessionSecret, req, 'resend_verification', email, 3, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    const result = await db.query(
      'SELECT user_id, email FROM users WHERE email = $1 AND email_verified = 0',
      [email],
    );
    if (result.rows[0]) {
      await issueEmailCode(db, sendEmail, sessionSecret, clock,
        result.rows[0].user_id, result.rows[0].email, 'verify_email');
    }
    res.status(202).json({ message: GENERIC_EMAIL_MESSAGE });
  }));

  router.post('/auth/forgot-password', asyncRoute(async (req, res) => {
    if (!sendEmail) return res.status(503).json({ error: 'Email delivery is not configured.' });
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const nowSeconds = Math.floor(clock() / 1000);
    if (!await isAuthRequestAllowed(db, sessionSecret, req, 'forgot_password', email, 3, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    const result = await db.query('SELECT user_id, email FROM users WHERE email = $1', [email]);
    if (result.rows[0]) {
      await issueEmailCode(db, sendEmail, sessionSecret, clock,
        result.rows[0].user_id, result.rows[0].email, 'reset_password');
    }
    res.status(202).json({ message: GENERIC_EMAIL_MESSAGE });
  }));

  router.post('/auth/reset-password', asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { code, password } = req.body;
    if (!validEmail(email) || typeof code !== 'string' || !/^\d{6}$/.test(code)
      || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Enter a valid email, six-digit code, and password of at least 8 characters.' });
    }
    const nowSeconds = Math.floor(clock() / 1000);
    if (!await isAuthRequestAllowed(db, sessionSecret, req, 'reset_password', email, 10, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many attempts. Request a new code and try later.' });
    }
    const userId = await consumeEmailCode(db, email, 'reset_password', code, sessionSecret, clock);
    if (!userId) return res.status(400).json({ error: 'The code is invalid or expired.' });
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.query(
      `UPDATE users SET password = $1, email_verified = 1, auth_version = auth_version + 1
        WHERE user_id = $2`,
      [hashedPassword, userId],
    );
    res.json({ message: 'Password reset. You can now sign in.' });
  }));

  router.post('/auth/google/nonce', asyncRoute(async (req, res) => {
    if (!googleClientIds.length) return res.status(503).json({ error: 'Google sign-in is not configured.' });
    const nowSeconds = Math.floor(clock() / 1000);
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!await consumeRateLimit(db, sessionSecret, 'google_nonce_ip', ip, 10, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    const nonce = crypto.randomBytes(32).toString('base64url');
    await db.query(
      'INSERT INTO google_auth_nonces (nonce_hash, expires_at, created_at) VALUES ($1, $2, $3)',
      [hashGoogleNonce(nonce, sessionSecret), nowSeconds + GOOGLE_NONCE_TTL_SECONDS, nowSeconds],
    );
    res.json({ nonce });
  }));

  router.post('/auth/google', asyncRoute(async (req, res) => {
    if (!googleClientIds.length) return res.status(503).json({ error: 'Google sign-in is not configured.' });
    const { idToken, nonce } = req.body;
    if (typeof idToken !== 'string' || idToken.length > 16_384
      || typeof nonce !== 'string' || nonce.length > 128) {
      return res.status(400).json({ error: 'A Google ID token and login nonce are required.' });
    }
    const nowSeconds = Math.floor(clock() / 1000);
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!await consumeRateLimit(db, sessionSecret, 'google_sign_in_ip', ip, 30, 900, nowSeconds)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    let profile;
    try {
      profile = await googleVerifier(idToken, googleClientIds);
    } catch {
      return res.status(401).json({ error: 'Unable to sign in with Google.' });
    }
    const email = normalizeEmail(profile?.email);
    if (!validEmail(email) || profile?.email_verified !== true
      || typeof profile?.sub !== 'string' || !validText(profile.sub, 255)
      || profile?.nonce !== nonce) {
      return res.status(401).json({ error: 'Unable to sign in with Google.' });
    }
    const nonceUsed = await db.query(
      `UPDATE google_auth_nonces SET consumed_at = $1
        WHERE nonce_hash = $2 AND consumed_at IS NULL AND expires_at > $3
        RETURNING nonce_hash`,
      [nowSeconds, hashGoogleNonce(nonce, sessionSecret), nowSeconds],
    );
    if (nonceUsed.rowCount !== 1) {
      return res.status(401).json({ error: 'Unable to sign in with Google.' });
    }

    let userResult = await db.query(
      `SELECT user_id, username, email, user_type, google_sub, auth_version
        FROM users WHERE google_sub = $1`,
      [profile.sub],
    );
    let user = userResult.rows[0];
    if (!user) {
      userResult = await db.query(
        `SELECT user_id, username, email, user_type, google_sub, auth_version
          FROM users WHERE email = $1`,
        [email],
      );
      user = userResult.rows[0];
    }

    try {
      if (user) {
        if (user.google_sub && user.google_sub !== profile.sub) {
          return res.status(401).json({ error: 'Unable to sign in with Google.' });
        }
        const collision = await db.query(
          'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
          [email, user.user_id],
        );
        if (collision.rows.length) return res.status(401).json({ error: 'Unable to sign in with Google.' });
        await db.query(
          `UPDATE users SET email = $1, google_sub = $2, email_verified = 1
            WHERE user_id = $3 AND (google_sub IS NULL OR google_sub = $4)`,
          [email, profile.sub, user.user_id, profile.sub],
        );
      } else {
        const randomPassword = crypto.randomBytes(32).toString('base64url');
        const passwordHash = await bcrypt.hash(randomPassword, 12);
        const displayName = validText(profile.name, 60)
          ? profile.name.trim()
          : email.split('@')[0].slice(0, 60) || 'Google user';
        await db.query(
          `INSERT INTO users (user_type, username, email, password, email_verified, google_sub)
            VALUES ('commuter', $1, $2, $3, 1, $4)`,
          [displayName, email, passwordHash, profile.sub],
        );
      }
    } catch (error) {
      if (error.code === '23505') {
        return res.status(401).json({ error: 'Unable to sign in with Google.' });
      }
      throw error;
    }

    const authenticated = await db.query(
      `SELECT user_id, username, email, user_type, auth_version
        FROM users WHERE google_sub = $1`,
      [profile.sub],
    );
    const signedInUser = authenticated.rows[0];
    if (!signedInUser) return res.status(401).json({ error: 'Unable to sign in with Google.' });
    res.json({
      message: 'Login successful',
      token: createAccessToken(signedInUser.user_id, sessionSecret, clock(), Number(signedInUser.auth_version || 0)),
      user: {
        id: String(signedInUser.user_id),
        username: signedInUser.username,
        email: signedInUser.email,
        userType: signedInUser.user_type,
      },
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
    await db.query('UPDATE users SET auth_version = auth_version + 1 WHERE user_id = $1', [req.user.id]);
    if (req.user.userType === 'driver') {
      await db.query(
        'UPDATE active_drivers SET is_active = FALSE, last_updated = CURRENT_TIMESTAMP WHERE driver_id = $1',
        [req.user.id],
      );
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
    await db.query(
      `INSERT INTO active_drivers (driver_id, latitude, longitude, is_active, last_updated)
        VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
        ON CONFLICT(driver_id) DO UPDATE SET latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude, is_active = TRUE, last_updated = CURRENT_TIMESTAMP`,
      [req.user.id, latitude, longitude],
    );
    res.json({ success: true });
  }));
  router.delete('/driver/location', requireAuth, requireRole('driver'), asyncRoute(async (req, res) => {
    await db.query(
      'UPDATE active_drivers SET is_active = FALSE, last_updated = CURRENT_TIMESTAMP WHERE driver_id = $1',
      [req.user.id],
    );
    res.json({ success: true });
  }));
  router.get('/active-matatus', asyncRoute(async (_req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const result = await db.query(`
      SELECT ad.driver_id, ad.latitude, ad.longitude, ad.last_updated, u.username
      FROM active_drivers ad JOIN users u ON ad.driver_id = u.user_id
      WHERE ad.is_active = TRUE AND ad.last_updated > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
        AND ad.latitude IS NOT NULL AND ad.longitude IS NOT NULL
        AND ad.latitude BETWEEN -90 AND 90 AND ad.longitude BETWEEN -180 AND 180
        AND u.user_type = 'driver'
    `);
    res.json(result.rows);
  }));

  router.get('/routes', asyncRoute(async (_req, res) => {
    if (!db) return res.status(503).json({ error: 'Database is not configured.' });
    const result = await db.query(`
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
    const routeResult = await db.query(
      `SELECT route_id, start_point FROM routes WHERE route_id = $1
        AND start_point IS NOT NULL AND trim(start_point) <> ''
        AND end_point IS NOT NULL AND trim(end_point) <> ''`,
      [parsedRouteId],
    );
    const route = routeResult.rows[0];
    if (!route) return res.status(404).json({ error: 'This route is not currently available for requests.' });
    if (typeof pickupPoint !== 'string' || pickupPoint.trim() !== route.start_point.trim()) {
      return res.status(400).json({ error: 'Choose the starting point recorded for this route.' });
    }
    const result = await db.query(
      `INSERT INTO tickets (commuter_id, route_id, pickup_point, booking_time, status)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'pending')
        RETURNING ticket_id`,
      [req.user.id, route.route_id, route.start_point],
    );
    res.status(201).json({
      message: 'Ride request submitted. Acceptance does not verify vehicle assignment or seat availability.',
      ticketId: String(result.rows[0].ticket_id),
      status: 'pending',
    });
  }));
  router.get('/user/bookings/:userId', requireAuth, requireRole('commuter'), asyncRoute(async (req, res) => {
    if (String(req.params.userId) !== req.user.id) {
      return res.status(403).json({ error: 'You may only view your own bookings.' });
    }
    const result = await db.query(
      `SELECT t.ticket_id, t.route_id, t.pickup_point, t.booking_time, t.status,
          r.route_name, r.start_point, r.end_point, r.estimated_duration
        FROM tickets t JOIN routes r ON t.route_id = r.route_id
        WHERE t.commuter_id = $1 ORDER BY t.booking_time DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  }));
  router.get('/driver/bookings', requireAuth, requireRole('driver'), asyncRoute(async (_req, res) => {
    const result = await db.query(`
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
    const result = await db.query(
      `SELECT t.ticket_id, t.route_id, t.pickup_point, t.booking_time, t.status,
          r.route_name, r.start_point, r.end_point, u.username AS commuter_name
        FROM tickets t JOIN routes r ON t.route_id = r.route_id
          JOIN users u ON t.commuter_id = u.user_id
        WHERE t.driver_id = $1 ORDER BY t.booking_time DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  }));
  router.post('/update-booking-status', requireAuth, asyncRoute(async (req, res) => {
    const { ticket_id: ticketId, status } = req.body;
    const parsedTicketId = positiveIntegerId(ticketId);
    if (!parsedTicketId
      || !['cancelled', 'accepted', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'A valid booking and status are required.' });
    }
    const ticketResult = await db.query(
      'SELECT ticket_id, commuter_id, driver_id, status FROM tickets WHERE ticket_id = $1',
      [parsedTicketId],
    );
    const ticket = ticketResult.rows[0];
    if (!ticket) return res.status(404).json({ error: 'Booking not found.' });

    let update;
    if (status === 'cancelled' && req.user.userType === 'commuter'
      && String(ticket.commuter_id) === req.user.id && ticket.status === 'pending') {
      update = await db.query(
        `UPDATE tickets SET status = 'cancelled'
          WHERE ticket_id = $1 AND commuter_id = $2 AND status = 'pending'
          RETURNING ticket_id`,
        [parsedTicketId, req.user.id],
      );
    } else if (['accepted', 'rejected'].includes(status) && req.user.userType === 'driver'
      && ticket.status === 'pending' && !ticket.driver_id) {
      update = await db.query(
        `UPDATE tickets SET status = $1, driver_id = $2
          WHERE ticket_id = $3 AND status = 'pending' AND driver_id IS NULL
          RETURNING ticket_id`,
        [status, req.user.id, parsedTicketId],
      );
    } else if (status === 'completed' && req.user.userType === 'driver'
      && String(ticket.driver_id) === req.user.id && ticket.status === 'accepted') {
      update = await db.query(
        `UPDATE tickets SET status = 'completed'
          WHERE ticket_id = $1 AND driver_id = $2 AND status = 'accepted'
          RETURNING ticket_id`,
        [parsedTicketId, req.user.id],
      );
    } else {
      return res.status(403).json({ error: 'This booking transition is not allowed.' });
    }
    if (update.rowCount !== 1) {
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
  if (!databaseUrl) throw new Error('DATABASE_URL (or NEON_DATABASE_URL) is required to start the API.');
  app.listen(process.env.PORT || 3001, () => console.log('Server running'));
}

module.exports = app;
module.exports.createApp = createApp;
module.exports.createAccessToken = createAccessToken;
module.exports.verifyAccessToken = verifyAccessToken;
