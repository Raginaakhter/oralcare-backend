import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  createProduct as createProductSvc,
  listProducts,
  findProductByIdOrSlug,
  updateProduct as updateProductSvc,
  softDeleteProduct,
  restoreProduct,
  permanentDeleteProduct,
  addProductImage,
  removeProductImage,
  setProductThumbnail,
  ListProductQuery,
} from '../services/product.service';
import {
  adjustStock,
  getStockHistory,
  listLowStock,
  listOutOfStock,
} from '../services/inventory.service';

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const asNumber = (v: unknown): number | undefined => {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

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

const parseListQuery = (q: Request['query']): ListProductQuery => ({
  search: asString(q.search),
  category: asString(q.category),
  subCategory: asString(q.subCategory),
  brand: asString(q.brand),
  minPrice: asNumber(q.minPrice),
  maxPrice: asNumber(q.maxPrice),
  stockStatus: asString(q.stockStatus) as ListProductQuery['stockStatus'],
  isFeatured: asBool(q.isFeatured),
  isActive: asBool(q.isActive),
  isPublished: asBool(q.isPublished),
  tag: asString(q.tag),
  sort: asString(q.sort) as ListProductQuery['sort'],
  page: asPositiveInt(q.page, 1),
  limit: asPositiveInt(q.limit, 20),
  includeDeleted: asBool(q.includeDeleted),
});

const isAdmin = (req: Request): boolean => req.user?.role === 'admin';

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await createProductSvc(req.body, req.user?.id);
  res.status(201).json({
    success: true,
    message: 'Product created',
    data: product,
  });
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await listProducts(parseListQuery(req.query), isAdmin(req));
  res.json({
    success: true,
    data: {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
  });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const idOrSlug = asString(req.params.idOrSlug);
  if (!idOrSlug) throw new AppError('Product identifier required', 400);
  const product = await findProductByIdOrSlug(idOrSlug, isAdmin(req));
  res.json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Product id required', 400);
  const product = await updateProductSvc(id, req.body, req.user?.id);
  res.json({ success: true, message: 'Product updated', data: product });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Product id required', 400);
  const hard = req.query.permanent === 'true';
  if (hard) {
    await permanentDeleteProduct(id);
    res.json({ success: true, message: 'Product permanently deleted' });
    return;
  }
  await softDeleteProduct(id);
  res.json({ success: true, message: 'Product moved to trash' });
});

export const restore = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Product id required', 400);
  const product = await restoreProduct(id);
  res.json({ success: true, message: 'Product restored', data: product });
});

export const addImage = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Product id required', 400);
  const product = await addProductImage(id, req.body);
  res.status(201).json({ success: true, message: 'Image added', data: product });
});

export const removeImage = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  const imageId = asString(req.params.imageId);
  if (!id || !imageId) throw new AppError('Identifiers required', 400);
  const product = await removeProductImage(id, imageId);
  res.json({ success: true, message: 'Image removed', data: product });
});

export const setThumbnail = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Product id required', 400);
  const product = await setProductThumbnail(id, req.body.thumbnail);
  res.json({ success: true, message: 'Thumbnail updated', data: product });
});

export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Product id required', 400);
  const { newQuantity, history } = await adjustStock(id, req.body, req.user?.id);
  res.json({
    success: true,
    message: 'Stock updated',
    data: { newQuantity, history },
  });
});

export const stockHistory = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Product id required', 400);
  const page = asPositiveInt(req.query.page, 1);
  const limit = asPositiveInt(req.query.limit, 50);
  const result = await getStockHistory(id, page, limit);
  res.json({ success: true, data: result });
});

export const lowStock = asyncHandler(async (req: Request, res: Response) => {
  const page = asPositiveInt(req.query.page, 1);
  const limit = asPositiveInt(req.query.limit, 50);
  const result = await listLowStock(page, limit);
  res.json({ success: true, data: result });
});

export const outOfStock = asyncHandler(async (req: Request, res: Response) => {
  const page = asPositiveInt(req.query.page, 1);
  const limit = asPositiveInt(req.query.limit, 50);
  const result = await listOutOfStock(page, limit);
  res.json({ success: true, data: result });
});
