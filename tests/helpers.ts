import request from 'supertest';
import type { Express } from 'express';
import { REFRESH_COOKIE_NAME } from '../src/utils/cookie';

export const TEST_USER = {
  fullName: 'Test User',
  email: 'test.user@example.com',
  password: 'Secret123!',
};

export interface RegisterResult {
  userId: string;
  verificationToken: string;
}

export const registerUser = async (
  app: Express,
  overrides: Partial<typeof TEST_USER> = {}
): Promise<RegisterResult> => {
  const payload = { ...TEST_USER, ...overrides };
  const res = await request(app).post('/api/v1/auth/register').send(payload);
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return {
    userId: res.body.data.userId,
    verificationToken: res.body._devVerificationToken,
  };
};

export interface LoginResult {
  accessToken: string;
  refreshCookie: string;
  refreshToken: string;
}

export const extractRefreshCookie = (res: request.Response): string => {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = cookies.find((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!cookie) throw new Error('refresh cookie not set on response');
  return cookie;
};

export const parseRefreshToken = (cookie: string): string => {
  const kv = cookie.split(';')[0];
  const idx = kv.indexOf('=');
  return decodeURIComponent(kv.slice(idx + 1));
};

export const loginUser = async (
  app: Express,
  email = TEST_USER.email,
  password = TEST_USER.password
): Promise<LoginResult> => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const cookie = extractRefreshCookie(res);
  return {
    accessToken: res.body.data.accessToken,
    refreshCookie: cookie,
    refreshToken: parseRefreshToken(cookie),
  };
};
