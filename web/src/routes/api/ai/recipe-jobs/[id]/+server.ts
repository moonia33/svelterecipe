import { json, type RequestHandler } from '@sveltejs/kit';

import { backendJson } from '$lib/server/backend-api';

type RecipeJobStatus = {
	job_id: number;
	status: string;
	created_at?: string | null;
	started_at?: string | null;
	finished_at?: string | null;
	result_recipe_id?: number | null;
	result_recipe_slug?: string | null;
	error?: string | null;
};

export const GET: RequestHandler = async (event) => {
	const id = (event.params.id ?? '').trim();
	if (!id) return json({ detail: 'Trūksta job ID.' }, { status: 400 });

	const data = await backendJson<RecipeJobStatus>(
		event,
		`/ai/recipe-jobs/${encodeURIComponent(id)}`
	);
	return json(data);
};
