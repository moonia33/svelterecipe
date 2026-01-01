import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as {
		username?: string;
		email?: string;
		password?: string;
	} | null;

	const username = body?.username?.trim();
	const email = body?.email?.trim();
	const password = body?.password ?? '';
	if (!username || !email || !password) {
		return json({ detail: 'Trūksta registracijos duomenų.' }, { status: 400 });
	}

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const tryPaths = ['/auth/register', '/auth/signup'];

	for (const p of tryPaths) {
		const { res, data, setCookies } = await backendPostJson<Record<string, unknown>>(
			event,
			p,
			{ username, email, password },
			{ csrfToken, extraCookies: csrfCookies }
		);

		const headers = new Headers();
		for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);

		if (res.status === 404) continue;
		return json(data, { status: res.status, headers });
	}

	return json(
		{
			detail:
				'Registracijos endpointas backende nerastas (tikrinta /auth/register ir /auth/signup).'
		},
		{ status: 501 }
	);
};
