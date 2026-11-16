import { Schema, model, Document, Types } from 'mongoose';

export interface IFooterSettings extends Document {
  _id: Types.ObjectId;
  logo?: string;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
  linkColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  businessAddress?: string;
  googleMapsUrl?: string;
  copyrightText?: string;
  newsletterEnabled: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
  newsletterButtonText?: string;
  isActive: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const footerSettingsSchema = new Schema<IFooterSettings>(
  {
    logo: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    backgroundColor: { type: String, trim: true, maxlength: 40 },
    textColor: { type: String, trim: true, maxlength: 40 },
    linkColor: { type: String, trim: true, maxlength: 40 },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
    contactPhone: { type: String, trim: true, maxlength: 40 },
    whatsappNumber: { type: String, trim: true, maxlength: 40 },
    businessAddress: { type: String, trim: true, maxlength: 500 },
    googleMapsUrl: { type: String, trim: true, maxlength: 2048 },
    copyrightText: { type: String, trim: true, maxlength: 250 },
    newsletterEnabled: { type: Boolean, default: false },
    newsletterTitle: { type: String, trim: true, maxlength: 250 },
    newsletterDescription: { type: String, trim: true, maxlength: 500 },
    newsletterButtonText: { type: String, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true },
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

export const FooterSettings = model<IFooterSettings>(
  'FooterSettings',
  footerSettingsSchema
);
