import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { verifyAccessToken } from '../utils/tokens';

// Best-effort auth: if a valid Bearer token is present, attach req.user.
// Never throws — downstream handlers decide what to do without req.user.
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();

    const token = header.slice(7).trim();
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('_id role');
    if (user) {
      req.user = {
        id: user._id.toString(),
        role: user.role,
        jti: payload.jti,
      };
    }
  } catch {
    // Silently ignore any auth errors on optional routes.
  }
  next();
};
