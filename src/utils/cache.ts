interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private readonly store = new Map<string, Entry<T>>();
  constructor(private readonly ttlMs: number = 60_000) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key?: string): void {
    if (key === undefined) this.store.clear();
    else this.store.delete(key);
  }

  async wrap<U extends T>(key: string, loader: () => Promise<U>): Promise<U> {
    const hit = this.get(key);
    if (hit !== undefined) return hit as U;
    const fresh = await loader();
    this.set(key, fresh);
    return fresh;
  }
}

// Shared caches for public CMS endpoints
export const bannerCache = new TTLCache<unknown>(60_000);
export const footerCache = new TTLCache<unknown>(60_000);
