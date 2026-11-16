import { Types } from 'mongoose';
import { Product } from '../models/product.model';
import {
  InventoryHistory,
  IInventoryHistory,
  InventoryAdjustmentType,
} from '../models/inventoryHistory.model';
import { AppError } from '../utils/AppError';

export interface StockAdjustmentInput {
  change: number;
  type?: InventoryAdjustmentType;
  reason?: string;
}

export const adjustStock = async (
  productId: string,
  input: StockAdjustmentInput,
  actorId?: string
): Promise<{ newQuantity: number; history: IInventoryHistory }> => {
  const { change, type = 'adjustment', reason } = input;
  if (!Number.isInteger(change)) {
    throw new AppError('Stock change must be an integer', 400);
  }

  // Atomic adjustment: filter ensures the resulting stock is never negative
  // by requiring stockQuantity >= -change when change is negative.
  const filter: Record<string, unknown> = { _id: productId, isDeleted: false };
  if (change < 0) filter.stockQuantity = { $gte: Math.abs(change) };

  const updated = await Product.findOneAndUpdate(
    filter,
    { $inc: { stockQuantity: change } },
    { new: true }
  );

  if (!updated) {
    // Disambiguate: does the product exist at all?
    const exists = await Product.exists({ _id: productId, isDeleted: false });
    if (!exists) throw new AppError('Product not found', 404);
    throw new AppError('Insufficient stock for this adjustment', 409);
  }

  const history = await InventoryHistory.create({
    productId: new Types.ObjectId(productId),
    previousQuantity: updated.stockQuantity - change,
    change,
    newQuantity: updated.stockQuantity,
    type,
    reason,
    adjustedBy: actorId ? new Types.ObjectId(actorId) : undefined,
  });

  return { newQuantity: updated.stockQuantity, history };
};

export const getStockHistory = async (
  productId: string,
  page = 1,
  limit = 50
): Promise<{
  items: IInventoryHistory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const pageSize = Math.min(200, Math.max(1, Math.floor(limit)));
  const p = Math.max(1, Math.floor(page));
  const filter = { productId: new Types.ObjectId(productId) };
  const [items, total] = await Promise.all([
    InventoryHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * pageSize)
      .limit(pageSize)
      .populate('adjustedBy', 'fullName email'),
    InventoryHistory.countDocuments(filter),
  ]);
  return {
    items,
    total,
    page: p,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

export const listLowStock = async (
  page = 1,
  limit = 50
): Promise<{
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const pageSize = Math.min(200, Math.max(1, Math.floor(limit)));
  const p = Math.max(1, Math.floor(page));
  const match = {
    isDeleted: false,
    $expr: {
      $and: [
        { $gt: ['$stockQuantity', 0] },
        { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      ],
    },
  };

  const [items, total] = await Promise.all([
    Product.find(match)
      .sort({ stockQuantity: 1 })
      .skip((p - 1) * pageSize)
      .limit(pageSize)
      .select('productName sku stockQuantity lowStockThreshold thumbnail'),
    Product.countDocuments(match),
  ]);

  return {
    items,
    total,
    page: p,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

export const listOutOfStock = async (
  page = 1,
  limit = 50
): Promise<{
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const pageSize = Math.min(200, Math.max(1, Math.floor(limit)));
  const p = Math.max(1, Math.floor(page));
  const match = { isDeleted: false, stockQuantity: 0 };

  const [items, total] = await Promise.all([
    Product.find(match)
      .sort({ updatedAt: -1 })
      .skip((p - 1) * pageSize)
      .limit(pageSize)
      .select('productName sku stockQuantity lowStockThreshold thumbnail'),
    Product.countDocuments(match),
  ]);

  return {
    items,
    total,
    page: p,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};
