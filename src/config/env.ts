import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production' | 'test';
type SameSite = 'lax' | 'strict' | 'none';

const parsePort = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: "${raw}" (must be an integer 1-65535)`);
  }
  return port;
};

const parseNodeEnv = (raw: string | undefined): NodeEnv => {
  const value = (raw ?? 'development') as NodeEnv;
  if (value !== 'development' && value !== 'production' && value !== 'test') {
    throw new Error(
      `Invalid NODE_ENV: "${raw}" (expected development | production | test)`
    );
  }
  return value;
};

const parseSameSite = (raw: string | undefined, fallback: SameSite): SameSite => {
  const value = (raw ?? fallback).toLowerCase() as SameSite;
  if (value !== 'lax' && value !== 'strict' && value !== 'none') {
    throw new Error(`Invalid COOKIE_SAMESITE: "${raw}"`);
  }
  return value;
};

const parsePositiveInt = (
  name: string,
  raw: string | undefined,
  fallback: number
): number => {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid ${name}: "${raw}" (must be positive integer)`);
  }
  return n;
};

const requireEnv = (name: string, value: string | undefined): string => {
  if (!value || value.trim() === '' || value.includes('<') || value.includes('>')) {
    throw new Error(
      `Missing or placeholder-only env var: ${name}. Check your .env file.`
    );
  }
  return value;
};

const requireSecret = (name: string, value: string | undefined): string => {
  const v = requireEnv(name, value);
  if (v.length < 32) {
    throw new Error(
      `${name} is too short (${v.length} chars). Use at least 32 characters.`
    );
  }
  return v;
};

export const ENV = {
  PORT: parsePort(process.env.PORT, 5000),
  NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
  MONGODB_URI: requireEnv('MONGODB_URI', process.env.MONGODB_URI),
  MONGODB_URI_TEST: process.env.MONGODB_URI_TEST?.trim() || '',
  CLIENT_URL: process.env.CLIENT_URL?.trim() || 'http://localhost:3000',

  ACCESS_TOKEN_SECRET: requireSecret(
    'ACCESS_TOKEN_SECRET',
    process.env.ACCESS_TOKEN_SECRET
  ),
  REFRESH_TOKEN_SECRET: requireSecret(
    'REFRESH_TOKEN_SECRET',
    process.env.REFRESH_TOKEN_SECRET
  ),
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL?.trim() || '15m',
  REFRESH_TOKEN_TTL_DAYS: parsePositiveInt(
    'REFRESH_TOKEN_TTL_DAYS',
    process.env.REFRESH_TOKEN_TTL_DAYS,
    7
  ),
  EMAIL_VERIFICATION_TTL_MIN: parsePositiveInt(
    'EMAIL_VERIFICATION_TTL_MIN',
    process.env.EMAIL_VERIFICATION_TTL_MIN,
    30
  ),
  JWT_ISSUER: process.env.JWT_ISSUER?.trim() || 'oralcare-api',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE?.trim() || 'oralcare-client',
  BCRYPT_ROUNDS: parsePositiveInt('BCRYPT_ROUNDS', process.env.BCRYPT_ROUNDS, 12),

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN?.trim() || undefined,
  COOKIE_SAMESITE: parseSameSite(process.env.COOKIE_SAMESITE, 'lax'),

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() || '',
  CLAUDE_MODEL: process.env.CLAUDE_MODEL?.trim() || 'claude-opus-5-5',
} as const;

if (ENV.ACCESS_TOKEN_SECRET === ENV.REFRESH_TOKEN_SECRET) {
  throw new Error(
    'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different values'
  );
}

export const isProd = ENV.NODE_ENV === 'production';
export const isTest = ENV.NODE_ENV === 'test';
