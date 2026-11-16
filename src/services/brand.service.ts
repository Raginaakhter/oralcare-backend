import { FilterQuery, Types } from 'mongoose';
import { Brand, IBrand } from '../models/brand.model';
import { Product } from '../models/product.model';
import { AppError } from '../utils/AppError';
import { uniqueSlug } from '../utils/slug';
import { escapeRegex } from '../utils/escapeRegex';
import { CreateBrandInput, UpdateBrandInput } from '../schemas/product.schemas';

const slugExists = async (slug: string, excludeId?: string): Promise<boolean> => {
  const q: FilterQuery<IBrand> = { slug };
  if (excludeId) q._id = { $ne: new Types.ObjectId(excludeId) };
  return (await Brand.exists(q)) !== null;
};

export const createBrand = async (input: CreateBrandInput): Promise<IBrand> => {
  const slug = await uniqueSlug(input.slug || input.name, slugExists);
  return Brand.create({ ...input, slug });
};

export interface ListBrandQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const listBrands = async (
  query: ListBrandQuery,
  isAdmin: boolean
): Promise<{
  items: IBrand[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(query.limit ?? 50)));
  const filter: FilterQuery<IBrand> = {};

  if (!isAdmin) filter.isActive = true;
  else if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;

  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: re }, { slug: re }];
  }

  const [items, total] = await Promise.all([
    Brand.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Brand.countDocuments(filter),
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

export const findBrandByIdOrSlug = async (idOrSlug: string): Promise<IBrand> => {
  const filter: FilterQuery<IBrand> = isObjectIdString(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };
  const brand = await Brand.findOne(filter);
  if (!brand) throw new AppError('Brand not found', 404);
  return brand;
};

export const updateBrand = async (
  id: string,
  input: UpdateBrandInput
): Promise<IBrand> => {
  const brand = await Brand.findById(id);
  if (!brand) throw new AppError('Brand not found', 404);

  if (input.slug) {
    const dup = await slugExists(input.slug, id);
    if (dup) throw new AppError('Slug already in use', 409);
  }

  Object.assign(brand, input);
  await brand.save();
  return brand;
};

export const deleteBrand = async (id: string): Promise<void> => {
  const inUse = await Product.exists({ brand: id, isDeleted: false });
  if (inUse) {
    throw new AppError(
      'Cannot delete brand: still assigned to one or more products',
      409
    );
  }
  const res = await Brand.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError('Brand not found', 404);
};
