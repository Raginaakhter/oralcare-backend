import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  getOrCreateFooterSettings,
  updateFooterSettings as updateFooterSettingsSvc,
  createFooterSection as createFooterSectionSvc,
  listFooterSections,
  getFooterSection,
  updateFooterSection as updateFooterSectionSvc,
  deleteFooterSection as deleteFooterSectionSvc,
  reorderFooterSections,
  createSocialLink as createSocialLinkSvc,
  listSocialLinks,
  updateSocialLink as updateSocialLinkSvc,
  deleteSocialLink as deleteSocialLinkSvc,
  reorderSocialLinks,
  createPaymentLogo as createPaymentLogoSvc,
  listPaymentLogos,
  updatePaymentLogo as updatePaymentLogoSvc,
  deletePaymentLogo as deletePaymentLogoSvc,
  getPublicFooter,
} from '../services/footer.service';

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

// ─── Settings ──────────────────────────────────────────
export const getFooterSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateFooterSettings();
  res.json({ success: true, data: settings });
});

export const updateFooterSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await updateFooterSettingsSvc(req.body, req.user?.id);
  res.json({ success: true, message: 'Footer settings updated', data: settings });
});

// ─── Sections ──────────────────────────────────────────
export const createFooterSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await createFooterSectionSvc(req.body);
  res.status(201).json({ success: true, message: 'Footer section created', data: section });
});

export const getFooterSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = await listFooterSections(req.user?.role === 'admin');
  res.json({ success: true, data: sections });
});

export const getFooterSectionById = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Section id required', 400);
  const section = await getFooterSection(id);
  res.json({ success: true, data: section });
});

export const updateFooterSection = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Section id required', 400);
  const section = await updateFooterSectionSvc(id, req.body);
  res.json({ success: true, message: 'Footer section updated', data: section });
});

export const deleteFooterSection = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Section id required', 400);
  await deleteFooterSectionSvc(id);
  res.json({ success: true, message: 'Footer section deleted' });
});

export const reorderFooterSectionsCtrl = asyncHandler(
  async (req: Request, res: Response) => {
    const modified = await reorderFooterSections(req.body);
    res.json({
      success: true,
      message: 'Section order updated',
      data: { modifiedCount: modified },
    });
  }
);

// ─── Social ────────────────────────────────────────────
export const createSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const link = await createSocialLinkSvc(req.body);
  res.status(201).json({ success: true, message: 'Social link created', data: link });
});

export const getSocialLinks = asyncHandler(async (req: Request, res: Response) => {
  const links = await listSocialLinks(req.user?.role === 'admin');
  res.json({ success: true, data: links });
});

export const updateSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Social link id required', 400);
  const link = await updateSocialLinkSvc(id, req.body);
  res.json({ success: true, message: 'Social link updated', data: link });
});

export const deleteSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Social link id required', 400);
  await deleteSocialLinkSvc(id);
  res.json({ success: true, message: 'Social link deleted' });
});

export const reorderSocialLinksCtrl = asyncHandler(
  async (req: Request, res: Response) => {
    const modified = await reorderSocialLinks(req.body);
    res.json({
      success: true,
      message: 'Social link order updated',
      data: { modifiedCount: modified },
    });
  }
);

// ─── Payment logos ─────────────────────────────────────
export const createPaymentLogo = asyncHandler(async (req: Request, res: Response) => {
  const logo = await createPaymentLogoSvc(req.body);
  res.status(201).json({ success: true, message: 'Payment logo created', data: logo });
});

export const getPaymentLogos = asyncHandler(async (req: Request, res: Response) => {
  const logos = await listPaymentLogos(req.user?.role === 'admin');
  res.json({ success: true, data: logos });
});

export const updatePaymentLogo = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Payment logo id required', 400);
  const logo = await updatePaymentLogoSvc(id, req.body);
  res.json({ success: true, message: 'Payment logo updated', data: logo });
});

export const deletePaymentLogo = asyncHandler(async (req: Request, res: Response) => {
  const id = asString(req.params.id);
  if (!id) throw new AppError('Payment logo id required', 400);
  await deletePaymentLogoSvc(id);
  res.json({ success: true, message: 'Payment logo deleted' });
});

// ─── Public ────────────────────────────────────────────
export const getPublicFooterCtrl = asyncHandler(async (_req: Request, res: Response) => {
  const payload = await getPublicFooter();
  res.json({ success: true, data: payload });
});
