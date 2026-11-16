import { Schema, model, Document, Types } from 'mongoose';

export type VerificationPurpose = 'email-verify';

export interface IVerificationToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  purpose: VerificationPurpose;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const verificationTokenSchema = new Schema<IVerificationToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, index: true },
    purpose: {
      type: String,
      enum: ['email-verify'],
      default: 'email-verify',
      required: true,
    },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationToken = model<IVerificationToken>(
  'VerificationToken',
  verificationTokenSchema
);
