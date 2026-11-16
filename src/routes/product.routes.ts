import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  restore,
  addImage,
  removeImage,
  setThumbnail,
  updateStock,
  stockHistory,
  lowStock,
  outOfStock,
} from '../controllers/product.controller';
import { validateBody } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth';
import { optionalAuth } from '../middlewares/optionalAuth';
import {
  createProductSchema,
  updateProductSchema,
  addProductImageSchema,
  setThumbnailSchema,
  stockUpdateSchema,
} from '../schemas/product.schemas';

const router = Router();

const admin = [requireAuth, requireRole('admin')] as const;

router.get('/low-stock', ...admin, lowStock);
router.get('/out-of-stock', ...admin, outOfStock);

router.get('/', optionalAuth, getProducts);
router.get('/:idOrSlug', optionalAuth, getProduct);

router.post('/', ...admin, validateBody(createProductSchema), createProduct);
router.put('/:id', ...admin, validateBody(updateProductSchema), updateProduct);
router.delete('/:id', ...admin, deleteProduct);
router.patch('/:id/restore', ...admin, restore);

router.post(
  '/:id/images',
  ...admin,
  validateBody(addProductImageSchema),
  addImage
);
router.delete('/:id/images/:imageId', ...admin, removeImage);
router.patch(
  '/:id/thumbnail',
  ...admin,
  validateBody(setThumbnailSchema),
  setThumbnail
);

router.patch(
  '/:id/stock',
  ...admin,
  validateBody(stockUpdateSchema),
  updateStock
);
router.get('/:id/stock-history', ...admin, stockHistory);

export default router;
