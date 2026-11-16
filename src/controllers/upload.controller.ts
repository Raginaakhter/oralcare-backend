import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { UploadCategory } from '../middlewares/upload';
import { recordUpload, deleteMediaAsset } from '../services/mediaAsset.service';

const requireFile = (req: Request): Express.Multer.File => {
  if (!req.file) throw new AppError('No file uploaded (field name must be "file")', 400);
  return req.file;
};

export const uploadFor = (category: UploadCategory) =>
  asyncHandler(async (req: Request, res: Response) => {
    const file = requireFile(req);
    const asset = await recordUpload(file, category, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Upload complete',
      data: {
        id: asset._id.toString(),
        filename: asset.filename,
        url: asset.url,
        mimeType: asset.mimeType,
        size: asset.size,
        category: asset.category,
      },
    });
  });

export const deleteUploadCtrl = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.imageId;
  if (!id || !/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError('Valid media asset id required', 400);
  }
  await deleteMediaAsset(id);
  res.json({ success: true, message: 'Upload deleted' });
});
