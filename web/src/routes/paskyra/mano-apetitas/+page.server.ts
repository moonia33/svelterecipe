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
	title: string;
	slug: string;
	images?: ImageSet;
	rating_average?: number | null;
	rating_count?: number | null;
};

type RecipeListResponse = {
	total?: number;
	items?: RecipeSummary[];
};

export const load: PageServerLoad = async (event) => {
	try {
		const data = await backendJson<RecipeListResponse>(event, '/recipes/bookmarks');
		const items = Array.isArray(data?.items) ? data.items : [];
		return {
			total: typeof data?.total === 'number' ? data.total : items.length,
			items,
			error: null as string | null
		};
	} catch (e) {
		return {
			total: 0,
			items: [],
			error: e instanceof Error ? e.message : 'Nepavyko gauti išsaugotų receptų.'
		};
	}
};
