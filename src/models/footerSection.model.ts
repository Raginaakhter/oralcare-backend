import { Schema, model, Document, Types } from 'mongoose';

export interface IFooterLink {
  _id?: Types.ObjectId;
  title: string;
  url: string;
  target?: '_self' | '_blank';
  displayOrder: number;
  isActive: boolean;
}

export interface IFooterSection extends Document {
  _id: Types.ObjectId;
  title: string;
  links: IFooterLink[];
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const footerLinkSchema = new Schema<IFooterLink>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    target: { type: String, enum: ['_self', '_blank'], default: '_self' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const footerSectionSchema = new Schema<IFooterSection>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    links: { type: [footerLinkSchema], default: [] },
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

export const FooterSection = model<IFooterSection>(
  'FooterSection',
  footerSectionSchema
);
