import { Schema, model, Document, Types } from 'mongoose';

export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'linkedin',
  'whatsapp',
  'pinterest',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface ISocialLink extends Document {
  _id: Types.ObjectId;
  platform: SocialPlatform;
  url: string;
  customIcon?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const socialLinkSchema = new Schema<ISocialLink>(
  {
    platform: {
      type: String,
      enum: SOCIAL_PLATFORMS as unknown as string[],
      required: true,
      lowercase: true,
      index: true,
    },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    customIcon: { type: String, trim: true, maxlength: 2048 },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
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

export const SocialLink = model<ISocialLink>('SocialLink', socialLinkSchema);
