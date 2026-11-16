import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middlewares/auth';
import { makeUploader } from '../middlewares/upload';
import { uploadFor, deleteUploadCtrl } from '../controllers/upload.controller';
import { AppError } from '../utils/AppError';

const router = Router();
const admin = [requireAuth, requireRole('admin')] as const;

const bannerUploader = makeUploader('banner').single('file');
const footerUploader = makeUploader('footer').single('file');

// Wrap multer's error into our AppError shape so the normal errorHandler owns it.
const handleMulter = (
  uploader: (req: Request, res: Response, cb: (err?: unknown) => void) => void
) =>
  (req: Request, res: Response, next: NextFunction): void => {
    uploader(req, res, (err?: unknown) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large (max 5MB)'
            : err.message;
        return next(new AppError(message, 400));
      }
      if (err instanceof AppError) return next(err);
      next(new AppError('Upload failed', 400));
    });
  };

router.post('/banner', ...admin, handleMulter(bannerUploader), uploadFor('banner'));
router.post('/footer', ...admin, handleMulter(footerUploader), uploadFor('footer'));
router.delete('/:imageId', ...admin, deleteUploadCtrl);

export default router;
