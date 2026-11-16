import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  createBanner as createBannerSvc,
  listBanners,
  getBannerById,
  updateBanner as updateBannerSvc,
  deleteBanner as deleteBannerSvc,
  toggleBannerStatus,
  reorderBanners,
  listActiveBanners,
  ListBannerQuery,
} from '../services/banner.service';

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const asBool = (v: unknown): boolean | undefined => {
  if (typeof v !== 'string') return undefined;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
};

const asPositiveInt = (v: unknown, fallback: number): number => {
  if (typeof v !== 'string') return fallback;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const parseListQuery = (q: Request['query']): ListBannerQuery => ({
  search: asString(q.search),
  isActive: asBool(q.isActive),
  isPublished: asBool(q.isPublished),
  page: asPositiveInt(q.page, 1),
  limit: asPositiveInt(q.limit, 20),
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await createBannerSvc(req.body, req.user?.id);
  res.status(201).json({
    success: true,
    message: 'Banner created',
    data: banner,
  });
});

export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const result = await listBanners(parseListQuery(req.query));
  res.json({ success: true, data: result });
});

export const getBanner = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Banner id required', 400);
  const banner = await getBannerById(id);
  res.json({ success: true, data: banner });
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Banner id required', 400);
  const banner = await updateBannerSvc(id, req.body, req.user?.id);
  res.json({ success: true, message: 'Banner updated', data: banner });
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Banner id required', 400);
  await deleteBannerSvc(id);
  res.json({ success: true, message: 'Banner deleted' });
});

export const patchBannerStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Banner id required', 400);
  const banner = await toggleBannerStatus(id, req.body, req.user?.id);
  res.json({ success: true, message: 'Banner status updated', data: banner });
});

export const reorderBannersCtrl = asyncHandler(async (req: Request, res: Response) => {
  const modified = await reorderBanners(req.body);
  res.json({
    success: true,
    message: 'Banner order updated',
    data: { modifiedCount: modified },
  });
});

export const getActiveBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await listActiveBanners();
  res.json({ success: true, data: banners });
});
