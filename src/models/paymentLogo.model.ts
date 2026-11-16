import { Schema, model, Document, Types } from 'mongoose';

export interface IPaymentLogo extends Document {
  _id: Types.ObjectId;
  name: string;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentLogoSchema = new Schema<IPaymentLogo>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    altText: { type: String, trim: true, maxlength: 250 },
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

export const PaymentLogo = model<IPaymentLogo>('PaymentLogo', paymentLogoSchema);
