import { config as loadEnv } from 'dotenv';

// Must happen BEFORE importing any app module that reads env.
loadEnv();

process.env.NODE_ENV = 'test';

const testUri = process.env.MONGODB_URI_TEST;
if (!testUri) {
  throw new Error('MONGODB_URI_TEST is required to run tests.');
}
process.env.MONGODB_URI = testUri;

// Fail fast if JWT secrets are missing in CI.
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error(
    'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set for tests.'
  );
}
