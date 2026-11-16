import { FilterQuery, Types } from 'mongoose';
import { Banner, IBanner } from '../models/banner.model';
import { AppError } from '../utils/AppError';
import { bannerCache } from '../utils/cache';
import {
  CreateBannerInput,
  UpdateBannerInput,
  BannerStatusInput,
  ReorderInput,
} from '../schemas/cms.schemas';

const invalidate = (): void => bannerCache.invalidate();

const assertDateOrder = (
  start: Date | null | undefined,
  end: Date | null | undefined
): void => {
  if (start && end && end.getTime() <= start.getTime()) {
    throw new AppError('endDate must be after startDate', 400);
  }
};

export const createBanner = async (
  input: CreateBannerInput,
  actorId?: string
): Promise<IBanner> => {
  const banner = await Banner.create({
    ...input,
    createdBy: actorId ? new Types.ObjectId(actorId) : undefined,
    updatedBy: actorId ? new Types.ObjectId(actorId) : undefined,
  });
  invalidate();
  return banner;
};

export interface ListBannerQuery {
  search?: string;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}

export const listBanners = async (
  query: ListBannerQuery
): Promise<{
  items: IBanner[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> => {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(query.limit ?? 20)));
  const filter: FilterQuery<IBanner> = {};
  if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
  if (typeof query.isPublished === 'boolean')
    filter.isPublished = query.isPublished;
  if (query.search) {
    const re = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
    filter.$or = [{ title: re }, { subtitle: re }, { description: re }];
  }

  const [items, total] = await Promise.all([
    Banner.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Banner.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

export const getBannerById = async (id: string): Promise<IBanner> => {
  const banner = await Banner.findById(id);
  if (!banner) throw new AppError('Banner not found', 404);
  return banner;
};

export const updateBanner = async (
  id: string,
  input: UpdateBannerInput,
  actorId?: string
): Promise<IBanner> => {
  const banner = await Banner.findById(id);
  if (!banner) throw new AppError('Banner not found', 404);

  const newStart = 'startDate' in input ? input.startDate : banner.startDate;
  const newEnd = 'endDate' in input ? input.endDate : banner.endDate;
  assertDateOrder(newStart ?? null, newEnd ?? null);

  Object.assign(banner, input);
  if (actorId) banner.updatedBy = new Types.ObjectId(actorId);
  await banner.save();
  invalidate();
  return banner;
};

export const deleteBanner = async (id: string): Promise<void> => {
  const res = await Banner.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError('Banner not found', 404);
  invalidate();
};

export const toggleBannerStatus = async (
  id: string,
  status: BannerStatusInput,
  actorId?: string
): Promise<IBanner> => {
  if (
    status.isActive === undefined &&
    status.isPublished === undefined
  ) {
    throw new AppError(
      'Provide at least one of isActive or isPublished',
      400
    );
  }
  const update: Record<string, unknown> = { ...status };
  if (actorId) update.updatedBy = new Types.ObjectId(actorId);

  const banner = await Banner.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!banner) throw new AppError('Banner not found', 404);
  invalidate();
  return banner;
};

export const reorderBanners = async (input: ReorderInput): Promise<number> => {
  const ops = input.items.map((it) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(it.id) },
      update: { $set: { displayOrder: it.displayOrder } },
    },
  }));
  const res = await Banner.bulkWrite(ops, { ordered: false });
  invalidate();
  return res.modifiedCount ?? 0;
};

const activePublicFilter = (now = new Date()): FilterQuery<IBanner> => ({
  isActive: true,
  isPublished: true,
  $and: [
    { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
    { $or: [{ endDate: null }, { endDate: { $gt: now } }] },
  ],
});

export const listActiveBanners = async (): Promise<IBanner[]> => {
  const cached = bannerCache.get('active');
  if (cached) return cached as IBanner[];
  const banners = await Banner.find(activePublicFilter())
    .sort({ displayOrder: 1, createdAt: -1 });
  bannerCache.set('active', banners);
  return banners;
};
