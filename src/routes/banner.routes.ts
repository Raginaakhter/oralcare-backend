import { Router } from 'express';
import {
  createBanner,
  getBanners,
  getBanner,
  updateBanner,
  deleteBanner,
  patchBannerStatus,
  reorderBannersCtrl,
} from '../controllers/banner.controller';
import { validateBody } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  createBannerSchema,
  updateBannerSchema,
  bannerStatusSchema,
  reorderSchema,
} from '../schemas/cms.schemas';

const router = Router();
const admin = [requireAuth, requireRole('admin')] as const;

// NOTE: /reorder is placed BEFORE /:id so Express doesn't treat
// "reorder" as an id param.
router.patch('/reorder', ...admin, validateBody(reorderSchema), reorderBannersCtrl);
router.get('/', ...admin, getBanners);
router.post('/', ...admin, validateBody(createBannerSchema), createBanner);
router.get('/:id', ...admin, getBanner);
router.put('/:id', ...admin, validateBody(updateBannerSchema), updateBanner);
router.delete('/:id', ...admin, deleteBanner);
router.patch(
  '/:id/status',
  ...admin,
  validateBody(bannerStatusSchema),
  patchBannerStatus
);

export default router;
