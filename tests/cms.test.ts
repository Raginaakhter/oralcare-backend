import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';

import app from '../src/app';
import { connectDB, disconnectDB } from '../src/config/db';
import { User } from '../src/models/user.model';
import { Banner } from '../src/models/banner.model';
import { FooterSettings } from '../src/models/footerSettings.model';
import { FooterSection } from '../src/models/footerSection.model';
import { SocialLink } from '../src/models/socialLink.model';
import { PaymentLogo } from '../src/models/paymentLogo.model';
import { MediaAsset } from '../src/models/mediaAsset.model';
import { bannerCache, footerCache } from '../src/utils/cache';
import { seedAdmin, seedCustomer } from './productHelpers';

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  bannerCache.invalidate();
  footerCache.invalidate();
  await Promise.all([
    User.deleteMany({}),
    Banner.deleteMany({}),
    FooterSettings.deleteMany({}),
    FooterSection.deleteMany({}),
    SocialLink.deleteMany({}),
    PaymentLogo.deleteMany({}),
    MediaAsset.deleteMany({}),
  ]);
});

// ─── Banners ───────────────────────────────────────────
describe('Banner CRUD', () => {
  it('creates, lists, fetches, updates, and deletes a banner', async () => {
    const admin = await seedAdmin();

    const create = await request(app)
      .post('/api/v1/admin/banners')
      .set(authHeader(admin.accessToken))
      .send({
        title: 'Summer Sale',
        subtitle: 'Up to 40% off',
        desktopImage: 'https://cdn.example.com/summer.jpg',
        buttonText: 'Shop now',
        buttonLink: '/sale',
        isPublished: true,
      });
    expect(create.status).toBe(201);
    expect(create.body.data.title).toBe('Summer Sale');
    const id = create.body.data._id;

    const list = await request(app)
      .get('/api/v1/admin/banners')
      .set(authHeader(admin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const single = await request(app)
      .get(`/api/v1/admin/banners/${id}`)
      .set(authHeader(admin.accessToken));
    expect(single.status).toBe(200);

    const upd = await request(app)
      .put(`/api/v1/admin/banners/${id}`)
      .set(authHeader(admin.accessToken))
      .send({ subtitle: 'Up to 50% off' });
    expect(upd.body.data.subtitle).toBe('Up to 50% off');

    const del = await request(app)
      .delete(`/api/v1/admin/banners/${id}`)
      .set(authHeader(admin.accessToken));
    expect(del.status).toBe(200);
  });

  it('rejects non-admin access to admin banner endpoints', async () => {
    const customer = await seedCustomer();
    const anon = await request(app).post('/api/v1/admin/banners').send({ title: 'x' });
    expect(anon.status).toBe(401);
    const cust = await request(app)
      .post('/api/v1/admin/banners')
      .set(authHeader(customer.accessToken))
      .send({ title: 'x' });
    expect(cust.status).toBe(403);
  });

  it('rejects endDate before startDate', async () => {
    const admin = await seedAdmin();
    const res = await request(app)
      .post('/api/v1/admin/banners')
      .set(authHeader(admin.accessToken))
      .send({
        title: 'Bad schedule',
        startDate: '2026-12-01T00:00:00Z',
        endDate: '2026-11-01T00:00:00Z',
      });
    expect(res.status).toBe(400);
  });

  it('toggles status via PATCH /:id/status', async () => {
    const admin = await seedAdmin();
    const create = await request(app)
      .post('/api/v1/admin/banners')
      .set(authHeader(admin.accessToken))
      .send({ title: 'Toggle me' });
    const id = create.body.data._id;

    const toggled = await request(app)
      .patch(`/api/v1/admin/banners/${id}/status`)
      .set(authHeader(admin.accessToken))
      .send({ isPublished: true, isActive: true });
    expect(toggled.body.data.isPublished).toBe(true);
  });

  it('reorders banners atomically via PATCH /reorder', async () => {
    const admin = await seedAdmin();
    const ids: string[] = [];
    for (const title of ['A', 'B', 'C']) {
      const res = await request(app)
        .post('/api/v1/admin/banners')
        .set(authHeader(admin.accessToken))
        .send({ title });
      ids.push(res.body.data._id);
    }

    const reorder = await request(app)
      .patch('/api/v1/admin/banners/reorder')
      .set(authHeader(admin.accessToken))
      .send({
        items: [
          { id: ids[0], displayOrder: 2 },
          { id: ids[1], displayOrder: 0 },
          { id: ids[2], displayOrder: 1 },
        ],
      });
    expect(reorder.status).toBe(200);
    expect(reorder.body.data.modifiedCount).toBe(3);

    const list = await request(app)
      .get('/api/v1/admin/banners')
      .set(authHeader(admin.accessToken));
    const order = list.body.data.items.map((b: { title: string }) => b.title);
    expect(order).toEqual(['B', 'C', 'A']);
  });
});

describe('Public banner endpoint', () => {
  it('returns only active, published, in-window banners', async () => {
    const admin = await seedAdmin();
    const now = Date.now();
    const yday = new Date(now - 24 * 3600 * 1000).toISOString();
    const tomorrow = new Date(now + 24 * 3600 * 1000).toISOString();
    const lastWeek = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

    const banners = [
      { title: 'Live', isPublished: true, isActive: true },
      { title: 'Draft', isPublished: false, isActive: true },
      { title: 'Inactive', isPublished: true, isActive: false },
      {
        title: 'Expired',
        isPublished: true,
        isActive: true,
        startDate: lastWeek,
        endDate: yday,
      },
      {
        title: 'Scheduled',
        isPublished: true,
        isActive: true,
        startDate: tomorrow,
      },
    ];

    for (const b of banners) {
      await request(app)
        .post('/api/v1/admin/banners')
        .set(authHeader(admin.accessToken))
        .send(b);
    }

    const pub = await request(app).get('/api/v1/banners/active');
    expect(pub.status).toBe(200);
    const titles = pub.body.data.map((x: { title: string }) => x.title);
    expect(titles).toEqual(['Live']);
  });

  it('invalidates the cache after an admin update', async () => {
    const admin = await seedAdmin();
    const create = await request(app)
      .post('/api/v1/admin/banners')
      .set(authHeader(admin.accessToken))
      .send({ title: 'Before', isPublished: true, isActive: true });

    const first = await request(app).get('/api/v1/banners/active');
    expect(first.body.data[0].title).toBe('Before');

    await request(app)
      .put(`/api/v1/admin/banners/${create.body.data._id}`)
      .set(authHeader(admin.accessToken))
      .send({ title: 'After' });

    const second = await request(app).get('/api/v1/banners/active');
    expect(second.body.data[0].title).toBe('After');
  });
});

// ─── Footer settings ───────────────────────────────────
describe('Footer settings', () => {
  it('auto-creates defaults on first GET', async () => {
    const admin = await seedAdmin();
    const res = await request(app)
      .get('/api/v1/admin/footer')
      .set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBeTruthy();
    expect(res.body.data.isActive).toBe(true);
    expect(await FooterSettings.countDocuments()).toBe(1);
  });

  it('updates fields and preserves others', async () => {
    const admin = await seedAdmin();
    await request(app)
      .put('/api/v1/admin/footer')
      .set(authHeader(admin.accessToken))
      .send({ contactEmail: 'help@oralcare.test', copyrightText: '© 2026 OralCare' });

    const updated = await request(app)
      .put('/api/v1/admin/footer')
      .set(authHeader(admin.accessToken))
      .send({ contactPhone: '+8800000' });
    expect(updated.body.data.contactPhone).toBe('+8800000');
    expect(updated.body.data.contactEmail).toBe('help@oralcare.test');
    expect(updated.body.data.copyrightText).toBe('© 2026 OralCare');
  });

  it('public footer never returns internal fields', async () => {
    const admin = await seedAdmin();
    await request(app)
      .put('/api/v1/admin/footer')
      .set(authHeader(admin.accessToken))
      .send({ contactEmail: 'help@oralcare.test' });

    const res = await request(app).get('/api/v1/footer');
    expect(res.status).toBe(200);
    expect(res.body.data.settings.contactEmail).toBe('help@oralcare.test');
    expect(res.body.data.settings._id).toBeUndefined();
    expect(res.body.data.settings.updatedBy).toBeUndefined();
  });
});

// ─── Footer sections ───────────────────────────────────
describe('Footer section CRUD', () => {
  it('creates, lists, updates, and deletes a section with links', async () => {
    const admin = await seedAdmin();
    const create = await request(app)
      .post('/api/v1/admin/footer/sections')
      .set(authHeader(admin.accessToken))
      .send({
        title: 'Shop',
        links: [
          { title: 'Toothbrushes', url: '/c/toothbrushes' },
          { title: 'Floss', url: '/c/floss' },
        ],
      });
    expect(create.status).toBe(201);
    expect(create.body.data.links).toHaveLength(2);
    const id = create.body.data._id;

    const upd = await request(app)
      .put(`/api/v1/admin/footer/sections/${id}`)
      .set(authHeader(admin.accessToken))
      .send({
        links: [
          { title: 'Mouthwash', url: '/c/mouthwash', isActive: true, displayOrder: 0, target: '_self' },
        ],
      });
    expect(upd.body.data.links).toHaveLength(1);
    expect(upd.body.data.links[0].title).toBe('Mouthwash');

    const del = await request(app)
      .delete(`/api/v1/admin/footer/sections/${id}`)
      .set(authHeader(admin.accessToken));
    expect(del.status).toBe(200);
  });

  it('public footer hides inactive sections and inactive links inside active sections', async () => {
    const admin = await seedAdmin();
    await request(app)
      .post('/api/v1/admin/footer/sections')
      .set(authHeader(admin.accessToken))
      .send({
        title: 'Visible',
        isActive: true,
        links: [
          { title: 'Shown', url: '/a', isActive: true, displayOrder: 0, target: '_self' },
          { title: 'Hidden', url: '/b', isActive: false, displayOrder: 1, target: '_self' },
        ],
      });
    await request(app)
      .post('/api/v1/admin/footer/sections')
      .set(authHeader(admin.accessToken))
      .send({ title: 'Secret', isActive: false, links: [] });

    const res = await request(app).get('/api/v1/footer');
    expect(res.body.data.sections).toHaveLength(1);
    expect(res.body.data.sections[0].title).toBe('Visible');
    expect(res.body.data.sections[0].links).toHaveLength(1);
    expect(res.body.data.sections[0].links[0].title).toBe('Shown');
  });

  it('reorders sections', async () => {
    const admin = await seedAdmin();
    const ids: string[] = [];
    for (const title of ['X', 'Y', 'Z']) {
      const r = await request(app)
        .post('/api/v1/admin/footer/sections')
        .set(authHeader(admin.accessToken))
        .send({ title, links: [] });
      ids.push(r.body.data._id);
    }
    const reorder = await request(app)
      .patch('/api/v1/admin/footer/sections/reorder')
      .set(authHeader(admin.accessToken))
      .send({
        items: [
          { id: ids[2], displayOrder: 0 },
          { id: ids[0], displayOrder: 1 },
          { id: ids[1], displayOrder: 2 },
        ],
      });
    expect(reorder.body.data.modifiedCount).toBe(3);
  });
});

// ─── Social links ──────────────────────────────────────
describe('Social links CRUD', () => {
  it('rejects unsupported platforms', async () => {
    const admin = await seedAdmin();
    const res = await request(app)
      .post('/api/v1/admin/footer/social-links')
      .set(authHeader(admin.accessToken))
      .send({ platform: 'myspace', url: 'https://example.com' });
    expect(res.status).toBe(400);
  });

  it('creates, updates, deletes a social link', async () => {
    const admin = await seedAdmin();
    const create = await request(app)
      .post('/api/v1/admin/footer/social-links')
      .set(authHeader(admin.accessToken))
      .send({ platform: 'instagram', url: 'https://instagram.com/oralcare' });
    expect(create.status).toBe(201);

    const upd = await request(app)
      .put(`/api/v1/admin/footer/social-links/${create.body.data._id}`)
      .set(authHeader(admin.accessToken))
      .send({ url: 'https://instagram.com/oralcare-bd' });
    expect(upd.body.data.url).toBe('https://instagram.com/oralcare-bd');

    const del = await request(app)
      .delete(`/api/v1/admin/footer/social-links/${create.body.data._id}`)
      .set(authHeader(admin.accessToken));
    expect(del.status).toBe(200);
  });
});

// ─── Payment logos ─────────────────────────────────────
describe('Payment logos CRUD', () => {
  it('creates and lists payment logos; public returns only active', async () => {
    const admin = await seedAdmin();
    await request(app)
      .post('/api/v1/admin/footer/payment-logos')
      .set(authHeader(admin.accessToken))
      .send({
        name: 'bKash',
        imageUrl: 'https://cdn.example.com/bkash.svg',
        isActive: true,
      });
    await request(app)
      .post('/api/v1/admin/footer/payment-logos')
      .set(authHeader(admin.accessToken))
      .send({
        name: 'Hidden',
        imageUrl: 'https://cdn.example.com/x.svg',
        isActive: false,
      });

    const publicRes = await request(app).get('/api/v1/footer');
    const logoNames = publicRes.body.data.paymentLogos.map(
      (p: { name: string }) => p.name
    );
    expect(logoNames).toEqual(['bKash']);
  });
});

// ─── Uploads ───────────────────────────────────────────
describe('Image upload', () => {
  const makePng = () => {
    // 1x1 transparent PNG
    const base64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    return Buffer.from(base64, 'base64');
  };

  it('uploads a banner image and lets us delete it', async () => {
    const admin = await seedAdmin();
    const buf = makePng();
    const upload = await request(app)
      .post('/api/v1/admin/uploads/banner')
      .set(authHeader(admin.accessToken))
      .attach('file', buf, { filename: 'test.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);
    expect(upload.body.data.url).toMatch(/^\/uploads\/banner\//);

    const stored = path.resolve(
      process.cwd(),
      'uploads',
      'banner',
      path.basename(upload.body.data.url)
    );
    expect(fs.existsSync(stored)).toBe(true);

    const del = await request(app)
      .delete(`/api/v1/admin/uploads/${upload.body.data.id}`)
      .set(authHeader(admin.accessToken));
    expect(del.status).toBe(200);
    expect(fs.existsSync(stored)).toBe(false);
  });

  it('rejects non-image uploads', async () => {
    const admin = await seedAdmin();
    const res = await request(app)
      .post('/api/v1/admin/uploads/banner')
      .set(authHeader(admin.accessToken))
      .attach('file', Buffer.from('not an image'), {
        filename: 'bad.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated upload attempts', async () => {
    const res = await request(app)
      .post('/api/v1/admin/uploads/banner')
      .attach('file', Buffer.from('x'), {
        filename: 'x.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(401);
  });

  it('rejects arbitrary file-path style ids (ObjectId-only enforced)', async () => {
    const admin = await seedAdmin();
    // Any non-ObjectId id is refused at the controller before touching disk.
    const res = await request(app)
      .delete('/api/v1/admin/uploads/not-an-objectid')
      .set(authHeader(admin.accessToken));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid media asset id/i);
  });
});
