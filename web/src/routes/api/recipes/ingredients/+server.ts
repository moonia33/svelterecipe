import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { backendJson } from '$lib/server/backend-api';

type IngredientCategory = {
	id: number;
	name?: string | null;
	slug?: string | null;
	parent_id?: number | null;
};

type Ingredient = {
	id: number;
	name?: string | null;
	title?: string | null;
	category?: IngredientCategory | null;
};

export const GET: RequestHandler = async (event) => {
	const sp = event.url.searchParams;
	const params = new URLSearchParams();

	const passthrough = ['search', 'limit', 'offset', 'category'] as const;
	for (const key of passthrough) {
		const v = (sp.get(key) ?? '').trim();
		if (v) params.set(key, v);
	}

	const data = await backendJson<{ total: number; items: Ingredient[] }>(
		event,
		`/recipes/ingredients?${params.toString()}`
	);
	return json(data);
};
