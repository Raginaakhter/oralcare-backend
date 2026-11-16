import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const CATEGORIES = ['banner', 'footer', 'product'] as const;
export type UploadCategory = (typeof CATEGORIES)[number];

for (const c of CATEGORIES) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, c), { recursive: true });
}

export const uploadRoot = UPLOAD_ROOT;

export const safeDeleteUpload = async (relPath: string): Promise<boolean> => {
  // Resolve, then confirm the result is still inside UPLOAD_ROOT.
  const abs = path.resolve(UPLOAD_ROOT, relPath);
  if (!abs.startsWith(UPLOAD_ROOT + path.sep) && abs !== UPLOAD_ROOT) {
    throw new AppError('Invalid file path', 400);
  }
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw err;
  }
};

const buildStorage = (category: UploadCategory) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOAD_ROOT, category));
    },
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] ?? path.extname(file.originalname);
      const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, name);
    },
  });

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError(`Unsupported image type: ${file.mimetype}`, 400));
    return;
  }
  cb(null, true);
};

export const makeUploader = (category: UploadCategory) =>
  multer({
    storage: buildStorage(category),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter,
  });

export const buildPublicUrl = (
  category: UploadCategory,
  filename: string
): string => `/uploads/${category}/${filename}`;

export const relativePathFor = (
  category: UploadCategory,
  filename: string
): string => path.join(category, filename);
