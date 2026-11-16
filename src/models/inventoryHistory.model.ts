import { Schema, model, Document, Types } from 'mongoose';

export type InventoryAdjustmentType =
  | 'restock'
  | 'sale'
  | 'return'
  | 'adjustment'
  | 'damage'
  | 'audit';

export interface IInventoryHistory extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  previousQuantity: number;
  change: number;
  newQuantity: number;
  type: InventoryAdjustmentType;
  reason?: string;
  adjustedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryHistorySchema = new Schema<IInventoryHistory>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    previousQuantity: { type: Number, required: true },
    change: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    type: {
      type: String,
      enum: ['restock', 'sale', 'return', 'adjustment', 'damage', 'audit'],
      required: true,
      default: 'adjustment',
    },
    reason: { type: String, trim: true, maxlength: 500 },
    adjustedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

inventoryHistorySchema.index({ productId: 1, createdAt: -1 });

export const InventoryHistory = model<IInventoryHistory>(
  'InventoryHistory',
  inventoryHistorySchema
);
