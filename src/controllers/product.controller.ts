import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../models/product.model';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { escapeRegex } from '../utils/escapeRegex';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const asPositiveInt = (value: unknown, fallback: number, max?: number): number => {
  if (typeof value !== 'string') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return max ? Math.min(n, max) : n;
};

const PRODUCT_WRITABLE_FIELDS = [
  'slug',
  'name',
  'price',
  'numericPrice',
  'rating',
  'reviews',
  'badge',
  'badgeColor',
  'img',
  'href',
  'category',
  'brand',
  'description',
  'inStock',
] as const;

const pickProductFields = (body: unknown): Partial<IProduct> => {
  if (typeof body !== 'object' || body === null) return {};
  const source = body as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of PRODUCT_WRITABLE_FIELDS) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked as Partial<IProduct>;
};

export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const category = asString(req.query.category);
  const brand = asString(req.query.brand);
  const search = asString(req.query.search);
  const page = asPositiveInt(req.query.page, 1);
  const limit = asPositiveInt(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const filter: FilterQuery<IProduct> = {};
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (search) {
    const safe = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: products.length,
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: products,
  });
});

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  const slug = asString(req.params.slug);
  if (!slug) throw new AppError('Product slug is required', 400);

  const product = await Product.findOne({ slug });
  if (!product) throw new AppError('Product not found', 404);

  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const payload = pickProductFields(req.body);
  const newProduct = await Product.create(payload);
  res.status(201).json({ success: true, data: newProduct });
});
