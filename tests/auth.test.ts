import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../src/app';
import { connectDB, disconnectDB } from '../src/config/db';
import { ENV } from '../src/config/env';
import { User } from '../src/models/user.model';
import { Session } from '../src/models/session.model';
import { VerificationToken } from '../src/models/verificationToken.model';
import {
  TEST_USER,
  registerUser,
  loginUser,
  extractRefreshCookie,
  parseRefreshToken,
} from './helpers';
import { signAccessToken } from '../src/utils/tokens';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Session.deleteMany({}),
    VerificationToken.deleteMany({}),
  ]);
});

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns 201 with a verification token', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(TEST_USER);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeTruthy();
    expect(res.body.data.email).toBe(TEST_USER.email);
    // Dev-only convenience echo of the raw verification token
    expect(res.body._devVerificationToken).toBeTruthy();

    const user = await User.findOne({ email: TEST_USER.email });
    expect(user).toBeTruthy();
    expect(user!.password).not.toBe(TEST_USER.password);
    expect(user!.isEmailVerified).toBe(false);
  });

  it('rejects duplicate email registration with 409', async () => {
    await registerUser(app);
    const res = await request(app).post('/api/v1/auth/register').send(TEST_USER);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('rejects weak password with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...TEST_USER, password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await registerUser(app);
  });

  it('returns 200 with access token and sets refresh cookie on valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(TEST_USER.email);

    const cookie = extractRefreshCookie(res);
    expect(cookie).toContain('HttpOnly');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: TEST_USER.email,
      password: 'WrongPass123',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'does-not-exist@example.com',
      password: TEST_USER.password,
    });
    expect(res.status).toBe(401);
  });

  it('creates a new session on each login (multi-device support)', async () => {
    await loginUser(app);
    await loginUser(app);
    const sessions = await Session.find({});
    expect(sessions).toHaveLength(2);
    expect(sessions[0].tokenFamilyId).not.toBe(sessions[1].tokenFamilyId);
  });
});

describe('Access token verification', () => {
  it('signs a verifiable token with iss/aud/jti/sub/role claims', async () => {
    const token = signAccessToken('507f1f77bcf86cd799439011', 'user');
    const payload = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET) as Record<
      string,
      unknown
    >;
    expect(payload.sub).toBe('507f1f77bcf86cd799439011');
    expect(payload.role).toBe('user');
    expect(payload.iss).toBe(ENV.JWT_ISSUER);
    expect(payload.aud).toBe(ENV.JWT_AUDIENCE);
    expect(payload.jti).toBeTruthy();
    expect(payload.iat).toBeTruthy();
    expect(payload.exp).toBeTruthy();
  });

  it('rejects an expired access token on a protected route', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const expiredToken = jwt.sign(
      {
        sub: userId,
        role: 'user',
        jti: 'test-jti',
      },
      ENV.ACCESS_TOKEN_SECRET,
      {
        algorithm: 'HS256',
        issuer: ENV.JWT_ISSUER,
        audience: ENV.JWT_AUDIENCE,
        expiresIn: -10,
      }
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('rejects tampered/invalid tokens', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('rejects missing Authorization header on protected routes', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  beforeEach(async () => {
    await registerUser(app);
  });

  it('rotates refresh token successfully and issues a fresh access token', async () => {
    const { refreshCookie } = await loginUser(app);
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    const newCookie = extractRefreshCookie(res);
    expect(parseRefreshToken(newCookie)).not.toBe(parseRefreshToken(refreshCookie));
  });

  it('rejects an already-rotated (old) refresh token with 401', async () => {
    const { refreshCookie } = await loginUser(app);
    await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/reuse detected/i);
  });

  it('revokes the entire token family on reuse detection', async () => {
    const { refreshCookie } = await loginUser(app);
    // First rotation: issues new session S2 (same family)
    const r1 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    const s2Cookie = extractRefreshCookie(r1);

    // Reuse the old (now-revoked) token → family revoke
    await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);

    // S2 should now be revoked too
    const r2 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', s2Cookie);
    expect(r2.status).toBe(401);

    const active = await Session.find({ revokedAt: null });
    expect(active).toHaveLength(0);
  });

  it('rejects an expired refresh token with 401', async () => {
    const { refreshCookie, refreshToken } = await loginUser(app);
    // Force-expire the session in the DB
    const { hashRefreshToken } = await import('../src/utils/tokens');
    await Session.updateOne(
      { tokenHash: hashRefreshToken(refreshToken) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('rejects refresh when no cookie or body token provided', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/missing/i);
  });

  it('supports concurrent-ish refresh calls: one wins, others rejected', async () => {
    const { refreshCookie } = await loginUser(app);
    const [a, b] = await Promise.all([
      request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie),
      request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie),
    ]);
    const statuses = [a.status, b.status].sort();
    // One rotates successfully (200), the other hits reuse-detection (401).
    // Both 200 would indicate the rotation isn't atomic; both 401 indicates nobody won.
    expect(statuses[0]).toBe(200);
    expect(statuses[1]).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  beforeEach(async () => {
    await registerUser(app);
  });

  it('revokes the current refresh session and clears the cookie', async () => {
    const { refreshCookie } = await loginUser(app);
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(200);

    // Subsequent refresh with the same cookie should now fail
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(refreshRes.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout-all', () => {
  beforeEach(async () => {
    await registerUser(app);
  });

  it('revokes all sessions for the user across devices', async () => {
    const s1 = await loginUser(app);
    const s2 = await loginUser(app);

    const res = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${s1.accessToken}`);
    expect(res.status).toBe(200);

    const r1 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', s1.refreshCookie);
    const r2 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', s2.refreshCookie);

    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/auth/logout-all');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user for a valid access token', async () => {
    await registerUser(app);
    const { accessToken } = await loginUser(app);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(TEST_USER.email);
    expect(res.body.data.password).toBeUndefined();
  });
});

describe('Email verification', () => {
  it('verifies email with a valid token and rejects reuse', async () => {
    const { verificationToken } = await registerUser(app);

    const ok = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken });
    expect(ok.status).toBe(200);

    const user = await User.findOne({ email: TEST_USER.email });
    expect(user!.isEmailVerified).toBe(true);

    const reuse = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken });
    expect(reuse.status).toBe(400);
    expect(reuse.body.message).toMatch(/already used/i);
  });

  it('rejects an expired verification token', async () => {
    const { verificationToken } = await registerUser(app);
    const { hashVerificationToken } = await import('../src/utils/tokens');
    await VerificationToken.updateOne(
      { tokenHash: hashVerificationToken(verificationToken) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('issues a fresh verification token on resend, invalidating the old one', async () => {
    const { verificationToken: oldToken } = await registerUser(app);

    const resend = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: TEST_USER.email });
    expect(resend.status).toBe(200);
    const newToken = resend.body._devVerificationToken;
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);

    // Old token must no longer verify
    const oldAttempt = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: oldToken });
    expect(oldAttempt.status).toBe(400);

    // New token must verify
    const newAttempt = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: newToken });
    expect(newAttempt.status).toBe(200);
  });
});
