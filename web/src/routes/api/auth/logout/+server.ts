import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';

type SessionSchema = {
	is_authenticated: boolean;
	csrf_token: string;
	user: unknown | null;
};

export const POST: RequestHandler = async (event) => {
	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<SessionSchema>(
		event,
		'/auth/logout',
		{},
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);
	return json(data, { status: res.status, headers });
};
