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
		return json({ detail: 'Trūksta prisijungimo duomenų.' }, { status: 400 });
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

	if (!res.ok) {
		const detail =
			data && typeof data === 'object' && 'detail' in (data as Record<string, unknown>)
				? (data as Record<string, unknown>).detail
				: undefined;
		return json(
			{ detail: typeof detail === 'string' ? detail : 'Nepavyko prisijungti.' },
			{ status: res.status, headers }
		);
	}

	return json(data, { status: 200, headers });
};
