import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';

type SessionSchema = {
	is_authenticated: boolean;
	csrf_token: string;
	user: unknown | null;
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as {
		identifier?: string;
		password?: string;
	} | null;

	const identifier = body?.identifier?.trim();
	const password = body?.password ?? '';
	if (!identifier || !password) {
		return json(
			{ message: 'Trūksta prisijungimo duomenų.', loggedIn: false, user: null },
			{ status: 400 }
		);
	}

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<SessionSchema>(
		event,
		'/auth/login',
		{ identifier, password },
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);

	if (!res.ok || !data?.is_authenticated) {
		const detail =
			data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>)
				? (data as Record<string, unknown>).detail
				: undefined;
		return json(
			{
				message: typeof detail === 'string' ? detail : 'Nepavyko prisijungti.',
				loggedIn: false,
				user: data?.user ?? null
			},
			{ status: res.status, headers }
		);
	}

	return json({ user: data.user ?? null, loggedIn: true }, { status: 200, headers });
};
