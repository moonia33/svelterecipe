import { json, type RequestHandler } from '@sveltejs/kit';

import { backendPostJson, ensureCsrf } from '$lib/server/backend-api';

type RecipeJobCreateRequest = {
	dish_type?: string;
	prep_speed?: string;
	have_ingredient_ids?: number[];
	have_ingredients_text?: string[];
	can_buy_ingredient_ids?: number[];
	can_buy_ingredients_text?: string[];
	exclude?: string[];
};

type RecipeJobCreateResponse = { job_id: number; status: string };

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as RecipeJobCreateRequest | null;
	if (!body || typeof body !== 'object') {
		return json({ detail: 'Neteisingas payload.' }, { status: 400 });
	}

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<RecipeJobCreateResponse>(
		event,
		'/ai/recipe-jobs',
		body,
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);
	return json(data, { status: res.status, headers });
};
