import type { PageServerLoad } from './$types';

import { backendJson } from '$lib/server/backend-api';

type ImageVariant = { avif?: string | null; webp?: string | null } | null;
type ImageSet = {
	original?: string | null;
	thumb?: ImageVariant;
	small?: ImageVariant;
	medium?: ImageVariant;
	large?: ImageVariant;
} | null;

type RecipeSummary = {
	id: number;
	slug: string;
	title: string;
	difficulty?: string | null;
	images?: ImageSet;
	summary?: string | null;
	preparation_time?: number | null;
	cooking_time?: number | null;
	servings?: number | null;
	published_at?: string | null;
	rating_average?: number | null;
	rating_count?: number | null;
	is_bookmarked?: boolean | null;
};

type RecipeListResponse = { total: number; items: RecipeSummary[] };

type Named = { id: number; name?: string | null; slug?: string | null };
type DifficultyFilter = { key: string; label: string };
type FiltersResponse = {
	cuisines: Named[];
	meal_types: Named[];
	cooking_methods: Named[];
	difficulties: DifficultyFilter[];
};

function difficultyLt(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	const v = value.trim().toLowerCase();
	if (v === 'easy') return 'lengvas';
	if (v === 'medium') return 'vidutinis';
	if (v === 'hard') return 'sunkus';
	return value;
}

function pickImageUrl(images: ImageSet | undefined | null): string | undefined {
	const v = images ?? null;
	const candidates: Array<string | null | undefined> = [
		v?.small?.webp,
		v?.small?.avif,
		v?.thumb?.webp,
		v?.thumb?.avif,
		v?.medium?.webp,
		v?.medium?.avif,
		v?.original
	];
	return candidates.find((x) => typeof x === 'string' && x.trim())?.trim();
}

export const load: PageServerLoad = async (event) => {
	const sp = event.url.searchParams;
	const limit = (() => {
		const raw = Number(sp.get('limit') ?? '');
		if (!Number.isFinite(raw)) return 20;
		return Math.min(100, Math.max(20, Math.trunc(raw)));
	})();
	const offset = (() => {
		const raw = Number(sp.get('offset') ?? '');
		if (!Number.isFinite(raw)) return 0;
		return Math.max(0, Math.trunc(raw));
	})();

	const queryKeys = [
		'search',
		'tag',
		'category',
		'ingredient_category',
		'cuisine',
		'meal_type',
		'cooking_method',
		'difficulty'
	] as const;
	const params = new URLSearchParams();
	params.set('limit', String(limit));
	params.set('offset', String(offset));
	for (const key of queryKeys) {
		const v = (sp.get(key) ?? '').trim();
		if (v) params.set(key, v);
	}

	const [res, filters] = await Promise.all([
		backendJson<RecipeListResponse>(event, `/recipes?${params.toString()}`),
		backendJson<FiltersResponse>(event, '/recipes/filters')
	]);

	const recipes = (res.items ?? [])
		.map((r) => {
			const prep = r.preparation_time ?? 0;
			const cook = r.cooking_time ?? 0;
			const totalTimeMin =
				Number.isFinite(prep + cook) && prep + cook > 0 ? prep + cook : undefined;
			return {
				id: r.id,
				slug: r.slug,
				title: r.title ?? r.slug,
				summary: r.summary ?? undefined,
				difficulty: difficultyLt(r.difficulty ?? undefined),
				totalTimeMin,
				meal_type: null as null,
				coverImage: pickImageUrl(r.images)
					? { url: pickImageUrl(r.images), alternativeText: r.title }
					: null
			};
		})
		.sort((a, b) => a.title.localeCompare(b.title, 'lt'));

	const query = Object.fromEntries(queryKeys.map((k) => [k, (sp.get(k) ?? '').trim()])) as Record<
		(typeof queryKeys)[number],
		string
	>;

	return { recipes, total: res.total ?? 0, limit, offset, query, filters };
};
