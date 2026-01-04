import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { backendJson } from '$lib/server/backend-api';

type Named = { id: number; name?: string | null; slug?: string | null; parent_id?: number | null };

export const GET: RequestHandler = async (event) => {
	const sp = event.url.searchParams;
	const params = new URLSearchParams();

	const passthrough = ['search', 'limit', 'offset', 'parent_id', 'root_only'] as const;
	for (const key of passthrough) {
		const v = (sp.get(key) ?? '').trim();
		if (v) params.set(key, v);
	}

	const data = await backendJson<{ total: number; items: Named[] }>(
		event,
		`/recipes/categories?${params.toString()}`
	);
	return json(data);
};
