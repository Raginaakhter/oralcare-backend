import { FilterQuery, Types } from 'mongoose';
import { Product, IProduct } from '../models/product.model';
import { Category } from '../models/category.model';
import { Brand } from '../models/brand.model';
import { AppError } from '../utils/AppError';
import { uniqueSlug } from '../utils/slug';
import { escapeRegex } from '../utils/escapeRegex';
import {
  CreateProductInput,
  UpdateProductInput,
  AddProductImageInput,
} from '../schemas/product.schemas';

const slugExists = async (
  slug: string,
  excludeId?: string
): Promise<boolean> => {
  const q: FilterQuery<IProduct> = { slug };
  if (excludeId) q._id = { $ne: new Types.ObjectId(excludeId) };
  return (await Product.exists(q)) !== null;
};

const assertRefsExist = async (input: {
  category?: string;
  subCategory?: string | null;
  brand?: string | null;
}): Promise<void> => {
  if (input.category) {
    const ok = await Category.exists({ _id: input.category });
    if (!ok) throw new AppError(`Category ${input.category} does not exist`, 400);
  }
  if (input.subCategory) {
    const ok = await Category.exists({ _id: input.subCategory });
    if (!ok)
      throw new AppError(`SubCategory ${input.subCategory} does not exist`, 400);
  }
  if (input.brand) {
    const ok = await Brand.exists({ _id: input.brand });
    if (!ok) throw new AppError(`Brand ${input.brand} does not exist`, 400);
  }
};

export const createProduct = async (
  input: CreateProductInput,
  actorId?: string
): Promise<IProduct> => {
  await assertRefsExist({
    category: input.category,
    subCategory: input.subCategory,
    brand: input.brand,
  });

  const existingSku = await Product.exists({ sku: input.sku });
  if (existingSku) throw new AppError('SKU already in use', 409);

  const slug = await uniqueSlug(input.slug || input.productName, slugExists);

  const payload: Record<string, unknown> = {
    ...input,
    slug,
    specifications: new Map(Object.entries(input.specifications ?? {})),
  };
  if (actorId) {
    payload.createdBy = new Types.ObjectId(actorId);
    payload.updatedBy = new Types.ObjectId(actorId);
  }

  const product = await Product.create(payload);
  return product;
};

