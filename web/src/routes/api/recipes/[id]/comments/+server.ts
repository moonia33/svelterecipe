import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';

export const POST: RequestHandler = async (event) => {
	const id = event.params.id;
	if (!id) return json({ detail: 'Trūksta recepto ID.' }, { status: 400 });

	const body = (await event.request.json().catch(() => null)) as { content?: string } | null;
	const content = body?.content?.trim();
	if (!content) return json({ detail: 'Trūksta komentaro teksto.' }, { status: 400 });

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<Record<string, unknown>>(
		event,
		`/recipes/${encodeURIComponent(id)}/comments`,
		{ content },
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);
	return json(data, { status: res.status, headers });
};
