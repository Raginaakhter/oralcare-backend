import app from '../src/app';

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  name?: string;
  regexp?: RegExp;
  handle?: { stack?: Layer[] };
}

const endpoints: string[] = [];

function walk(stack: Layer[], prefix = ''): void {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      for (const m of methods) {
        endpoints.push(`${m.padEnd(6)} ${prefix}${layer.route.path}`);
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const src = layer.regexp?.toString() ?? '';
      const match = src.match(/\^\\\/([^?\\]+)\\\//);
      const seg = match ? `/${match[1].replace(/\\\//g, '/')}` : '';
      walk(layer.handle.stack, prefix + seg);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
walk((app as any)._router.stack);

endpoints.sort();
endpoints.forEach((e) => console.log(e));
console.log('─'.repeat(60));
console.log('TOTAL HTTP ROUTES:', endpoints.length);
process.exit(0);
