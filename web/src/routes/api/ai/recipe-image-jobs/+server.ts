import { json, type RequestHandler } from '@sveltejs/kit';

import { backendPostJson, ensureCsrf } from '$lib/server/backend-api';

type RecipeImageJobCreateRequest = { recipe_id?: number; recipe_slug?: string };

type RecipeImageJobCreateResponse = { job_id: number; status: string };

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as RecipeImageJobCreateRequest | null;
	if (!body || typeof body !== 'object') {
		return json({ detail: 'Neteisingas payload.' }, { status: 400 });
	}

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<RecipeImageJobCreateResponse>(
		event,
		'/ai/recipe-image-jobs',
		body,
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);
	return json(data, { status: res.status, headers });
};
