import { Router } from 'express';
import {
  createBrand,
  getBrands,
  getBrand,
  updateBrand,
  removeBrand,
} from '../controllers/brand.controller';
import { validateBody } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth';
import { optionalAuth } from '../middlewares/optionalAuth';
import { createBrandSchema, updateBrandSchema } from '../schemas/product.schemas';

const router = Router();

const admin = [requireAuth, requireRole('admin')] as const;

router.get('/', optionalAuth, getBrands);
router.get('/:idOrSlug', optionalAuth, getBrand);
router.post('/', ...admin, validateBody(createBrandSchema), createBrand);
router.put('/:id', ...admin, validateBody(updateBrandSchema), updateBrand);
router.delete('/:id', ...admin, removeBrand);

export default router;
