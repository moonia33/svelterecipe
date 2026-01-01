import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as { email?: string } | null;
	const email = body?.email?.trim();

	if (!email) return json({ message: 'Įveskite el. paštą.' }, { status: 400 });

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<Record<string, unknown>>(
		event,
		'/auth/password-reset',
		{ email },
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);

	if (!res.ok) {
		const detail =
			typeof data.detail === 'string'
				? (data.detail as string)
				: 'Nepavyko išsiųsti atstatymo laiško.';
		return json({ message: detail }, { status: res.status, headers });
	}

	return json({ ok: true }, { status: 200, headers });
};
