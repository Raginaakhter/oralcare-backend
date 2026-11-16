import request from 'supertest';
import type { Express } from 'express';
import { hashPassword } from '../src/utils/password';
import { User } from '../src/models/user.model';
import { signAccessToken } from '../src/utils/tokens';

export const seedAdmin = async (): Promise<{ id: string; accessToken: string }> => {
  const user = await User.create({
    fullName: 'Admin',
    email: `admin+${Date.now()}@example.com`,
    password: await hashPassword('Adm1nPass!'),
    role: 'admin',
    isEmailVerified: true,
  });
  const accessToken = signAccessToken(user._id.toString(), 'admin');
  return { id: user._id.toString(), accessToken };
};

export const seedCustomer = async (): Promise<{
  id: string;
  accessToken: string;
}> => {
  const user = await User.create({
    fullName: 'Customer',
    email: `customer+${Date.now()}@example.com`,
    password: await hashPassword('Cust0merPass!'),
    role: 'user',
    isEmailVerified: true,
  });
  const accessToken = signAccessToken(user._id.toString(), 'user');
  return { id: user._id.toString(), accessToken };
};

export const createCategoryHelper = async (
  app: Express,
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; slug: string }> => {
  const payload = { name: `Cat ${Math.random().toString(36).slice(2, 8)}`, ...overrides };
  const res = await request(app)
    .post('/api/v1/categories')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  if (res.status !== 201) {
    throw new Error(`category create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.data._id, slug: res.body.data.slug };
};

export const createBrandHelper = async (
  app: Express,
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ id: string; slug: string }> => {
  const payload = { name: `Brand ${Math.random().toString(36).slice(2, 8)}`, ...overrides };
  const res = await request(app)
    .post('/api/v1/brands')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);
  if (res.status !== 201) {
    throw new Error(`brand create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.data._id, slug: res.body.data.slug };
};

export const buildProductPayload = (
  categoryId: string,
  brandId?: string,
  overrides: Record<string, unknown> = {}
) => ({
  productName: `Toothbrush ${Math.random().toString(36).slice(2, 8)}`,
  sku: `SKU-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  description: 'A high quality soft bristle toothbrush.',
  regularPrice: 10,
  salePrice: 8,
  stockQuantity: 50,
  category: categoryId,
  brand: brandId,
  isActive: true,
  isPublished: true,
  tags: ['oral', 'dental'],
  ...overrides,
});
