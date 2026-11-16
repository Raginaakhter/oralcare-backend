import { Types } from 'mongoose';
import { MediaAsset, IMediaAsset, MediaCategory } from '../models/mediaAsset.model';
import { AppError } from '../utils/AppError';
import { safeDeleteUpload, UploadCategory } from '../middlewares/upload';

export interface SavedUpload {
  filename: string;
  url: string;
  path: string;
  mimeType: string;
  size: number;
}

export const recordUpload = async (
  file: Express.Multer.File,
  category: UploadCategory,
  actorId?: string
): Promise<IMediaAsset> => {
  const relPath = `${category}/${file.filename}`;
  return MediaAsset.create({
    filename: file.filename,
    url: `/uploads/${relPath}`,
    path: relPath,
    mimeType: file.mimetype,
    size: file.size,
    category: category as MediaCategory,
    uploadedBy: actorId ? new Types.ObjectId(actorId) : undefined,
  });
};

export const deleteMediaAsset = async (id: string): Promise<void> => {
  const asset = await MediaAsset.findById(id);
  if (!asset) throw new AppError('Media asset not found', 404);
  await safeDeleteUpload(asset.path);
  await asset.deleteOne();
};
