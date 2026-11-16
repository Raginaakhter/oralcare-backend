import Anthropic from '@anthropic-ai/sdk';
import { ENV } from '../config/env';
import { AppError } from '../utils/AppError';

let client: Anthropic | null = null;

const getClient = (): Anthropic => {
  if (!ENV.ANTHROPIC_API_KEY) {
    throw new AppError(
      'ANTHROPIC_API_KEY is not configured. Add it to .env to use AI features.',
      503
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });
  }
  return client;
};

export const isClaudeAvailable = (): boolean => Boolean(ENV.ANTHROPIC_API_KEY);

const collectText = (content: Anthropic.ContentBlock[]): string =>
  content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

const stripJsonFence = (raw: string): string => {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : raw).trim();
};

export interface ProductInput {
  productName: string;
  brand?: string;
  category?: string;
  features?: string[];
  specifications?: Record<string, string>;
  targetAudience?: string;
}

export interface ProductDescriptionOutput {
  description: string;
  shortDescription: string;
}

export const generateProductDescription = async (
  product: ProductInput
): Promise<ProductDescriptionOutput> => {
  const c = getClient();

  const system =
    'You are an expert copywriter for an oral care e-commerce brand. ' +
    'Write persuasive, factual product descriptions. Never invent specifications. ' +
    'Respond ONLY with a JSON object matching the schema the user requests.';

  const userPrompt = [
    `Generate product copy for this item:`,
    `- Product: ${product.productName}`,
    product.brand && `- Brand: ${product.brand}`,
    product.category && `- Category: ${product.category}`,
    product.features?.length && `- Features: ${product.features.join(', ')}`,
    product.specifications &&
      Object.keys(product.specifications).length > 0 &&
      `- Specifications: ${JSON.stringify(product.specifications)}`,
    product.targetAudience && `- Target audience: ${product.targetAudience}`,
    '',
    'Respond with this exact JSON shape:',
    '{',
    '  "description": "<150-250 word marketing description>",',
    '  "shortDescription": "<40-60 word summary>"',
    '}',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await c.messages.create({
    model: ENV.CLAUDE_MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = collectText(response.content);
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as ProductDescriptionOutput;
    return {
      description: String(parsed.description ?? '').trim(),
      shortDescription: String(parsed.shortDescription ?? '').trim(),
    };
  } catch {
    throw new AppError('Claude returned non-JSON copy response', 502);
  }
};

export interface SEOMetadataOutput {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

export const generateSEOMetadata = async (
  product: ProductInput
): Promise<SEOMetadataOutput> => {
  const c = getClient();

  const system =
    'You are an SEO specialist. Produce concise, keyword-optimised metadata ' +
    'for an e-commerce product page. Return ONLY JSON.';

  const userPrompt = [
    'Generate SEO metadata for this product:',
    JSON.stringify(product, null, 2),
    '',
    'Constraints:',
    '- metaTitle: 50-60 characters, include brand + product + key benefit',
    '- metaDescription: 140-160 characters, action-oriented',
    '- metaKeywords: 5-10 lowercase phrases',
    '',
    'Respond with:',
    '{"metaTitle":"...","metaDescription":"...","metaKeywords":["..."]}',
  ].join('\n');

  const response = await c.messages.create({
    model: ENV.CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = collectText(response.content);
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as SEOMetadataOutput;
    return {
      metaTitle: String(parsed.metaTitle ?? '').trim(),
      metaDescription: String(parsed.metaDescription ?? '').trim(),
      metaKeywords: Array.isArray(parsed.metaKeywords)
        ? parsed.metaKeywords.map((k) => String(k).trim().toLowerCase())
        : [],
    };
  } catch {
    throw new AppError('Claude returned non-JSON SEO response', 502);
  }
};

export interface ReviewSummaryOutput {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  topPros: string[];
  topCons: string[];
}

export const summarizeReviews = async (
  productName: string,
  reviews: string[]
): Promise<ReviewSummaryOutput> => {
  const c = getClient();
  if (reviews.length === 0) {
    throw new AppError('Need at least one review to summarize', 400);
  }

  const system =
    'You are a review-aggregation assistant. Summarize customer reviews ' +
    'faithfully. Do not invent claims. Return ONLY JSON.';

  const userPrompt = [
    `Product: ${productName}`,
    `Reviews:`,
    ...reviews.map((r, i) => `${i + 1}. ${r}`),
    '',
    'Respond with:',
    '{',
    '  "summary": "<2-3 sentence overview>",',
    '  "sentiment": "positive" | "neutral" | "negative" | "mixed",',
    '  "topPros": ["..."],',
    '  "topCons": ["..."]',
    '}',
  ].join('\n');

  const response = await c.messages.create({
    model: ENV.CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = collectText(response.content);
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as ReviewSummaryOutput;
    return {
      summary: String(parsed.summary ?? '').trim(),
      sentiment:
        (['positive', 'neutral', 'negative', 'mixed'] as const).find(
          (s) => s === parsed.sentiment
        ) ?? 'neutral',
      topPros: Array.isArray(parsed.topPros) ? parsed.topPros.map(String) : [],
      topCons: Array.isArray(parsed.topCons) ? parsed.topCons.map(String) : [],
    };
  } catch {
    throw new AppError('Claude returned non-JSON review response', 502);
  }
};

export interface SupportAnswerOutput {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  shouldEscalate: boolean;
}

export const answerCustomerQuestion = async (input: {
  question: string;
  productName: string;
  productDescription?: string;
  specifications?: Record<string, string>;
}): Promise<SupportAnswerOutput> => {
  const c = getClient();

  const system =
    'You are a friendly, factual oral-care customer-support assistant. ' +
    'Answer using ONLY the product context provided. If the answer is not ' +
    'in the context, say so clearly and recommend escalation. Return ONLY JSON.';

  const userPrompt = [
    `Customer question: "${input.question}"`,
    '',
    `Product: ${input.productName}`,
    input.productDescription && `Description: ${input.productDescription}`,
    input.specifications &&
      Object.keys(input.specifications).length > 0 &&
      `Specifications: ${JSON.stringify(input.specifications)}`,
    '',
    'Respond with:',
    '{',
    '  "answer": "<clear 2-4 sentence answer to the customer>",',
    '  "confidence": "high" | "medium" | "low",',
    '  "shouldEscalate": true/false',
    '}',
  ]
    .filter(Boolean)
    .join('\n');

  const response = await c.messages.create({
    model: ENV.CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = collectText(response.content);
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as SupportAnswerOutput;
    return {
      answer: String(parsed.answer ?? '').trim(),
      confidence:
        (['high', 'medium', 'low'] as const).find(
          (c) => c === parsed.confidence
        ) ?? 'low',
      shouldEscalate: Boolean(parsed.shouldEscalate),
    };
  } catch {
    throw new AppError('Claude returned non-JSON support response', 502);
  }
};
