import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';

import app from '../src/app';
import { connectDB, disconnectDB } from '../src/config/db';
import { User } from '../src/models/user.model';
import { Product } from '../src/models/product.model';
import { Category } from '../src/models/category.model';
import { Brand } from '../src/models/brand.model';
import { InventoryHistory } from '../src/models/inventoryHistory.model';
import {
  seedAdmin,
  seedCustomer,
  createCategoryHelper,
  createBrandHelper,
  buildProductPayload,
} from './productHelpers';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
    User.deleteMany({}),
    InventoryHistory.deleteMany({}),
  ]);
});

describe('Category CRUD', () => {
  it('creates, lists, fetches, updates, and deletes a category (admin only)', async () => {
    const admin = await seedAdmin();

    const create = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Toothbrushes' });
    expect(create.status).toBe(201);
    expect(create.body.data.slug).toBe('toothbrushes');

    const list = await request(app).get('/api/v1/categories');
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);

    const fetch = await request(app).get(`/api/v1/categories/${create.body.data._id}`);
    expect(fetch.status).toBe(200);
    expect(fetch.body.data.name).toBe('Toothbrushes');

    const update = await request(app)
      .put(`/api/v1/categories/${create.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Toothbrush Collection' });
    expect(update.status).toBe(200);
    expect(update.body.data.name).toBe('Toothbrush Collection');

    const del = await request(app)
      .delete(`/api/v1/categories/${create.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(del.status).toBe(200);
  });

  it('rejects category create by customer and anonymous', async () => {
    const customer = await seedCustomer();
    const anon = await request(app).post('/api/v1/categories').send({ name: 'x' });
    expect(anon.status).toBe(401);
    const cust = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ name: 'x' });
    expect(cust.status).toBe(403);
  });

  it('prevents deleting a category still assigned to a product', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));

    const del = await request(app)
      .delete(`/api/v1/categories/${cat.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(del.status).toBe(409);
    expect(del.body.message).toMatch(/assigned/i);
  });
});

describe('Brand CRUD', () => {
  it('creates, lists, fetches, updates, and deletes a brand', async () => {
    const admin = await seedAdmin();

    const create = await request(app)
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'OralCare Pro' });
    expect(create.status).toBe(201);
    expect(create.body.data.slug).toBe('oralcare-pro');

    const list = await request(app).get('/api/v1/brands');
    expect(list.body.data.items).toHaveLength(1);

    const update = await request(app)
      .put(`/api/v1/brands/${create.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ description: 'Premium oral care' });
    expect(update.status).toBe(200);

    const del = await request(app)
      .delete(`/api/v1/brands/${create.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(del.status).toBe(200);
  });

  it('prevents brand deletion when a product references it', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const brand = await createBrandHelper(app, admin.accessToken);
    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, brand.id));

    const del = await request(app)
      .delete(`/api/v1/brands/${brand.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(del.status).toBe(409);
  });
});

describe('Product Create', () => {
  it('creates a product with auto-generated slug', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);

    const payload = buildProductPayload(cat.id, undefined, {
      productName: 'Soft Bristle Toothbrush',
    });
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('soft-bristle-toothbrush');
    expect(res.body.data.productName).toBe('Soft Bristle Toothbrush');
  });

  it('auto-suffixes slug on collision', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);

    const first = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { productName: 'Dup Name' }));
    expect(first.body.data.slug).toBe('dup-name');

    const second = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { productName: 'Dup Name' }));
    expect(second.body.data.slug).toBe('dup-name-2');
  });

  it('rejects duplicate SKU with 409', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);

    const payload = buildProductPayload(cat.id);
    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(payload);

    const dup = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ ...payload, productName: 'Other Name' });
    expect(dup.status).toBe(409);
    expect(dup.body.message).toMatch(/sku/i);
  });

  it('rejects invalid category ID with 400', async () => {
    const admin = await seedAdmin();
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload('000000000000000000000000'));
    expect(res.status).toBe(400);
  });

  it('rejects salePrice > regularPrice', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { regularPrice: 10, salePrice: 20 }));
    expect(res.status).toBe(400);
  });

  it('rejects create by customer', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const customer = await seedCustomer();
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send(buildProductPayload(cat.id));
    expect(res.status).toBe(403);
  });
});

