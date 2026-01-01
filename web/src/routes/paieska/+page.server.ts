import type { PageServerLoad } from './$types';

import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { Search } from '@upstash/search';

import { backendJson } from '$lib/server/backend-api';

type ImageVariant = { avif?: string | null; webp?: string | null } | null;
type ImageSet = {
	original?: string | null;
	thumb?: ImageVariant;
	small?: ImageVariant;
	medium?: ImageVariant;
	large?: ImageVariant;
} | null;

type SearchHit = {
	id: string;
	score: number;
	content?: unknown;
	metadata?: unknown;
};

type RecipeSearchResult = {
	id: string;
	score: number;
	recipeId?: number;
	recipeDocumentId?: string;
	slug?: string;
	title?: string;
	summary?: string;
	difficulty?: 'lengvas' | 'vidutinis' | 'sunkus';
	totalTimeMin?: number;
	meal_type?: { id: number; name?: string; slug?: string } | null;
	coverImage?: { url?: string; alternativeText?: string | null } | null;
};

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

type StrapiRecipeListItem = {
	id: number;
	slug: string;
	title: string;
	summary?: string | null;
	difficulty?: string | null;
	images?: ImageSet;
	preparation_time?: number | null;
	cooking_time?: number | null;
	meal_types?: Array<{ id: number; name?: string | null; slug?: string | null }> | null;
};

type RecipeListItem = StrapiRecipeListItem;

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

export const load: PageServerLoad = async (event) => {
	const { url } = event;
	const query = url.searchParams.get('q')?.trim() ?? '';
	const filter = url.searchParams.get('filter')?.trim() || undefined;
	const topK = Number(url.searchParams.get('topk') ?? 10);
	const semanticWeightRaw = url.searchParams.get('semanticWeight');
	const semanticWeight = semanticWeightRaw != null ? Number(semanticWeightRaw) : 0.75;
	const rerankingRaw = url.searchParams.get('reranking');
	const reranking = rerankingRaw != null ? rerankingRaw === 'true' : false;
	const inputEnrichmentRaw = url.searchParams.get('inputEnrichment');
	const inputEnrichment = inputEnrichmentRaw != null ? inputEnrichmentRaw === 'true' : false;
	const indexName = (
		url.searchParams.get('index')?.trim() ||
		env.UPSTASH_SEARCH_INDEX ||
		'recipe'
	).trim();

	if (!query) {
		return {
			query,
			indexName,
			results: [] as RecipeSearchResult[],
			error: null as string | null
		};
	}

	const upstashUrl = env.UPSTASH_SEARCH_REST_URL;
	const upstashToken = env.UPSTASH_SEARCH_REST_TOKEN;

	if (!upstashUrl || !upstashToken) {
		return {
			query,
			indexName,
			results: [] as RecipeSearchResult[],
			error: 'Trūksta UPSTASH_SEARCH_REST_URL arba UPSTASH_SEARCH_REST_TOKEN aplinkos kintamųjų.'
		};
	}

	try {
		const client = new Search({ url: upstashUrl, token: upstashToken });
		const index = client.index<Record<string, unknown>, Record<string, unknown>>(indexName);
		const response = await index.search({
			query,
			limit: Number.isFinite(topK) && topK > 0 ? Math.min(topK, 50) : 10,
			filter,
			reranking,
			semanticWeight: Number.isFinite(semanticWeight) ? semanticWeight : 0.75,
			inputEnrichment
		});

		// SDK grąžina `Document[]` (su `score`). Kai kuriose integracijose gali būti `{ hits: Document[] }`.
		const hits: SearchHit[] = Array.isArray(response)
			? (response as unknown as SearchHit[])
			: (((response as unknown as { hits?: SearchHit[] })?.hits ?? []) as SearchHit[]);

		let results: RecipeSearchResult[] = hits.map((hit) => {
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

		// Enrichment per Ninja (ribotai): pagal slug paimam laikus, cover ir meal_type.
		const slugs = uniqueStrings(results.map((r) => r.slug));
		if (slugs.length) {
			const limit = Math.min(slugs.length, 20);
			const enriched = await Promise.all(
				slugs.slice(0, limit).map(async (slug) => {
					try {
						return await backendJson<RecipeListItem>(event, `/recipes/${encodeURIComponent(slug)}`);
					} catch {
						return null;
					}
				})
			);

			const bySlug = new Map<string, RecipeListItem>();
			for (const r of enriched) {
				if (!r?.slug) continue;
				bySlug.set(r.slug, r);
			}

			const pickImageUrl = (images: ImageSet | undefined | null) => {
				const v = images ?? null;
				const candidates: Array<string | null | undefined> = [
					v?.small?.webp,
					v?.small?.avif,
					v?.thumb?.webp,
					v?.thumb?.avif,
					v?.original
				];
				return candidates.find((x) => typeof x === 'string' && x.trim())?.trim();
			};

			results = results.map((r) => {
				const fromApi = r.slug ? bySlug.get(r.slug) : undefined;
				if (!fromApi) return r;
				const prep = fromApi.preparation_time ?? 0;
				const cook = fromApi.cooking_time ?? 0;
				const totalTimeMin =
					Number.isFinite(prep + cook) && prep + cook > 0 ? prep + cook : undefined;
				const cover = pickImageUrl(fromApi.images);
				const mealRaw = fromApi.meal_types?.[0] ?? null;
				const meal = mealRaw
					? {
							id: mealRaw.id,
							name: mealRaw.name ?? undefined,
							slug: mealRaw.slug ?? undefined
						}
					: undefined;
				return {
					...r,
					recipeId: fromApi.id,
					title: fromApi.title ?? r.title,
					summary: fromApi.summary ?? r.summary,
					difficulty: (fromApi.difficulty ?? r.difficulty) as RecipeSearchResult['difficulty'],
					totalTimeMin: totalTimeMin ?? r.totalTimeMin,
					meal_type: meal ?? r.meal_type,
					coverImage: cover ? { url: absoluteMediaUrl(cover) } : r.coverImage
				};
			});
		}

		return {
			query,
			indexName,
			results,
			error: null as string | null
		};
	} catch (e) {
		return {
			query,
			indexName,
			results: [] as RecipeSearchResult[],
			error: e instanceof Error ? e.message : 'Nepavyko atlikti paieškos.'
		};
	}
};
