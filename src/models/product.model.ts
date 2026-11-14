import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  slug: string;
  name: string;
  price: string;
  numericPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  badgeColor?: string;
  img: string;
  href?: string;
  category: string;
  brand: string;
  description: string;
  inStock?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: String, required: true },
    numericPrice: { type: Number },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    badge: { type: String },
    badgeColor: { type: String },
    img: { type: String, required: true },
    href: { type: String },
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    description: { type: String, required: true },
    inStock: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const Product = model<IProduct>('Product', productSchema);

