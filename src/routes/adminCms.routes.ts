import { Router } from 'express';
import bannerRoutes from './banner.routes';
import footerRoutes from './footer.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/banners', bannerRoutes);
router.use('/footer', footerRoutes);
router.use('/uploads', uploadRoutes);

export default router;
