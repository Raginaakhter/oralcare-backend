import crypto from 'crypto';

export const slugify = (input: string): string =>
  input
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

export const uniqueSlug = async (
  base: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> => {
  const root = slugify(base) || crypto.randomBytes(4).toString('hex');
  let candidate = root;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await exists(candidate)) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
    if (suffix > 50) {
      candidate = `${root}-${crypto.randomBytes(3).toString('hex')}`;
      break;
    }
  }
  return candidate;
};
