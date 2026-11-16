import { Schema, model, Document, Types } from 'mongoose';

export type TextAlignment = 'left' | 'center' | 'right';

export interface IBanner extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  description?: string;
  desktopImage?: string;
  mobileImage?: string;
  backgroundImage?: string;
  imageAlt?: string;
  buttonText?: string;
  buttonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  textAlignment: TextAlignment;
  textColor?: string;
  overlayColor?: string;
  overlayOpacity: number;
  bannerHeight?: string;
  displayOrder: number;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive: boolean;
  isPublished: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 250 },
    subtitle: { type: String, trim: true, maxlength: 250 },
    description: { type: String, trim: true, maxlength: 2000 },
    desktopImage: { type: String, trim: true },
    mobileImage: { type: String, trim: true },
    backgroundImage: { type: String, trim: true },
    imageAlt: { type: String, trim: true, maxlength: 250 },
    buttonText: { type: String, trim: true, maxlength: 100 },
    buttonLink: { type: String, trim: true, maxlength: 2048 },
    secondaryButtonText: { type: String, trim: true, maxlength: 100 },
    secondaryButtonLink: { type: String, trim: true, maxlength: 2048 },
    textAlignment: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'center',
    },
    textColor: { type: String, trim: true, maxlength: 40 },
    overlayColor: { type: String, trim: true, maxlength: 40 },
    overlayOpacity: { type: Number, min: 0, max: 1, default: 0 },
    bannerHeight: { type: String, trim: true, maxlength: 40 },
    displayOrder: { type: Number, default: 0, index: true },
    startDate: { type: Date, default: null, index: true },
    endDate: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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

bannerSchema.index({ isActive: 1, isPublished: 1, displayOrder: 1 });

export const Banner = model<IBanner>('Banner', bannerSchema);
