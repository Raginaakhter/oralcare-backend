import { Router } from 'express';
import { getActiveBanners } from '../controllers/banner.controller';
import { getPublicFooterCtrl } from '../controllers/footer.controller';

const router = Router();

router.get('/banners/active', getActiveBanners);
router.get('/footer', getPublicFooterCtrl);

export default router;
