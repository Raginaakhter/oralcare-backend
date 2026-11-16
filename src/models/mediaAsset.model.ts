import { Schema, model, Document, Types } from 'mongoose';

export type MediaCategory = 'banner' | 'footer' | 'product' | 'other';

export interface IMediaAsset extends Document {
  _id: Types.ObjectId;
  filename: string;
  url: string;
  path: string;
  mimeType: string;
  size: number;
  category: MediaCategory;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    filename: { type: String, required: true, trim: true, maxlength: 250 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    path: { type: String, required: true, trim: true, maxlength: 500 },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['banner', 'footer', 'product', 'other'],
      default: 'other',
      index: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const r = ret as Record<string, unknown>;
        delete r.__v;
        return r;
      },
    },
  }
);

export const MediaAsset = model<IMediaAsset>('MediaAsset', mediaAssetSchema);
