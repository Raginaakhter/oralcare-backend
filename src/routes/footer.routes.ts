import { Router } from 'express';
import {
  getFooterSettings,
  updateFooterSettings,
  createFooterSection,
  getFooterSections,
  getFooterSectionById,
  updateFooterSection,
  deleteFooterSection,
  reorderFooterSectionsCtrl,
  createSocialLink,
  getSocialLinks,
  updateSocialLink,
  deleteSocialLink,
  reorderSocialLinksCtrl,
  createPaymentLogo,
  getPaymentLogos,
  updatePaymentLogo,
  deletePaymentLogo,
} from '../controllers/footer.controller';
import { validateBody } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  updateFooterSettingsSchema,
  createFooterSectionSchema,
  updateFooterSectionSchema,
  createSocialLinkSchema,
  updateSocialLinkSchema,
  createPaymentLogoSchema,
  updatePaymentLogoSchema,
  reorderSchema,
} from '../schemas/cms.schemas';

const router = Router();
const admin = [requireAuth, requireRole('admin')] as const;

// Settings
router.get('/', ...admin, getFooterSettings);
router.put('/', ...admin, validateBody(updateFooterSettingsSchema), updateFooterSettings);

// Sections (reorder before /:id)
router.patch(
  '/sections/reorder',
  ...admin,
  validateBody(reorderSchema),
  reorderFooterSectionsCtrl
);
router.post(
  '/sections',
  ...admin,
  validateBody(createFooterSectionSchema),
  createFooterSection
);
router.get('/sections', ...admin, getFooterSections);
router.get('/sections/:id', ...admin, getFooterSectionById);
router.put(
  '/sections/:id',
  ...admin,
  validateBody(updateFooterSectionSchema),
  updateFooterSection
);
router.delete('/sections/:id', ...admin, deleteFooterSection);

// Social
router.patch(
  '/social-links/reorder',
  ...admin,
  validateBody(reorderSchema),
  reorderSocialLinksCtrl
);
router.post(
  '/social-links',
  ...admin,
  validateBody(createSocialLinkSchema),
  createSocialLink
);
router.get('/social-links', ...admin, getSocialLinks);
router.put(
  '/social-links/:id',
  ...admin,
  validateBody(updateSocialLinkSchema),
  updateSocialLink
);
router.delete('/social-links/:id', ...admin, deleteSocialLink);

// Payment logos
router.post(
  '/payment-logos',
  ...admin,
  validateBody(createPaymentLogoSchema),
  createPaymentLogo
);
router.get('/payment-logos', ...admin, getPaymentLogos);
router.put(
  '/payment-logos/:id',
  ...admin,
  validateBody(updatePaymentLogoSchema),
  updatePaymentLogo
);
router.delete('/payment-logos/:id', ...admin, deletePaymentLogo);

export default router;
