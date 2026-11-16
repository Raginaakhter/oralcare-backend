import { Types } from 'mongoose';
import { FooterSettings, IFooterSettings } from '../models/footerSettings.model';
import { FooterSection, IFooterSection } from '../models/footerSection.model';
import { SocialLink, ISocialLink } from '../models/socialLink.model';
import { PaymentLogo, IPaymentLogo } from '../models/paymentLogo.model';
import { AppError } from '../utils/AppError';
import { footerCache } from '../utils/cache';
import {
  UpdateFooterSettingsInput,
  CreateFooterSectionInput,
  UpdateFooterSectionInput,
  CreateSocialLinkInput,
  UpdateSocialLinkInput,
  CreatePaymentLogoInput,
  UpdatePaymentLogoInput,
  ReorderInput,
} from '../schemas/cms.schemas';

const invalidate = (): void => footerCache.invalidate();

// ─── Settings (singleton) ───────────────────────────────
export const getOrCreateFooterSettings = async (): Promise<IFooterSettings> => {
  let settings = await FooterSettings.findOne();
  if (!settings) {
    settings = await FooterSettings.create({ isActive: true });
  }
  return settings;
};

export const updateFooterSettings = async (
  input: UpdateFooterSettingsInput,
  actorId?: string
): Promise<IFooterSettings> => {
  const settings = await getOrCreateFooterSettings();
  Object.assign(settings, input);
  if (actorId) settings.updatedBy = new Types.ObjectId(actorId);
  await settings.save();
  invalidate();
  return settings;
};

// ─── Sections ───────────────────────────────────────────
export const createFooterSection = async (
  input: CreateFooterSectionInput
): Promise<IFooterSection> => {
  const section = await FooterSection.create(input);
  invalidate();
  return section;
};

export const listFooterSections = async (adminView: boolean): Promise<IFooterSection[]> =>
  FooterSection.find(adminView ? {} : { isActive: true }).sort({
    displayOrder: 1,
    createdAt: 1,
  });

export const getFooterSection = async (id: string): Promise<IFooterSection> => {
  const section = await FooterSection.findById(id);
  if (!section) throw new AppError('Footer section not found', 404);
  return section;
};

export const updateFooterSection = async (
  id: string,
  input: UpdateFooterSectionInput
): Promise<IFooterSection> => {
  const section = await FooterSection.findById(id);
  if (!section) throw new AppError('Footer section not found', 404);
  Object.assign(section, input);
  await section.save();
  invalidate();
  return section;
};

export const deleteFooterSection = async (id: string): Promise<void> => {
  const res = await FooterSection.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError('Footer section not found', 404);
  invalidate();
};

export const reorderFooterSections = async (
  input: ReorderInput
): Promise<number> => {
  const ops = input.items.map((it) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(it.id) },
      update: { $set: { displayOrder: it.displayOrder } },
    },
  }));
  const res = await FooterSection.bulkWrite(ops, { ordered: false });
  invalidate();
  return res.modifiedCount ?? 0;
};

// ─── Social links ───────────────────────────────────────
export const createSocialLink = async (
  input: CreateSocialLinkInput
): Promise<ISocialLink> => {
  const link = await SocialLink.create(input);
  invalidate();
  return link;
};

export const listSocialLinks = async (
  adminView: boolean
): Promise<ISocialLink[]> =>
  SocialLink.find(adminView ? {} : { isActive: true }).sort({
    displayOrder: 1,
    createdAt: 1,
  });

export const updateSocialLink = async (
  id: string,
  input: UpdateSocialLinkInput
): Promise<ISocialLink> => {
  const link = await SocialLink.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!link) throw new AppError('Social link not found', 404);
  invalidate();
  return link;
};

export const deleteSocialLink = async (id: string): Promise<void> => {
  const res = await SocialLink.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError('Social link not found', 404);
  invalidate();
};

export const reorderSocialLinks = async (input: ReorderInput): Promise<number> => {
  const ops = input.items.map((it) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(it.id) },
      update: { $set: { displayOrder: it.displayOrder } },
    },
  }));
  const res = await SocialLink.bulkWrite(ops, { ordered: false });
  invalidate();
  return res.modifiedCount ?? 0;
};

// ─── Payment logos ──────────────────────────────────────
export const createPaymentLogo = async (
  input: CreatePaymentLogoInput
): Promise<IPaymentLogo> => {
  const logo = await PaymentLogo.create(input);
  invalidate();
  return logo;
};

export const listPaymentLogos = async (
  adminView: boolean
): Promise<IPaymentLogo[]> =>
  PaymentLogo.find(adminView ? {} : { isActive: true }).sort({
    displayOrder: 1,
    createdAt: 1,
  });

export const updatePaymentLogo = async (
  id: string,
  input: UpdatePaymentLogoInput
): Promise<IPaymentLogo> => {
  const logo = await PaymentLogo.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!logo) throw new AppError('Payment logo not found', 404);
  invalidate();
  return logo;
};

export const deletePaymentLogo = async (id: string): Promise<void> => {
  const res = await PaymentLogo.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError('Payment logo not found', 404);
  invalidate();
};

// ─── Public composite ───────────────────────────────────
interface PublicFooterPayload {
  settings: Record<string, unknown>;
  sections: IFooterSection[];
  socialLinks: ISocialLink[];
  paymentLogos: IPaymentLogo[];
}

const PUBLIC_SETTINGS_FIELDS = [
  'logo',
  'description',
  'backgroundColor',
  'textColor',
  'linkColor',
  'contactEmail',
  'contactPhone',
  'whatsappNumber',
  'businessAddress',
  'googleMapsUrl',
  'copyrightText',
  'newsletterEnabled',
  'newsletterTitle',
  'newsletterDescription',
  'newsletterButtonText',
] as const;

export const getPublicFooter = async (): Promise<PublicFooterPayload> => {
  const cached = footerCache.get('public');
  if (cached) return cached as PublicFooterPayload;

  const [settingsDoc, sections, socialLinks, paymentLogos] = await Promise.all([
    FooterSettings.findOne({ isActive: true }),
    FooterSection.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 }),
    SocialLink.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 }),
    PaymentLogo.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 }),
  ]);

  const settings: Record<string, unknown> = {};
  if (settingsDoc) {
    const json = settingsDoc.toJSON() as Record<string, unknown>;
    for (const f of PUBLIC_SETTINGS_FIELDS) {
      if (json[f] !== undefined) settings[f] = json[f];
    }
  }

  // Strip inactive links inside active sections for public consumers.
  interface PublicLink { isActive: boolean; displayOrder: number }
  const publicSections = sections.map((s) => {
    const json = s.toJSON() as Record<string, unknown>;
    const links = (json.links as PublicLink[])
      .filter((l) => l.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    json.links = links;
    return json as unknown as IFooterSection;
  });

  const payload: PublicFooterPayload = {
    settings,
    sections: publicSections,
    socialLinks,
    paymentLogos,
  };
  footerCache.set('public', payload);
  return payload;
};
