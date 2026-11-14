import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production' | 'test';

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

const requireEnv = (name: string, value: string | undefined): string => {
  if (!value || value.trim() === '' || value.includes('<') || value.includes('>')) {
    throw new Error(
      `Missing or placeholder-only env var: ${name}. Check your .env file.`
    );
  }
  return value;
};

export const ENV = {
  PORT: parsePort(process.env.PORT, 5000),
  NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
  MONGODB_URI: requireEnv('MONGODB_URI', process.env.MONGODB_URI),
  CLIENT_URL: process.env.CLIENT_URL?.trim() || 'http://localhost:3000',
} as const;

export const isProd = ENV.NODE_ENV === 'production';
