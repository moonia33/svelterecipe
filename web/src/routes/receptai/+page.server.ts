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
	const res = await backendJson<RecipeListResponse>(event, '/recipes?limit=100&offset=0');

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

	return { recipes };
};
