import { Schema, model, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  itemCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    image: { type: String },
    itemCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Category = model<ICategory>('Category', categorySchema);

