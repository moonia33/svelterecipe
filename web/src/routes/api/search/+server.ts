import { json } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { Search } from '@upstash/search';

import { backendJson } from '$lib/server/backend-api';

type SearchHit = {
	id: string;
	score: number;
	content?: unknown;
	metadata?: unknown;
};

type RecipeSearchResult = {
	id: string;
	score: number;
	slug?: string;
	title?: string;
	summary?: string;
	coverImage?: { url?: string; alternativeText?: string | null } | null;
};

type ImageVariant = { avif?: string | null; webp?: string | null } | null;
type ImageSet = {
	original?: string | null;
	thumb?: ImageVariant;
	small?: ImageVariant;
	medium?: ImageVariant;
	large?: ImageVariant;
} | null;

type StrapiRecipeListItem = {
	id: number;
	slug: string;
	title: string;
	summary?: string | null;
	images?: ImageSet;
};

type RecipeListItem = StrapiRecipeListItem;

type RecipeCacheEntry = {
	expiresAt: number;
	title?: string;
	summary?: string;
	coverUrl?: string;
};

const RECIPE_CACHE_TTL_MS = 10 * 60 * 1000;
const recipeCache = new Map<string, RecipeCacheEntry>();

function absoluteMediaUrl(url: string): string {
	const raw = url.trim();
	if (!raw) return '';
	if (/^https?:\/\//i.test(raw)) return raw;
	const base = (publicEnv.PUBLIC_MEDIA_BASE_URL ?? '').trim();
	if (!base) return raw;
	try {
		return new URL(raw, base).toString();
	} catch {
		return raw;
	}
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object') return undefined;
	return value as Record<string, unknown>;
}

function pickString(rec: Record<string, unknown> | undefined, key: string): string | undefined {
	const v = rec?.[key];
	return typeof v === 'string' && v.trim() ? v : undefined;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	for (const v of values) {
		if (!v) continue;
		if (seen.has(v)) continue;
		seen.add(v);
		out.push(v);
	}
	return out;
}

function pickImageUrl(images: ImageSet | undefined | null): string | undefined {
	const v = images ?? null;
	const candidates: Array<string | null | undefined> = [
		v?.small?.webp,
		v?.small?.avif,
		v?.thumb?.webp,
		v?.thumb?.avif,
		v?.original
	];
	return candidates.find((x) => typeof x === 'string' && x.trim())?.trim() ?? undefined;
}

async function enrichResultsWithBackend(
	event: Parameters<RequestHandler>[0],
	results: RecipeSearchResult[]
) {
	const now = Date.now();

	const slugs = uniqueStrings(results.map((r) => (r.coverImage?.url ? undefined : r.slug)));
	if (!slugs.length) return results;

	const toFetch = slugs.filter((slug) => {
		const cached = recipeCache.get(slug);
		return !cached || cached.expiresAt <= now;
	});

	if (toFetch.length) {
		const limit = Math.min(toFetch.length, 8);
		const fetched = await Promise.all(
			toFetch.slice(0, limit).map(async (slug) => {
				try {
					return await backendJson<RecipeListItem>(event, `/recipes/${encodeURIComponent(slug)}`);
				} catch {
					return null;
				}
			})
		);

		for (const r of fetched) {
			if (!r?.slug) continue;
			const cover = pickImageUrl(r.images);
			recipeCache.set(r.slug, {
				expiresAt: now + RECIPE_CACHE_TTL_MS,
				title: r.title ?? undefined,
				summary: r.summary ?? undefined,
				coverUrl: cover ? absoluteMediaUrl(cover) : undefined
			});
		}
	}

	return results.map((r) => {
		if (!r.slug) return r;
		if (r.coverImage?.url) return r;
		const cached = recipeCache.get(r.slug);
		if (!cached) return r;
		return {
			...r,
			title: r.title ?? cached.title,
			summary: r.summary ?? cached.summary,
			coverImage: cached.coverUrl ? { url: cached.coverUrl } : r.coverImage
		};
	});
}

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const query = url.searchParams.get('q')?.trim() ?? '';
	const topK = Number(url.searchParams.get('topk') ?? 8);
	const indexName = (
		url.searchParams.get('index')?.trim() ||
		env.UPSTASH_SEARCH_INDEX ||
		'recipe'
	).trim();

	if (!query) {
		return json({ query, indexName, results: [] as RecipeSearchResult[] });
	}

	const upstashUrl = env.UPSTASH_SEARCH_REST_URL;
	const upstashToken = env.UPSTASH_SEARCH_REST_TOKEN;
	if (!upstashUrl || !upstashToken) {
		return json(
			{
				query,
				indexName,
				results: [] as RecipeSearchResult[],
				error: 'Trūksta UPSTASH_SEARCH_REST_URL arba UPSTASH_SEARCH_REST_TOKEN aplinkos kintamųjų.'
			},
			{ status: 500 }
		);
	}

	try {
		const client = new Search({ url: upstashUrl, token: upstashToken });
		const index = client.index<Record<string, unknown>, Record<string, unknown>>(indexName);
		const response = await index.search({
			query,
			limit: Number.isFinite(topK) && topK > 0 ? Math.min(topK, 20) : 8,
			// MVP: greiti typeahead rezultatai. Papildomus filtrus/semanticWeight galėsim įjungti vėliau.
			reranking: false,
			semanticWeight: 0
		});

		const hits: SearchHit[] = Array.isArray(response)
			? (response as unknown as SearchHit[])
			: (((response as unknown as { hits?: SearchHit[] })?.hits ?? []) as SearchHit[]);

		const results: RecipeSearchResult[] = hits.map((hit) => {
			const content = asRecord(hit.content);
			const metadata = asRecord(hit.metadata);

			const slug = pickString(metadata, 'slug') ?? pickString(content, 'slug');
			const title = pickString(metadata, 'title') ?? pickString(content, 'title') ?? slug;
			const summary = pickString(metadata, 'summary') ?? pickString(content, 'summary');

			const coverUrlRaw =
				pickString(metadata, 'coverUrl') ??
				pickString(metadata, 'coverImageUrl') ??
				pickString(content, 'coverUrl') ??
				pickString(content, 'coverImageUrl');

			return {
				id: hit.id,
				score: hit.score,
				slug,
				title,
				summary,
				coverImage: coverUrlRaw
					? ({ url: absoluteMediaUrl(coverUrlRaw) } satisfies { url: string })
					: null
			};
		});

		const enriched = await enrichResultsWithBackend(event, results);
		return json({ query, indexName, results: enriched });
	} catch (e) {
		return json(
			{
				query,
				indexName,
				results: [] as RecipeSearchResult[],
				error: e instanceof Error ? e.message : 'Nepavyko atlikti paieškos.'
			},
			{ status: 500 }
		);
	}
};
