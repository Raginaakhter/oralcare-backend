import { v4 as uuid } from 'uuid';
import { User, IUser } from '../models/user.model';
import { Session } from '../models/session.model';
import { VerificationToken } from '../models/verificationToken.model';
import { AppError } from '../utils/AppError';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  generateEmailVerificationToken,
  hashVerificationToken,
  emailVerificationExpiry,
} from '../utils/tokens';
import {
  sendVerificationEmail,
} from './mailer.service';

export interface DeviceContext {
  deviceInfo?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const createSession = async (
  userId: string,
  ctx: DeviceContext,
  tokenFamilyId: string
): Promise<string> => {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = refreshTokenExpiry();

  await Session.create({
    userId,
    tokenHash,
    tokenFamilyId,
    deviceInfo: ctx.deviceInfo,
    ipAddress: ctx.ipAddress,
    expiresAt,
    lastUsedAt: new Date(),
  });

  return refreshToken;
};

const issueTokenPair = async (
  user: Pick<IUser, '_id' | 'role'>,
  ctx: DeviceContext,
  tokenFamilyId: string
): Promise<TokenPair> => {
  const refreshToken = await createSession(user._id.toString(), ctx, tokenFamilyId);
  const accessToken = signAccessToken(user._id.toString(), user.role);
  return {
    accessToken,
    refreshToken,
    refreshExpiresAt: refreshTokenExpiry(),
  };
};

export const registerUser = async (input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ userId: string; verificationToken: string }> => {
  const existing = await User.findOne({ email: input.email }).select('_id');
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    fullName: input.fullName,
    email: input.email,
    password: passwordHash,
  });

  const rawToken = generateEmailVerificationToken();
  await VerificationToken.create({
    userId: user._id,
    tokenHash: hashVerificationToken(rawToken),
    purpose: 'email-verify',
    expiresAt: emailVerificationExpiry(),
  });

  await sendVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    token: rawToken,
  });

  return { userId: user._id.toString(), verificationToken: rawToken };
};

export const loginUser = async (
  input: { email: string; password: string },
  ctx: DeviceContext
): Promise<{ user: IUser; tokens: TokenPair }> => {
  const user = await User.findOne({ email: input.email }).select(
    '+password _id email role isEmailVerified fullName createdAt updatedAt'
  );
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const ok = await verifyPassword(input.password, user.password);
  if (!ok) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = await issueTokenPair(user, ctx, uuid());
  return { user, tokens };
};

export const rotateRefreshToken = async (
  rawToken: string,
  ctx: DeviceContext
): Promise<TokenPair> => {
  const tokenHash = hashRefreshToken(rawToken);
  const now = new Date();

  // Atomically claim the session: match only unrevoked, unexpired rows.
  // At most one concurrent request can win this update.
  const claimed = await Session.findOneAndUpdate(
    { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, lastUsedAt: now } },
    { new: false }
  );

  if (claimed) {
    const user = await User.findById(claimed.userId).select('_id role');
    if (!user) throw new AppError('User no longer exists', 401);
    return issueTokenPair(user, ctx, claimed.tokenFamilyId);
  }

  // Did not claim — either the session does not exist, was already
  // revoked (reuse), or has expired. Disambiguate for the caller.
  const existing = await Session.findOne({ tokenHash });
  if (!existing) {
    throw new AppError('Invalid refresh token', 401);
  }
  if (existing.revokedAt) {
    await Session.updateMany(
      { tokenFamilyId: existing.tokenFamilyId, revokedAt: null },
      { $set: { revokedAt: now } }
    );
    throw new AppError('Refresh token reuse detected; family revoked', 401);
  }
  // Only remaining case: expired.
  await Session.updateOne({ _id: existing._id }, { $set: { revokedAt: now } });
  throw new AppError('Refresh token expired', 401);
};

export const revokeSession = async (rawToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(rawToken);
  await Session.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

export const revokeAllSessionsForUser = async (userId: string): Promise<void> => {
  await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

export const verifyEmailWithToken = async (rawToken: string): Promise<void> => {
  const tokenHash = hashVerificationToken(rawToken);
  const record = await VerificationToken.findOne({
    tokenHash,
    purpose: 'email-verify',
  });

  if (!record) {
    throw new AppError('Invalid verification token', 400);
  }

  if (record.usedAt) {
    throw new AppError('Verification token already used', 400);
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError('Verification token expired', 400);
  }

  record.usedAt = new Date();
  await record.save();

  await User.updateOne(
    { _id: record.userId },
    { $set: { isEmailVerified: true } }
  );
};

export const resendVerification = async (
  email: string
): Promise<{ delivered: boolean; verificationToken?: string }> => {
  const user = await User.findOne({ email }).select('_id email fullName isEmailVerified');

  // Respond the same whether or not the user exists to avoid email enumeration.
  if (!user || user.isEmailVerified) {
    return { delivered: false };
  }

  // Invalidate any outstanding tokens for this user and purpose.
  await VerificationToken.updateMany(
    { userId: user._id, purpose: 'email-verify', usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  const rawToken = generateEmailVerificationToken();
  await VerificationToken.create({
    userId: user._id,
    tokenHash: hashVerificationToken(rawToken),
    purpose: 'email-verify',
    expiresAt: emailVerificationExpiry(),
  });

  await sendVerificationEmail({
    to: user.email,
    fullName: user.fullName,
    token: rawToken,
  });

  return { delivered: true, verificationToken: rawToken };
};
