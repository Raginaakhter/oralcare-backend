import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;
const objectId = z
  .string()
  .regex(objectIdRegex, 'Must be a valid ObjectId');

const imageSchema = z.object({
  url: z.string().url().max(2048),
  alt: z.string().max(250).optional(),
  order: z.number().int().min(0).optional(),
});

const variationSchema = z.object({
  sku: z.string().trim().min(1).max(100).optional(),
  attributes: z.record(z.string(), z.string().max(100)),
  price: z.number().min(0).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  image: z.string().url().max(2048).optional(),
});

const dimensionsSchema = z.object({
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  unit: z.string().max(10).optional(),
});

export const createProductSchema = z
  .object({
    productName: z.string().trim().min(2).max(250),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/i, 'Slug may contain letters, digits, and dashes only')
      .max(120)
      .optional(),
    sku: z.string().trim().min(1).max(100),
    description: z.string().min(1),
    shortDescription: z.string().max(500).optional(),
    regularPrice: z.number().min(0),
    salePrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    stockQuantity: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(5),
    category: objectId,
    subCategory: objectId.optional(),
    brand: objectId.optional(),
    images: z.array(imageSchema).max(20).default([]),
    thumbnail: z.string().url().max(2048).optional(),
    productType: z.enum(['simple', 'variable']).default('simple'),
    variations: z.array(variationSchema).max(50).default([]),
    weight: z.number().min(0).optional(),
    dimensions: dimensionsSchema.optional(),
    tags: z.array(z.string().max(50)).max(30).default([]),
    features: z.array(z.string().max(200)).max(30).default([]),
    specifications: z.record(z.string(), z.string().max(500)).default({}),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    isPublished: z.boolean().default(false),
    metaTitle: z.string().max(160).optional(),
    metaDescription: z.string().max(320).optional(),
    metaKeywords: z.array(z.string().max(50)).max(30).default([]),
  })
  .refine(
    (v) => v.salePrice === undefined || v.salePrice <= v.regularPrice,
    { message: 'salePrice must be less than or equal to regularPrice', path: ['salePrice'] }
  );

export const updateProductSchema = z
  .object({
    productName: z.string().trim().min(2).max(250).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/i)
      .max(120)
      .optional(),
    sku: z.string().trim().min(1).max(100).optional(),
    description: z.string().min(1).optional(),
    shortDescription: z.string().max(500).optional(),
    regularPrice: z.number().min(0).optional(),
    salePrice: z.number().min(0).nullable().optional(),
    costPrice: z.number().min(0).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    category: objectId.optional(),
    subCategory: objectId.nullable().optional(),
    brand: objectId.nullable().optional(),
    images: z.array(imageSchema).max(20).optional(),
    thumbnail: z.string().url().max(2048).optional(),
    productType: z.enum(['simple', 'variable']).optional(),
    variations: z.array(variationSchema).max(50).optional(),
    weight: z.number().min(0).optional(),
    dimensions: dimensionsSchema.optional(),
    tags: z.array(z.string().max(50)).max(30).optional(),
    features: z.array(z.string().max(200)).max(30).optional(),
    specifications: z.record(z.string(), z.string().max(500)).optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    metaTitle: z.string().max(160).optional(),
    metaDescription: z.string().max(320).optional(),
    metaKeywords: z.array(z.string().max(50)).max(30).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export const addProductImageSchema = imageSchema;

export const setThumbnailSchema = z.object({
  thumbnail: z.string().url().max(2048),
});

export const stockUpdateSchema = z.object({
  change: z.number().int(),
  type: z
    .enum(['restock', 'sale', 'return', 'adjustment', 'damage', 'audit'])
    .default('adjustment'),
  reason: z.string().max(500).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/i)
    .max(120)
    .optional(),
  description: z.string().max(2000).optional(),
  image: z.string().url().max(2048).optional(),
  parentCategory: objectId.nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/i)
      .max(120)
      .optional(),
    description: z.string().max(2000).optional(),
    image: z.string().url().max(2048).optional(),
    parentCategory: objectId.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export const createBrandSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/i)
    .max(120)
    .optional(),
  logo: z.string().url().max(2048).optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export const updateBrandSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/i)
      .max(120)
      .optional(),
    logo: z.string().url().max(2048).optional(),
    description: z.string().max(2000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
export type SetThumbnailInput = z.infer<typeof setThumbnailSchema>;
export type StockUpdateInput = z.infer<typeof stockUpdateSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
