import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { isProd, isTest } from '../config/env';
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
  clearRefreshCookieOptions,
} from '../utils/cookie';
import {
  registerUser,
  loginUser,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessionsForUser,
  verifyEmailWithToken,
  resendVerification,
  TokenPair,
} from '../services/auth.service';

const buildDeviceContext = (req: Request) => ({
  deviceInfo: req.get('user-agent')?.slice(0, 500),
  ipAddress: req.ip,
});

const sendRefreshCookie = (res: Response, pair: TokenPair): void => {
  res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, refreshCookieOptions());
};

const includeTestToken = (body: Record<string, unknown>, token?: string) => {
  if (!isProd && token) body._devVerificationToken = token;
  return body;
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body;
  const { userId, verificationToken } = await registerUser({
    fullName,
    email,
    password,
  });

  res.status(201).json(
    includeTestToken(
      {
        success: true,
        message: 'Registration successful. Check your email to verify your account.',
        data: { userId, email },
      },
      verificationToken
    )
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, tokens } = await loginUser({ email, password }, buildDeviceContext(req));

  sendRefreshCookie(res, tokens);

  res.json({
    success: true,
    data: {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: '15m',
    },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[
    REFRESH_COOKIE_NAME
  ];
  const bodyToken =
    typeof req.body === 'object' && req.body
      ? (req.body as Record<string, unknown>).refreshToken
      : undefined;
  const token = cookieToken || (typeof bodyToken === 'string' ? bodyToken : undefined);

  if (!token) throw new AppError('Refresh token missing', 401);

  try {
    const tokens = await rotateRefreshToken(token, buildDeviceContext(req));
    sendRefreshCookie(res, tokens);
    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        accessTokenExpiresIn: '15m',
      },
    });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
    throw err;
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[
    REFRESH_COOKIE_NAME
  ];
  if (cookieToken) await revokeSession(cookieToken);
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  res.json({ success: true, message: 'Logged out' });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Authentication required', 401);
  await revokeAllSessionsForUser(req.user.id);
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  res.json({ success: true, message: 'Logged out from all devices' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError('Authentication required', 401);
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError('User no longer exists', 404);
  res.json({ success: true, data: user.toJSON() });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  await verifyEmailWithToken(token);
  res.json({ success: true, message: 'Email verified successfully' });
});

export const resendVerificationEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await resendVerification(email);
    const body: Record<string, unknown> = {
      success: true,
      message:
        'If an account exists and is unverified, a new verification email has been sent.',
    };
    if (!isProd && isTest && result.verificationToken) {
      body._devVerificationToken = result.verificationToken;
    } else if (!isProd && result.verificationToken) {
      body._devVerificationToken = result.verificationToken;
    }
    res.json(body);
  }
);
