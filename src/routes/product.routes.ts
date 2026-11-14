import { Router } from 'express';
import {
  getAllProducts,
  getProductBySlug,
  createProduct,
} from '../controllers/product.controller';

const router = Router();

router.get('/', getAllProducts);
router.get('/:slug', getProductBySlug);
router.post('/', createProduct);

export default router;