export interface ListProductQuery {
  search?: string;
  category?: string;
  subCategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock';
  isFeatured?: boolean;
  isActive?: boolean;
  isPublished?: boolean;
  tag?: string;
  sort?: 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'popularity';
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

const MAX_LIMIT = 100;

export const listProducts = async (
  query: ListProductQuery,
  isAdmin: boolean
): Promise<{
  items: IProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(MAX_LIMIT, Math.max(1, Math.floor(query.limit ?? 20)));
  const filter: FilterQuery<IProduct> = {};

  if (!isAdmin) {
    filter.isDeleted = false;
    filter.isActive = true;
    filter.isPublished = true;
  } else {
    if (!query.includeDeleted) filter.isDeleted = false;
    if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
    if (typeof query.isPublished === 'boolean')
      filter.isPublished = query.isPublished;
  }

  if (query.category) filter.category = new Types.ObjectId(query.category);
  if (query.subCategory)
    filter.subCategory = new Types.ObjectId(query.subCategory);
  if (query.brand) filter.brand = new Types.ObjectId(query.brand);
  if (typeof query.isFeatured === 'boolean') filter.isFeatured = query.isFeatured;
  if (query.tag) filter.tags = query.tag;

  if (typeof query.minPrice === 'number' || typeof query.maxPrice === 'number') {
    filter.regularPrice = {};
    if (typeof query.minPrice === 'number')
      (filter.regularPrice as Record<string, number>).$gte = query.minPrice;
    if (typeof query.maxPrice === 'number')
      (filter.regularPrice as Record<string, number>).$lte = query.maxPrice;
  }

  if (query.stockStatus === 'out-of-stock') {
    filter.stockQuantity = 0;
  } else if (query.stockStatus === 'low-stock') {
    filter.$expr = {
      $and: [
        { $gt: ['$stockQuantity', 0] },
        { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      ],
    };
  } else if (query.stockStatus === 'in-stock') {
    filter.$expr = { $gt: ['$stockQuantity', '$lowStockThreshold'] };
  }

  if (query.search) {
    const safe = escapeRegex(query.search);
    const re = new RegExp(safe, 'i');
    filter.$or = [
      { productName: re },
      { sku: re },
      { description: re },
      { shortDescription: re },
    ];
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    'price-asc': { regularPrice: 1 },
    'price-desc': { regularPrice: -1 },
    popularity: { isFeatured: -1, createdAt: -1 },
  };
  const sort = sortMap[query.sort ?? 'newest'] ?? sortMap.newest;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('brand', 'name slug'),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

const isObjectIdString = (s: string): boolean => /^[a-f\d]{24}$/i.test(s);

export const findProductByIdOrSlug = async (
  idOrSlug: string,
  isAdmin: boolean
): Promise<IProduct> => {
  const filter: FilterQuery<IProduct> = isObjectIdString(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };

  if (!isAdmin) {
    filter.isDeleted = false;
    filter.isActive = true;
    filter.isPublished = true;
  }

  const product = await Product.findOne(filter)
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .populate('brand', 'name slug');

  if (!product) throw new AppError('Product not found', 404);
  return product;
};

export const updateProduct = async (
  id: string,
  input: UpdateProductInput,
  actorId?: string
): Promise<IProduct> => {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw new AppError('Product not found', 404);

  await assertRefsExist({
    category: input.category,
    subCategory: input.subCategory ?? undefined,
    brand: input.brand ?? undefined,
  });

  if (input.sku && input.sku !== product.sku) {
    const dup = await Product.exists({
      sku: input.sku,
      _id: { $ne: product._id },
    });
    if (dup) throw new AppError('SKU already in use', 409);
  }

  if (input.slug) {
    const dup = await slugExists(input.slug, product._id.toString());
    if (dup) throw new AppError('Slug already in use', 409);
  }

  // Cross-field: if updating one of these but not the other, validate against stored value.
  const newRegular = input.regularPrice ?? product.regularPrice;
  const newSaleRaw = 'salePrice' in input ? input.salePrice : product.salePrice;
  if (
    newSaleRaw !== undefined &&
    newSaleRaw !== null &&
    newSaleRaw > newRegular
  ) {
    throw new AppError(
      'salePrice must be less than or equal to regularPrice',
      400
    );
  }

  Object.assign(product, input);
  if (input.specifications) {
    product.specifications = new Map(Object.entries(input.specifications));
  }
  if (actorId) product.updatedBy = new Types.ObjectId(actorId);

  await product.save();
  return product;
};

export const softDeleteProduct = async (id: string): Promise<void> => {
  const res = await Product.updateOne(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), isPublished: false } }
  );
  if (res.matchedCount === 0) throw new AppError('Product not found', 404);
};

export const restoreProduct = async (id: string): Promise<IProduct> => {
  const product = await Product.findOneAndUpdate(
    { _id: id, isDeleted: true },
    { $set: { isDeleted: false, deletedAt: null } },
    { new: true }
  );
  if (!product) throw new AppError('Product not found or not deleted', 404);
  return product;
};

export const permanentDeleteProduct = async (id: string): Promise<void> => {
  const res = await Product.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError('Product not found', 404);
};

export const addProductImage = async (
  id: string,
  image: AddProductImageInput
): Promise<IProduct> => {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw new AppError('Product not found', 404);
  product.images.push({
    url: image.url,
    alt: image.alt,
    order: image.order ?? product.images.length,
  });
  await product.save();
  return product;
};

export const removeProductImage = async (
  id: string,
  imageId: string
): Promise<IProduct> => {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw new AppError('Product not found', 404);

  const before = product.images.length;
  product.images = product.images.filter(
    (img) => img._id?.toString() !== imageId
  );
  if (product.images.length === before) {
    throw new AppError('Image not found on product', 404);
  }
  await product.save();
  return product;
};

export const setProductThumbnail = async (
  id: string,
  thumbnail: string
): Promise<IProduct> => {
  const product = await Product.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { thumbnail } },
    { new: true }
  );
  if (!product) throw new AppError('Product not found', 404);
  return product;
};
