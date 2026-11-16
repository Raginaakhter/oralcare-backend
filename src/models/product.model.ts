import { Schema, model, Document, Types } from 'mongoose';

export type ProductType = 'simple' | 'variable';

export interface IProductImage {
  _id?: Types.ObjectId;
  url: string;
  alt?: string;
  order?: number;
}

export interface IProductVariation {
  _id?: Types.ObjectId;
  sku?: string;
  attributes: Record<string, string>; // { size: 'L', color: 'red' }
  price?: number;
  stockQuantity?: number;
  image?: string;
}

export interface IProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: string;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  productName: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  regularPrice: number;
  salePrice?: number;
  costPrice?: number;
  stockQuantity: number;
  lowStockThreshold: number;
  category: Types.ObjectId;
  subCategory?: Types.ObjectId;
  brand?: Types.ObjectId;
  images: IProductImage[];
  thumbnail?: string;
  productType: ProductType;
  variations: IProductVariation[];
  weight?: number;
  dimensions?: IProductDimensions;
  tags: string[];
  features: string[];
  specifications: Map<string, string>;
  isFeatured: boolean;
  isActive: boolean;
  isPublished: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const productVariationSchema = new Schema<IProductVariation>(
  {
    sku: { type: String, trim: true },
    attributes: { type: Map, of: String, required: true },
    price: { type: Number, min: 0 },
    stockQuantity: { type: Number, min: 0, default: 0 },
    image: { type: String, trim: true },
  },
  { _id: true }
);

const dimensionsSchema = new Schema<IProductDimensions>(
  {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { type: String, default: 'cm', trim: true },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    productName: { type: String, required: true, trim: true, maxlength: 250 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, trim: true, maxlength: 500 },
    regularPrice: { type: Number, required: true, min: 0 },
    salePrice: {
      type: Number,
      min: 0,
      validate: {
        validator(this: IProduct, v?: number): boolean {
          return v === undefined || v === null || v <= this.regularPrice;
        },
        message: 'salePrice must be less than or equal to regularPrice',
      },
    },
    costPrice: { type: Number, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    brand: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    images: { type: [productImageSchema], default: [] },
    thumbnail: { type: String, trim: true },
    productType: {
      type: String,
      enum: ['simple', 'variable'],
      default: 'simple',
    },
    variations: { type: [productVariationSchema], default: [] },
    weight: { type: Number, min: 0 },
    dimensions: { type: dimensionsSchema },
    tags: { type: [String], default: [], index: true },
    features: { type: [String], default: [] },
    specifications: { type: Map, of: String, default: () => new Map() },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    metaTitle: { type: String, trim: true, maxlength: 160 },
    metaDescription: { type: String, trim: true, maxlength: 320 },
    metaKeywords: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        delete r.__v;
        return r;
      },
    },
  }
);

productSchema.virtual('effectivePrice').get(function (this: IProduct) {
  return typeof this.salePrice === 'number' && this.salePrice > 0
    ? this.salePrice
    : this.regularPrice;
});

productSchema.virtual('stockStatus').get(function (this: IProduct) {
  if (this.stockQuantity <= 0) return 'out-of-stock';
  if (this.stockQuantity <= this.lowStockThreshold) return 'low-stock';
  return 'in-stock';
});

productSchema.index({
  productName: 'text',
  description: 'text',
  shortDescription: 'text',
  sku: 'text',
  tags: 'text',
});

export const Product = model<IProduct>('Product', productSchema);
