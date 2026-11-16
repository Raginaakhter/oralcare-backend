import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ObjectId');
const url2048 = z.string().url().max(2048);
const hexColor = z
  .string()
  .max(40)
  .regex(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)$/, 'Not a valid color');

// ─── Banners ───────────────────────────────────────────────
export const createBannerSchema = z
  .object({
    title: z.string().trim().min(1).max(250),
    subtitle: z.string().trim().max(250).optional(),
    description: z.string().trim().max(2000).optional(),
    desktopImage: url2048.optional(),
    mobileImage: url2048.optional(),
    backgroundImage: url2048.optional(),
    imageAlt: z.string().trim().max(250).optional(),
    buttonText: z.string().trim().max(100).optional(),
    buttonLink: z.string().trim().max(2048).optional(),
    secondaryButtonText: z.string().trim().max(100).optional(),
    secondaryButtonLink: z.string().trim().max(2048).optional(),
    textAlignment: z.enum(['left', 'center', 'right']).default('center'),
    textColor: hexColor.optional(),
    overlayColor: hexColor.optional(),
    overlayOpacity: z.number().min(0).max(1).default(0),
    bannerHeight: z.string().trim().max(40).optional(),
    displayOrder: z.number().int().min(0).default(0),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().default(true),
    isPublished: z.boolean().default(false),
  })
  .refine(
    (v) =>
      !v.startDate || !v.endDate || v.endDate.getTime() > v.startDate.getTime(),
    { message: 'endDate must be after startDate', path: ['endDate'] }
  );

export const updateBannerSchema = z
  .object({
    title: z.string().trim().min(1).max(250).optional(),
    subtitle: z.string().trim().max(250).optional(),
    description: z.string().trim().max(2000).optional(),
    desktopImage: url2048.nullable().optional(),
    mobileImage: url2048.nullable().optional(),
    backgroundImage: url2048.nullable().optional(),
    imageAlt: z.string().trim().max(250).optional(),
    buttonText: z.string().trim().max(100).optional(),
    buttonLink: z.string().trim().max(2048).optional(),
    secondaryButtonText: z.string().trim().max(100).optional(),
    secondaryButtonLink: z.string().trim().max(2048).optional(),
    textAlignment: z.enum(['left', 'center', 'right']).optional(),
    textColor: hexColor.optional(),
    overlayColor: hexColor.optional(),
    overlayOpacity: z.number().min(0).max(1).optional(),
    bannerHeight: z.string().trim().max(40).optional(),
    displayOrder: z.number().int().min(0).optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export const bannerStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: objectId,
        displayOrder: z.number().int().min(0),
      })
    )
    .min(1)
    .max(500),
});

// ─── Footer settings ───────────────────────────────────────
export const updateFooterSettingsSchema = z
  .object({
    logo: url2048.optional(),
    description: z.string().max(2000).optional(),
    backgroundColor: hexColor.optional(),
    textColor: hexColor.optional(),
    linkColor: hexColor.optional(),
    contactEmail: z.string().trim().toLowerCase().email().max(254).optional(),
    contactPhone: z.string().trim().max(40).optional(),
    whatsappNumber: z.string().trim().max(40).optional(),
    businessAddress: z.string().trim().max(500).optional(),
    googleMapsUrl: url2048.optional(),
    copyrightText: z.string().trim().max(250).optional(),
    newsletterEnabled: z.boolean().optional(),
    newsletterTitle: z.string().trim().max(250).optional(),
    newsletterDescription: z.string().trim().max(500).optional(),
    newsletterButtonText: z.string().trim().max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

// ─── Footer sections ───────────────────────────────────────
const footerLinkInput = z.object({
  title: z.string().trim().min(1).max(120),
  url: z.string().trim().min(1).max(2048),
  target: z.enum(['_self', '_blank']).default('_self'),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const createFooterSectionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  links: z.array(footerLinkInput).max(50).default([]),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateFooterSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    links: z.array(footerLinkInput).max(50).optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

// ─── Social links ──────────────────────────────────────────
const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'linkedin',
  'whatsapp',
  'pinterest',
] as const;

export const createSocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string().trim().min(1).max(2048).url(),
  customIcon: url2048.optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateSocialLinkSchema = z
  .object({
    platform: z.enum(SOCIAL_PLATFORMS).optional(),
    url: z.string().trim().min(1).max(2048).url().optional(),
    customIcon: url2048.optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

// ─── Payment logos ─────────────────────────────────────────
export const createPaymentLogoSchema = z.object({
  name: z.string().trim().min(1).max(120),
  imageUrl: url2048,
  altText: z.string().trim().max(250).optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updatePaymentLogoSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    imageUrl: url2048.optional(),
    altText: z.string().trim().max(250).optional(),
    displayOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type BannerStatusInput = z.infer<typeof bannerStatusSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type UpdateFooterSettingsInput = z.infer<typeof updateFooterSettingsSchema>;
export type CreateFooterSectionInput = z.infer<typeof createFooterSectionSchema>;
export type UpdateFooterSectionInput = z.infer<typeof updateFooterSectionSchema>;
export type CreateSocialLinkInput = z.infer<typeof createSocialLinkSchema>;
export type UpdateSocialLinkInput = z.infer<typeof updateSocialLinkSchema>;
export type CreatePaymentLogoInput = z.infer<typeof createPaymentLogoSchema>;
export type UpdatePaymentLogoInput = z.infer<typeof updatePaymentLogoSchema>;
