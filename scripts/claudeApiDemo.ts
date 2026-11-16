/**
 * Claude API — End-to-end demo for the OralCare backend.
 *
 * Shows four real AI integrations with their INPUTS and RESPONSES:
 *   1. generateProductDescription  — marketing copy for a new product
 *   2. generateSEOMetadata         — SEO title / description / keywords
 *   3. summarizeReviews            — aggregate customer review sentiment
 *   4. answerCustomerQuestion      — grounded Q&A for support
 *
 * Run modes:
 *   npm run ai:demo         → If ANTHROPIC_API_KEY is set → real Claude calls.
 *                             Otherwise → prints baked-in SAMPLE responses so
 *                             you can see the exact input/output shape.
 *
 * Get a key: https://console.anthropic.com/settings/keys
 *   Then put it in .env:  ANTHROPIC_API_KEY=sk-ant-api03-...
 */

import {
  generateProductDescription,
  generateSEOMetadata,
  summarizeReviews,
  answerCustomerQuestion,
  isClaudeAvailable,
  ProductDescriptionOutput,
  SEOMetadataOutput,
  ReviewSummaryOutput,
  SupportAnswerOutput,
} from '../src/services/claude.service';
import { ENV } from '../src/config/env';

// ───────────────────────────────────────────────────────────────────────────
//  Pretty-print helpers
// ───────────────────────────────────────────────────────────────────────────

const line = (ch = '─', n = 72) => console.log(ch.repeat(n));
const header = (title: string) => {
  console.log('');
  line('═');
  console.log('  ' + title);
  line('═');
};
const section = (label: string, body: unknown) => {
  console.log(`\n▶ ${label}`);
  line();
  if (typeof body === 'string') {
    console.log(body);
  } else {
    console.log(JSON.stringify(body, null, 2));
  }
};

// ───────────────────────────────────────────────────────────────────────────
//  INPUTS — the exact payloads we send to Claude
// ───────────────────────────────────────────────────────────────────────────

const INPUT_1_PRODUCT = {
  productName: 'Sonic Pro Electric Toothbrush',
  brand: 'OralCare',
  category: 'Electric Toothbrushes',
  features: [
    '40,000 sonic vibrations per minute',
    '3 cleaning modes: Clean, Gum Care, Whitening',
    '2-minute smart timer with 30-second quadrant alerts',
    'Pressure sensor prevents over-brushing',
    'USB-C fast charging, 30-day battery life',
  ],
  specifications: {
    'Battery life': '30 days',
    Charging: 'USB-C',
    Weight: '95g',
    Warranty: '2 years',
    Waterproof: 'IPX7',
  },
  targetAudience: 'Health-conscious adults who want a dentist-grade clean at home',
};

const INPUT_2_SEO = INPUT_1_PRODUCT;

const INPUT_3_REVIEWS = {
  productName: 'Sonic Pro Electric Toothbrush',
  reviews: [
    'Best toothbrush I have ever owned. My teeth feel cleaner than after a dental cleaning. Battery really does last a month.',
    'Powerful vibrations, maybe too powerful for sensitive gums at first. The gum care mode fixed that for me.',
    'Charging cable is USB-C which is great. The pressure sensor actually works and beeps when I press too hard.',
    'Decent brush but the handle feels a bit cheap for the price. Cleans well though.',
    'Dentist noticed the difference on my next visit. Highly recommend. Only downside is it is louder than my old brush.',
  ],
};

const INPUT_4_SUPPORT = {
  question:
    'Can I use this toothbrush in the shower? And how long does a full charge take?',
  productName: 'Sonic Pro Electric Toothbrush',
  productDescription:
    'IPX7 waterproof sonic toothbrush with USB-C fast charging and 30-day battery life.',
  specifications: {
    Waterproof: 'IPX7 (safe for shower use)',
    Charging: 'USB-C, full charge in 4 hours',
    'Battery life': '30 days on a single charge',
  },
};

// ───────────────────────────────────────────────────────────────────────────
//  SAMPLE RESPONSES — shown when ANTHROPIC_API_KEY is not configured.
//  These are typical Claude Opus 5.5 outputs for the inputs above, so you
//  can review the exact shape and tone without spending any tokens.
// ───────────────────────────────────────────────────────────────────────────

const SAMPLE_DESCRIPTION: ProductDescriptionOutput = {
  description:
    "Experience a truly dentist-grade clean at home with the OralCare Sonic Pro Electric Toothbrush. Powered by 40,000 sonic vibrations per minute, it dislodges plaque and surface stains that manual brushing leaves behind. Three dedicated modes — Clean, Gum Care, and Whitening — let you tune every brushing session to how your mouth feels today. The built-in smart timer runs for the dentist-recommended two minutes and gently pulses every 30 seconds so you cover each quadrant evenly, while the pressure sensor alerts you the moment you press too hard, protecting enamel and sensitive gums. On a single USB-C charge the Sonic Pro keeps going for 30 full days, and its IPX7 waterproof body shrugs off showers and travel. Backed by a 2-year warranty.",
  shortDescription:
    'Sonic Pro delivers 40,000 vibrations/min, three modes, a 2-minute smart timer and a pressure sensor — in an IPX7 body that lasts 30 days per USB-C charge, backed by a 2-year warranty.',
};

