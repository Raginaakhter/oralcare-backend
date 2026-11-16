import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  createCategory as createCategorySvc,
  listCategories,
  findCategoryByIdOrSlug,
  updateCategory as updateCategorySvc,
  deleteCategory,
} from '../services/category.service';

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

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await createCategorySvc(req.body);
  res.status(201).json({
    success: true,
    message: 'Category created',
    data: category,
  });
});

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const parentRaw = req.query.parentCategory;
  const result = await listCategories(
    {
      search: asString(req.query.search),
      parentCategory:
        parentRaw === 'null' ? null : asString(parentRaw),
      isActive: asBool(req.query.isActive),
      page: asPositiveInt(req.query.page, 1),
      limit: asPositiveInt(req.query.limit, 50),
    },
    isAdmin(req)
  );
  res.json({ success: true, data: result });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const idOrSlug = asString(req.params.idOrSlug);
  if (!idOrSlug) throw new AppError('Category identifier required', 400);
  const category = await findCategoryByIdOrSlug(idOrSlug);
  res.json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Category id required', 400);
  const category = await updateCategorySvc(id, req.body);
  res.json({ success: true, message: 'Category updated', data: category });
});

export const removeCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Category id required', 400);
  await deleteCategory(id);
  res.json({ success: true, message: 'Category deleted' });
});
