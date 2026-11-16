import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { User, UserRole } from '../models/user.model';
import { verifyAccessToken, AccessTokenPayload } from '../utils/tokens';
import { AppError } from '../utils/AppError';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  jti: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    return token || null;
  }
  return null;
};

const decode = (token: string): AccessTokenPayload => {
  try {
    return verifyAccessToken(token);
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new AppError('Access token expired', 401);
    }
    if (err instanceof JsonWebTokenError) {
      throw new AppError('Invalid access token', 401);
    }
    throw new AppError('Authentication failed', 401);
  }
};

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError('Authentication required', 401);

    const payload = decode(token);
    const user = await User.findById(payload.sub).select('_id role');
    if (!user) throw new AppError('User no longer exists', 401);

    req.user = {
      id: user._id.toString(),
      role: user.role,
      jti: payload.jti,
    };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...allowed: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!allowed.includes(req.user.role)) {
      return next(new AppError('Forbidden: insufficient privileges', 403));
    }
    next();
  };
