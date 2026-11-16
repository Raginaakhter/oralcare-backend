import { CookieOptions } from 'express';
import { ENV, isProd } from '../config/env';

export const REFRESH_COOKIE_NAME = 'refresh_token';

export const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd || ENV.COOKIE_SAMESITE === 'none',
  sameSite: ENV.COOKIE_SAMESITE,
  domain: ENV.COOKIE_DOMAIN,
  path: '/api/v1/auth',
  maxAge: ENV.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
});

export const clearRefreshCookieOptions = (): CookieOptions => {
  const opts = refreshCookieOptions();
  delete opts.maxAge;
  return opts;
};
