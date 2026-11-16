import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  createBrand as createBrandSvc,
  listBrands,
  findBrandByIdOrSlug,
  updateBrand as updateBrandSvc,
  deleteBrand,
} from '../services/brand.service';

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

const isAdmin = (req: Request): boolean => req.user?.role === 'admin';

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await createBrandSvc(req.body);
  res.status(201).json({ success: true, message: 'Brand created', data: brand });
});

export const getBrands = asyncHandler(async (req: Request, res: Response) => {
  const result = await listBrands(
    {
      search: asString(req.query.search),
      isActive: asBool(req.query.isActive),
      page: asPositiveInt(req.query.page, 1),
      limit: asPositiveInt(req.query.limit, 50),
    },
    isAdmin(req)
  );
  res.json({ success: true, data: result });
});

export const getBrand = asyncHandler(async (req: Request, res: Response) => {
  const idOrSlug = asString(req.params.idOrSlug);
  if (!idOrSlug) throw new AppError('Brand identifier required', 400);
  const brand = await findBrandByIdOrSlug(idOrSlug);
  res.json({ success: true, data: brand });
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Brand id required', 400);
  const brand = await updateBrandSvc(id, req.body);
  res.json({ success: true, message: 'Brand updated', data: brand });
});

export const removeBrand = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Brand id required', 400);
  await deleteBrand(id);
  res.json({ success: true, message: 'Brand deleted' });
});
