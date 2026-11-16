import crypto from 'crypto';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { ENV } from '../config/env';
import { UserRole } from '../models/user.model';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  jti: string;
  iss: string;
  aud: string | string[];
}

export const signAccessToken = (userId: string, role: UserRole): string => {
  const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    sub: userId,
    role,
    jti: uuid(),
    iss: ENV.JWT_ISSUER,
    aud: ENV.JWT_AUDIENCE,
  };

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: ENV.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, ENV.ACCESS_TOKEN_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET, {
    algorithms: ['HS256'],
    issuer: ENV.JWT_ISSUER,
    audience: ENV.JWT_AUDIENCE,
  });

  if (typeof decoded === 'string') {
    throw new Error('Unexpected token payload shape');
  }
  return decoded as AccessTokenPayload;
};

// Refresh tokens are cryptographically random 32-byte strings, HMAC-hashed
// with the refresh secret before storage. They are opaque to clients.
export const generateRefreshToken = (): string =>
  crypto.randomBytes(48).toString('base64url');

export const hashRefreshToken = (token: string): string =>
  crypto.createHmac('sha256', ENV.REFRESH_TOKEN_SECRET).update(token).digest('hex');

export const generateEmailVerificationToken = (): string =>
  crypto.randomBytes(32).toString('hex');

export const hashVerificationToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const refreshTokenExpiry = (): Date => {
  const ms = ENV.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
};

export const emailVerificationExpiry = (): Date => {
  const ms = ENV.EMAIL_VERIFICATION_TTL_MIN * 60 * 1000;
  return new Date(Date.now() + ms);
};
