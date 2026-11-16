import { FilterQuery, Types } from 'mongoose';
import { Category, ICategory } from '../models/category.model';
import { Product } from '../models/product.model';
import { AppError } from '../utils/AppError';
import { uniqueSlug } from '../utils/slug';
import { escapeRegex } from '../utils/escapeRegex';
import { CreateCategoryInput, UpdateCategoryInput } from '../schemas/product.schemas';

const slugExists = async (slug: string, excludeId?: string): Promise<boolean> => {
  const q: FilterQuery<ICategory> = { slug };
  if (excludeId) q._id = { $ne: new Types.ObjectId(excludeId) };
  return (await Category.exists(q)) !== null;
};

export const createCategory = async (
  input: CreateCategoryInput
): Promise<ICategory> => {
  if (input.parentCategory) {
    const parent = await Category.exists({ _id: input.parentCategory });
    if (!parent) throw new AppError('parentCategory does not exist', 400);
  }
  const slug = await uniqueSlug(input.slug || input.name, slugExists);
  return Category.create({ ...input, slug });
};

export interface ListCategoryQuery {
  search?: string;
  parentCategory?: string | null;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const listCategories = async (
  query: ListCategoryQuery,
  isAdmin: boolean
): Promise<{
  items: ICategory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.floor(query.limit ?? 50)));
  const filter: FilterQuery<ICategory> = {};

  if (!isAdmin) filter.isActive = true;
  else if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;

  if (query.parentCategory === null) filter.parentCategory = null;
  else if (query.parentCategory)
    filter.parentCategory = new Types.ObjectId(query.parentCategory);

  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: re }, { slug: re }];
  }

  const [items, total] = await Promise.all([
    Category.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('parentCategory', 'name slug'),
    Category.countDocuments(filter),
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

export const findCategoryByIdOrSlug = async (
  idOrSlug: string
): Promise<ICategory> => {
  const filter: FilterQuery<ICategory> = isObjectIdString(idOrSlug)
    ? { _id: idOrSlug }
    : { slug: idOrSlug };
  const category = await Category.findOne(filter).populate(
    'parentCategory',
    'name slug'
  );
  if (!category) throw new AppError('Category not found', 404);
  return category;
};

export const updateCategory = async (
  id: string,
  input: UpdateCategoryInput
): Promise<ICategory> => {
  const category = await Category.findById(id);
  if (!category) throw new AppError('Category not found', 404);

  if (input.parentCategory) {
    if (input.parentCategory === id) {
      throw new AppError('Category cannot be its own parent', 400);
    }
    const parent = await Category.exists({ _id: input.parentCategory });
    if (!parent) throw new AppError('parentCategory does not exist', 400);
  }

  if (input.slug) {
    const dup = await slugExists(input.slug, id);
    if (dup) throw new AppError('Slug already in use', 409);
  }

  Object.assign(category, input);
  await category.save();
  return category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const inUseByProduct = await Product.exists({
    $or: [{ category: id }, { subCategory: id }],
    isDeleted: false,
  });
  if (inUseByProduct) {
    throw new AppError(
      'Cannot delete category: still assigned to one or more products',
      409
    );
  }

  const hasChildren = await Category.exists({ parentCategory: id });
  if (hasChildren) {
    throw new AppError('Cannot delete category: has child categories', 409);
  }

  const res = await Category.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError('Category not found', 404);
};
