const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { test } = require('node:test');
const { createAccessToken, createApp } = require('../server');

const secret = 'auth-flow-test-secret-with-more-than-thirty-two-characters';

class AuthDatabase {
  constructor() {
    this.users = new Map();
    this.challenges = new Map();
    this.googleNonces = new Map();
    this.rateLimits = new Map();
    this.nextUserId = 1;
  }

  async query(sql, args = []) {
    sql = sql.replace(/\s+/g, ' ').trim();

    if (sql.startsWith('DELETE FROM auth_rate_limits')) {
      for (const [key, value] of this.rateLimits) {
        if (value.windowStartedAt < args[0]) this.rateLimits.delete(key);
      }
      return { rowCount: 1 };
    }
    if (sql.startsWith('DELETE FROM auth_challenges')) {
      for (const [key, value] of this.challenges) {
        if (value.expiresAt < args[0]) this.challenges.delete(key);
      }
      return { rowCount: 1 };
    }
    if (sql.startsWith('DELETE FROM google_auth_nonces')) {
      for (const [key, value] of this.googleNonces) {
        if (value.expiresAt < args[0]) this.googleNonces.delete(key);
      }
      return { rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO auth_rate_limits')) {
      const [action, keyHash, now, resetBefore] = args;
      const key = `${action}:${keyHash}`;
      let limit = this.rateLimits.get(key);
      if (!limit || limit.windowStartedAt <= resetBefore) {
        limit = { windowStartedAt: now, attempts: 1 };
      } else {
        limit.attempts += 1;
      }
      this.rateLimits.set(key, limit);
      return { rows: [{ attempts: limit.attempts }], rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO auth_challenges')) {
      const [challengeId, userId, purpose, codeHash, expiresAt, createdAt] = args;
      this.challenges.set(challengeId, {
        challengeId, userId: String(userId), purpose, codeHash, expiresAt, createdAt,
        attempts: 0, consumedAt: null,
      });
      return { rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO google_auth_nonces')) {
      const [nonceHash, expiresAt, createdAt] = args;
      this.googleNonces.set(nonceHash, { expiresAt, createdAt, consumedAt: null });
      return { rowCount: 1 };
    }
    if (sql.startsWith('UPDATE google_auth_nonces SET consumed_at = $1')) {
      const [consumedAt, nonceHash, now] = args;
      const nonce = this.googleNonces.get(nonceHash);
      if (!nonce || nonce.consumedAt !== null || nonce.expiresAt <= now) return { rowCount: 0 };
      nonce.consumedAt = consumedAt;
      return { rowCount: 1 };
    }
    if (sql.startsWith('UPDATE auth_challenges SET consumed_at = $1 WHERE user_id = $2')) {
      const [consumedAt, userId, purpose] = args;
      for (const challenge of this.challenges.values()) {
        if (challenge.userId === String(userId) && challenge.purpose === purpose && challenge.consumedAt === null) {
          challenge.consumedAt = consumedAt;
        }
      }
      return { rowCount: 1 };
    }
    if (sql.startsWith('UPDATE auth_challenges SET consumed_at = $1 WHERE challenge_id = $2')) {
      const [consumedAt, challengeId, expiresAt, codeHash] = args;
      const challenge = this.challenges.get(challengeId);
      if (!challenge || challenge.consumedAt !== null || challenge.expiresAt <= expiresAt
        || challenge.codeHash !== codeHash) return { rowCount: 0 };
      challenge.consumedAt = consumedAt;
      return { rowCount: 1 };
    }
    if (sql.startsWith('UPDATE auth_challenges SET attempts = attempts + 1')) {
      const [challengeId, now, maxAttempts] = args;
      const challenge = this.challenges.get(challengeId);
      if (!challenge || challenge.consumedAt !== null || challenge.expiresAt <= now
        || challenge.attempts >= maxAttempts) return { rowCount: 0 };
      challenge.attempts += 1;
      return { rowCount: 1 };
    }
    if (sql.startsWith('SELECT c.challenge_id')) {
      const [email, purpose] = args;
      const user = [...this.users.values()].find((item) => item.email === email);
      const challenge = [...this.challenges.values()]
        .filter((item) => item.userId === String(user?.user_id)
          && item.purpose === purpose && item.consumedAt === null)
        .sort((left, right) => right.createdAt - left.createdAt)[0];
      return {
        rows: challenge
          ? [{ challenge_id: challenge.challengeId, user_id: challenge.userId,
            code_hash: challenge.codeHash, expires_at: challenge.expiresAt, attempts: challenge.attempts }]
          : [],
      };
    }
    if (sql.startsWith('INSERT INTO users')) {
      let user;
      if (sql.includes("VALUES ('commuter'")) {
        const [username, email, password, googleSub] = args;
        user = {
          user_id: this.nextUserId++, user_type: 'commuter', username, email, password,
          email_verified: 1, google_sub: googleSub, auth_version: 0,
        };
      } else {
        const [userType, username, email, password, license, nationalId, driverName, plate] = args;
        user = {
          user_id: this.nextUserId++, user_type: userType, username, email, password, license_number: license,
          id_number: nationalId, driver_name: driverName, vehicle_license_plate: plate,
          email_verified: 0, google_sub: null, auth_version: 0,
        };
      }
      if ([...this.users.values()].some((item) => item.email === user.email)) {
        const error = new Error('duplicate key value violates unique constraint');
        error.code = '23505';
        throw error;
      }
      this.users.set(String(user.user_id), user);
      return { rows: [{ user_id: String(user.user_id) }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT user_id, user_type, username, email, auth_version, email_verified FROM users WHERE user_id')) {
      const user = this.users.get(String(args[0]));
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith('SELECT user_id, username, email, user_type, password, auth_version, email_verified')) {
      const user = [...this.users.values()].find((item) => item.email === args[0]);
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith('SELECT user_id, email FROM users WHERE email = $1 AND email_verified = 0')) {
      const user = [...this.users.values()].find((item) => item.email === args[0] && item.email_verified === 0);
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith('SELECT user_id, email FROM users WHERE email = $1')) {
      const user = [...this.users.values()].find((item) => item.email === args[0]);
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith('SELECT user_id, username, email, user_type, google_sub, auth_version FROM users WHERE google_sub')) {
      const user = [...this.users.values()].find((item) => item.google_sub === args[0]);
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith('SELECT user_id, username, email, user_type, google_sub, auth_version FROM users WHERE email')) {
      const user = [...this.users.values()].find((item) => item.email === args[0]);
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith('SELECT user_id FROM users WHERE email = $1 AND user_id != $2')) {
      const user = [...this.users.values()].find((item) => item.email === args[0] && item.user_id !== Number(args[1]));
      return { rows: user ? [{ user_id: user.user_id }] : [] };
    }
    if (sql.startsWith('UPDATE users SET email = $1, google_sub = $2, email_verified = 1')) {
      const [email, googleSub, userId] = args;
      const user = this.users.get(String(userId));
      if (!user || (user.google_sub && user.google_sub !== googleSub)) return { rowCount: 0 };
      user.email = email;
      user.google_sub = googleSub;
      user.email_verified = 1;
      return { rowCount: 1 };
    }
    if (sql.startsWith('SELECT user_id, username, email, user_type, auth_version FROM users WHERE google_sub')) {
      const user = [...this.users.values()].find((item) => item.google_sub === args[0]);
      return { rows: user ? [user] : [] };
    }
    if (sql.startsWith('UPDATE users SET email_verified = 1 WHERE user_id = $1')) {
      const user = this.users.get(String(args[0]));
      if (user) user.email_verified = 1;
      return { rowCount: user ? 1 : 0 };
    }
    if (sql.startsWith('UPDATE users SET password = $1, email_verified = 1, auth_version = auth_version + 1')) {
      const [password, userId] = args;
      const user = this.users.get(String(userId));
      if (!user) return { rowCount: 0 };
      user.password = password;
      user.email_verified = 1;
      user.auth_version += 1;
      return { rowCount: 1 };
    }
    throw new Error(`Unexpected auth test SQL: ${sql}`);
  }
}

async function withHarness(run, { googleVerifier } = {}) {
  const db = new AuthDatabase();
  const deliveries = [];
  let now = Date.now();
  const server = createServer(createApp({
    db,
    secret,
    clock: () => now,
    googleClientIds: ['test-google-client'],
    googleVerifier: googleVerifier || (async () => {
      throw new Error('Google token verification was not configured for this test.');
    }),
    sendEmail: async (message) => { deliveries.push(message); },
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, body, token) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return { response, data };
  };
  try {
    await run({ db, deliveries, request, setNow: (value) => { now = value; } });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const registerBody = {
  userType: 'commuter',
  username: 'Rider',
  email: 'rider@example.com',
  password: 'initial-password-123',
};

test('email registration verifies once before login or protected API access', async () => {
  await withHarness(async ({ db, deliveries, request }) => {
    const registration = await request('/register', registerBody);
    assert.equal(registration.response.status, 202);
    assert.match(deliveries[0].code, /^\d{6}$/);
    const storedChallenge = [...db.challenges.values()][0];
    assert.notEqual(storedChallenge.codeHash, deliveries[0].code);

    const unverifiedLogin = await request('/login', {
      email: registerBody.email, password: registerBody.password,
    });
    assert.equal(unverifiedLogin.response.status, 403);
    const legacyToken = createAccessToken('1', secret);
    const protectedRequest = await request('/users/me', undefined, legacyToken);
    assert.equal(protectedRequest.response.status, 403);

    const verified = await request('/auth/verify-email', {
      email: registerBody.email, code: deliveries[0].code,
    });
    assert.equal(verified.response.status, 200);
    const login = await request('/login', { email: registerBody.email, password: registerBody.password });
    assert.equal(login.response.status, 200);
    const replay = await request('/auth/verify-email', {
      email: registerBody.email, code: deliveries[0].code,
    });
    assert.equal(replay.response.status, 400);
  });
});

test('verification codes expire and resend/forgot responses do not reveal account existence', async () => {
  await withHarness(async ({ deliveries, request, setNow }) => {
    const registration = await request('/register', registerBody);
    assert.equal(registration.response.status, 202);
    const code = deliveries[0].code;
    setNow(Date.now() + 16 * 60 * 1000);
    const expired = await request('/auth/verify-email', { email: registerBody.email, code });
    assert.equal(expired.response.status, 400);

    const known = await request('/auth/forgot-password', { email: registerBody.email });
    const unknown = await request('/auth/forgot-password', { email: 'nobody@example.com' });
    assert.equal(known.response.status, 202);
    assert.deepEqual(known.data, unknown.data);
  });
});

test('email verification codes stop working after the guess limit', async () => {
  await withHarness(async ({ deliveries, request }) => {
    await request('/register', registerBody);
    const wrongCode = deliveries[0].code === '000000' ? '000001' : '000000';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wrong = await request('/auth/verify-email', {
        email: registerBody.email, code: wrongCode,
      });
      assert.equal(wrong.response.status, 400);
    }
    const correctAfterLimit = await request('/auth/verify-email', {
      email: registerBody.email, code: deliveries[0].code,
    });
    assert.equal(correctAfterLimit.response.status, 400);
  });
});

test('password reset consumes its code and revokes existing sessions', async () => {
  await withHarness(async ({ deliveries, request }) => {
    await request('/register', registerBody);
    await request('/auth/verify-email', {
      email: registerBody.email, code: deliveries[0].code,
    });
    const originalLogin = await request('/login', {
      email: registerBody.email, password: registerBody.password,
    });
    const recovery = await request('/auth/forgot-password', { email: registerBody.email });
    assert.equal(recovery.response.status, 202);
    const resetCode = deliveries[1].code;
    const reset = await request('/auth/reset-password', {
      email: registerBody.email, code: resetCode, password: 'replacement-password-456',
    });
    assert.equal(reset.response.status, 200);

    const oldSession = await request('/users/me', undefined, originalLogin.data.token);
    assert.equal(oldSession.response.status, 401);
    const oldPassword = await request('/login', { email: registerBody.email, password: registerBody.password });
    assert.equal(oldPassword.response.status, 401);
    const newPassword = await request('/login', {
      email: registerBody.email, password: 'replacement-password-456',
    });
    assert.equal(newPassword.response.status, 200);
    const replay = await request('/auth/reset-password', {
      email: registerBody.email, code: resetCode, password: 'another-password-789',
    });
    assert.equal(replay.response.status, 400);
  });
});

test('password reset explicitly verifies a legacy account email', async () => {
  await withHarness(async ({ db, deliveries, request }) => {
    const legacyUser = {
      user_id: 1, user_type: 'commuter', username: 'Legacy', email: 'legacy@example.com',
      password: 'legacy-password-hash', email_verified: 0, google_sub: null, auth_version: 0,
    };
    db.users.set('1', legacyUser);
    db.nextUserId = 2;
    await request('/auth/forgot-password', { email: legacyUser.email });
    const reset = await request('/auth/reset-password', {
      email: legacyUser.email, code: deliveries[0].code, password: 'new-legacy-password-789',
    });
    assert.equal(reset.response.status, 200);
    assert.equal(legacyUser.email_verified, 1);
    const login = await request('/login', {
      email: legacyUser.email, password: 'new-legacy-password-789',
    });
    assert.equal(login.response.status, 200);
  });
});

test('Google ID tokens are audience-checked, nonce-bound, one-time, and link verified email safely', async () => {
  const googleVerifier = async (idToken, audiences) => {
    assert.deepEqual(audiences, ['test-google-client']);
    if (!idToken.startsWith('verified-google-token:')) throw new Error('Invalid token');
    return {
      sub: 'google-subject-1',
      email: registerBody.email,
      email_verified: true,
      name: 'Rider Google',
      nonce: idToken.slice('verified-google-token:'.length),
    };
  };
  await withHarness(async ({ db, request }) => {
    const legacyUser = {
      user_id: 1, user_type: 'commuter', username: 'Rider', email: registerBody.email,
      password: 'legacy-hash', email_verified: 0, google_sub: null, auth_version: 0,
    };
    db.users.set('1', legacyUser);
    db.nextUserId = 2;

    const challenge = await request('/auth/google/nonce', {});
    assert.equal(challenge.response.status, 200);
    const nonce = challenge.data.nonce;
    const rejected = await request('/auth/google', { idToken: 'invalid', nonce });
    assert.equal(rejected.response.status, 401);
    assert.equal(legacyUser.email_verified, 0);
    const accepted = await request('/auth/google', { idToken: `verified-google-token:${nonce}`, nonce });
    assert.equal(accepted.response.status, 200);
    assert.equal(legacyUser.email_verified, 1);
    assert.equal(legacyUser.google_sub, 'google-subject-1');
    const protectedRequest = await request('/users/me', undefined, accepted.data.token);
    assert.equal(protectedRequest.response.status, 200);
    assert.equal(protectedRequest.data.userType, 'commuter');
    const replay = await request('/auth/google', { idToken: `verified-google-token:${nonce}`, nonce });
    assert.equal(replay.response.status, 401);
  }, { googleVerifier });
});

test('expired Google login nonce cannot be exchanged', async () => {
  const googleVerifier = async (idToken) => ({
    sub: 'google-subject-expired',
    email: 'expired@example.com',
    email_verified: true,
    nonce: idToken,
  });
  await withHarness(async ({ request, setNow }) => {
    const challenge = await request('/auth/google/nonce', {});
    assert.equal(challenge.response.status, 200);
    setNow(Date.now() + 6 * 60 * 1000);
    const expired = await request('/auth/google', {
      idToken: challenge.data.nonce,
      nonce: challenge.data.nonce,
    });
    assert.equal(expired.response.status, 401);
  }, { googleVerifier });
});

test('email challenge issuance is rate limited by email and responses remain generic', async () => {
  await withHarness(async ({ request }) => {
    const responses = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      responses.push(await request('/auth/forgot-password', { email: 'nobody@example.com' }));
    }
    assert.deepEqual(responses.slice(0, 3).map(({ response }) => response.status), [202, 202, 202]);
    assert.equal(responses[3].response.status, 429);
  });
});