const SAMPLE_SEO: SEOMetadataOutput = {
  metaTitle: 'Sonic Pro Electric Toothbrush — 30-Day Battery | OralCare',
  metaDescription:
    'Dentist-grade sonic clean with 40,000 vibrations/min, pressure sensor and 30-day USB-C battery life. Shop the OralCare Sonic Pro today.',
  metaKeywords: [
    'electric toothbrush',
    'sonic toothbrush',
    'oralcare sonic pro',
    'rechargeable toothbrush',
    'usb-c toothbrush',
    'pressure sensor toothbrush',
    'long battery toothbrush',
    'whitening toothbrush',
  ],
};

const SAMPLE_REVIEWS: ReviewSummaryOutput = {
  summary:
    'Customers overwhelmingly praise the Sonic Pro for delivering a dentist-grade clean, long battery life and an effective pressure sensor. A few note the vibrations can feel intense on sensitive gums and that the handle feels less premium than the price suggests.',
  sentiment: 'positive',
  topPros: [
    'Noticeably cleaner teeth, even confirmed by dentists',
    'Battery life really does reach 30 days',
    'Working pressure sensor prevents over-brushing',
    'USB-C charging is convenient',
  ],
  topCons: [
    'Vibrations can be too strong for sensitive gums at first',
    'Operating noise is louder than manual or older electric brushes',
    'Handle build quality feels modest for the price',
  ],
};

const SAMPLE_SUPPORT: SupportAnswerOutput = {
  answer:
    'Yes — the Sonic Pro is rated IPX7, so it is safe to use in the shower. A full charge over USB-C takes about 4 hours and then lasts around 30 days of normal twice-daily brushing.',
  confidence: 'high',
  shouldEscalate: false,
};

// ───────────────────────────────────────────────────────────────────────────
//  Runner
// ───────────────────────────────────────────────────────────────────────────

type DemoCase<Out> = {
  title: string;
  input: unknown;
  live: () => Promise<Out>;
  sample: Out;
};

async function runCase<Out>(c: DemoCase<Out>, live: boolean): Promise<void> {
  header(c.title);
  section('INPUT (sent to Claude)', c.input);

  if (live) {
    console.log('\n⏳ Calling Claude API…');
    const start = Date.now();
    try {
      const out = await c.live();
      const ms = Date.now() - start;
      section(`RESPONSE (live Claude • ${ms}ms)`, out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      section('RESPONSE (live Claude • FAILED)', msg);
      section('RESPONSE (sample fallback)', c.sample);
    }
  } else {
    section('RESPONSE (SAMPLE — Claude key not configured)', c.sample);
  }
}

async function main(): Promise<void> {
  const live = isClaudeAvailable();

  header('OralCare × Claude API — AI feature demo');
  console.log('');
  console.log(`  Mode     : ${live ? '🟢 LIVE (real Claude calls)' : '🟡 SAMPLE (no API key)'}`);
  console.log(`  Model    : ${ENV.CLAUDE_MODEL}`);
  console.log(
    `  API key  : ${
      live
        ? ENV.ANTHROPIC_API_KEY.slice(0, 12) +
          '…' +
          ENV.ANTHROPIC_API_KEY.slice(-4)
        : '(unset — see .env)'
    }`
  );
  if (!live) {
    console.log('');
    console.log('  To run against the real Claude API:');
    console.log('    1. Get a key at https://console.anthropic.com/settings/keys');
    console.log('    2. Put it in .env   →   ANTHROPIC_API_KEY=sk-ant-api03-…');
    console.log('    3. Re-run           →   npm run ai:demo');
  }

  await runCase<ProductDescriptionOutput>(
    {
      title: '1 / 4  generateProductDescription — marketing copy',
      input: INPUT_1_PRODUCT,
      live: () => generateProductDescription(INPUT_1_PRODUCT),
      sample: SAMPLE_DESCRIPTION,
    },
    live
  );

  await runCase<SEOMetadataOutput>(
    {
      title: '2 / 4  generateSEOMetadata — meta title/description/keywords',
      input: INPUT_2_SEO,
      live: () => generateSEOMetadata(INPUT_2_SEO),
      sample: SAMPLE_SEO,
    },
    live
  );

  await runCase<ReviewSummaryOutput>(
    {
      title: '3 / 4  summarizeReviews — sentiment + pros/cons',
      input: INPUT_3_REVIEWS,
      live: () =>
        summarizeReviews(INPUT_3_REVIEWS.productName, INPUT_3_REVIEWS.reviews),
      sample: SAMPLE_REVIEWS,
    },
    live
  );

  await runCase<SupportAnswerOutput>(
    {
      title: '4 / 4  answerCustomerQuestion — grounded support Q&A',
      input: INPUT_4_SUPPORT,
      live: () => answerCustomerQuestion(INPUT_4_SUPPORT),
      sample: SAMPLE_SUPPORT,
    },
    live
  );

  console.log('');
  line('═');
  console.log(`  ✅ Demo complete (${live ? 'live' : 'sample'} mode)`);
  line('═');
  console.log('');
}

main().catch((err) => {
  console.error('❌ Demo failed:', err);
  process.exit(1);
});