describe('Product List', () => {
  it('shows only published+active to public, all to admin', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);

    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        buildProductPayload(cat.id, undefined, {
          isPublished: true,
          isActive: true,
          productName: 'Public One',
        })
      );
    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        buildProductPayload(cat.id, undefined, {
          isPublished: false,
          isActive: true,
          productName: 'Draft',
        })
      );

    const pub = await request(app).get('/api/v1/products');
    expect(pub.body.data.total).toBe(1);
    expect(pub.body.data.items[0].productName).toBe('Public One');

    const adminList = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(adminList.body.data.total).toBe(2);
  });

  it('paginates results', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send(buildProductPayload(cat.id));
    }

    const page1 = await request(app).get('/api/v1/products?limit=2&page=1');
    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.totalPages).toBe(3);
  });

  it('searches by productName / sku / description', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        buildProductPayload(cat.id, undefined, {
          productName: 'Electric Toothbrush Deluxe',
        })
      );
    await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(
        buildProductPayload(cat.id, undefined, { productName: 'Manual Brush' })
      );

    const res = await request(app).get('/api/v1/products?search=electric');
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].productName).toMatch(/electric/i);
  });

  it('filters by price range', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    for (const price of [5, 15, 25]) {
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send(
          buildProductPayload(cat.id, undefined, {
            regularPrice: price,
            salePrice: undefined,
          })
        );
    }

    const res = await request(app).get('/api/v1/products?minPrice=10&maxPrice=20');
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].regularPrice).toBe(15);
  });

  it('sorts by price asc', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    for (const price of [30, 10, 20]) {
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send(
          buildProductPayload(cat.id, undefined, {
            regularPrice: price,
            salePrice: undefined,
          })
        );
    }
    const res = await request(app).get('/api/v1/products?sort=price-asc');
    expect(res.body.data.items.map((p: { regularPrice: number }) => p.regularPrice)).toEqual([10, 20, 30]);
  });

  it('rejects NoSQL injection in query params', async () => {
    const res = await request(app).get('/api/v1/products?category[$ne]=x');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });
});

describe('Get Single Product', () => {
  it('fetches by id or slug', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { productName: 'Mint Floss' }));

    const byId = await request(app).get(`/api/v1/products/${created.body.data._id}`);
    expect(byId.status).toBe(200);

    const bySlug = await request(app).get(`/api/v1/products/${created.body.data.slug}`);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.data.productName).toBe('Mint Floss');
  });

  it('returns 404 for missing product', async () => {
    const res = await request(app).get('/api/v1/products/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('hides drafts from public but shows to admin', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { isPublished: false }));

    const pub = await request(app).get(`/api/v1/products/${created.body.data._id}`);
    expect(pub.status).toBe(404);

    const adm = await request(app)
      .get(`/api/v1/products/${created.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(adm.status).toBe(200);
  });
});

describe('Update Product', () => {
  it('updates fields and preserves others (partial update)', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { productName: 'Old' }));
    const id = created.body.data._id;

    const upd = await request(app)
      .put(`/api/v1/products/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ productName: 'New Name', regularPrice: 42 });

    expect(upd.status).toBe(200);
    expect(upd.body.data.productName).toBe('New Name');
    expect(upd.body.data.regularPrice).toBe(42);
    expect(upd.body.data.sku).toBe(created.body.data.sku);
  });

  it('rejects SKU duplication on update', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const a = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));
    const b = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));

    const res = await request(app)
      .put(`/api/v1/products/${b.body.data._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ sku: a.body.data.sku });
    expect(res.status).toBe(409);
  });

  it('rejects update by customer', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));
    const customer = await seedCustomer();
    const res = await request(app)
      .put(`/api/v1/products/${created.body.data._id}`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ productName: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('Delete and Restore', () => {
  it('soft-deletes, hides from public, allows restore', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));
    const id = created.body.data._id;

    const del = await request(app)
      .delete(`/api/v1/products/${id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(del.status).toBe(200);

    const pub = await request(app).get(`/api/v1/products/${id}`);
    expect(pub.status).toBe(404);

    const restore = await request(app)
      .patch(`/api/v1/products/${id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(restore.status).toBe(200);
    expect(restore.body.data.isDeleted).toBe(false);
  });

  it('supports permanent delete with ?permanent=true', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));
    const id = created.body.data._id;

    const del = await request(app)
      .delete(`/api/v1/products/${id}?permanent=true`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(del.status).toBe(200);

    const restore = await request(app)
      .patch(`/api/v1/products/${id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(restore.status).toBe(404);
  });
});

