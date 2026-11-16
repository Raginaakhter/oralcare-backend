import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { isProd } from '../config/env';
import { AppError } from '../utils/AppError';

interface MongoDuplicateKeyError extends Error {
  code: 11000;
  keyValue?: Record<string, unknown>;
}

const isDuplicateKeyError = (err: unknown): err is MongoDuplicateKeyError =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: number }).code === 11000;

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
  } else if (isDuplicateKeyError(err)) {
    statusCode = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    message = `Duplicate value for "${field}"`;
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(!isProd && err instanceof Error ? { stack: err.stack } : {}),
  });
};
