import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  removeCategory,
} from '../controllers/category.controller';
import { validateBody } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth';
import { optionalAuth } from '../middlewares/optionalAuth';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../schemas/product.schemas';

const router = Router();

const admin = [requireAuth, requireRole('admin')] as const;

router.get('/', optionalAuth, getCategories);
router.get('/:idOrSlug', optionalAuth, getCategory);
router.post('/', ...admin, validateBody(createCategorySchema), createCategory);
router.put('/:id', ...admin, validateBody(updateCategorySchema), updateCategory);
router.delete('/:id', ...admin, removeCategory);

export default router;