describe('Image Management', () => {
  it('adds and removes images, sets thumbnail', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));
    const id = created.body.data._id;

    const add = await request(app)
      .post(`/api/v1/products/${id}/images`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ url: 'https://cdn.example.com/a.jpg', alt: 'A' });
    expect(add.status).toBe(201);
    expect(add.body.data.images).toHaveLength(1);
    const imgId = add.body.data.images[0]._id;

    const thumb = await request(app)
      .patch(`/api/v1/products/${id}/thumbnail`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ thumbnail: 'https://cdn.example.com/thumb.jpg' });
    expect(thumb.status).toBe(200);
    expect(thumb.body.data.thumbnail).toBe('https://cdn.example.com/thumb.jpg');

    const rm = await request(app)
      .delete(`/api/v1/products/${id}/images/${imgId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(rm.status).toBe(200);
    expect(rm.body.data.images).toHaveLength(0);
  });

  it('rejects invalid image URLs', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));

    const bad = await request(app)
      .post(`/api/v1/products/${created.body.data._id}/images`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ url: 'not-a-url' });
    expect(bad.status).toBe(400);
  });
});

describe('Stock Management', () => {
  it('adjusts stock and records history', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { stockQuantity: 20 }));
    const id = created.body.data._id;

    const add = await request(app)
      .patch(`/api/v1/products/${id}/stock`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ change: 10, type: 'restock', reason: 'Weekly restock' });
    expect(add.status).toBe(200);
    expect(add.body.data.newQuantity).toBe(30);

    const sell = await request(app)
      .patch(`/api/v1/products/${id}/stock`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ change: -5, type: 'sale' });
    expect(sell.status).toBe(200);
    expect(sell.body.data.newQuantity).toBe(25);

    const history = await request(app)
      .get(`/api/v1/products/${id}/stock-history`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(history.body.data.total).toBe(2);
  });

  it('prevents negative stock (insufficient stock)', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id, undefined, { stockQuantity: 5 }));
    const id = created.body.data._id;

    const res = await request(app)
      .patch(`/api/v1/products/${id}/stock`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ change: -10, type: 'sale' });
    expect(res.status).toBe(409);
  });

  it('lists low-stock and out-of-stock products', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    for (const qty of [0, 3, 50]) {
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send(
          buildProductPayload(cat.id, undefined, {
            stockQuantity: qty,
            lowStockThreshold: 5,
          })
        );
    }

    const low = await request(app)
      .get('/api/v1/products/low-stock')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(low.status).toBe(200);
    expect(low.body.data.total).toBe(1);
    expect(low.body.data.items[0].stockQuantity).toBe(3);

    const out = await request(app)
      .get('/api/v1/products/out-of-stock')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(out.status).toBe(200);
    expect(out.body.data.total).toBe(1);
    expect(out.body.data.items[0].stockQuantity).toBe(0);
  });

  it('rejects stock update by customer', async () => {
    const admin = await seedAdmin();
    const cat = await createCategoryHelper(app, admin.accessToken);
    const created = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send(buildProductPayload(cat.id));
    const customer = await seedCustomer();
    const res = await request(app)
      .patch(`/api/v1/products/${created.body.data._id}/stock`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ change: 5 });
    expect(res.status).toBe(403);
  });
});
