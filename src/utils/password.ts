import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, ENV.BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
