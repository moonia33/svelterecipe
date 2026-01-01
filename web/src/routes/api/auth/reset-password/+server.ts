import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';

export const POST: RequestHandler = async (event) => {
	// Naujas backendas greičiausiai naudoja (uid, token) arba panašų reset confirm.
	// Bandome kelis galimus endpointus – jei nerasta, grąžinam aiškią klaidą.
	const body = (await event.request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) return json({ detail: 'Trūksta duomenų.' }, { status: 400 });

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const tryPaths = ['/auth/reset-password', '/auth/password-reset-confirm'];

	for (const p of tryPaths) {
		const { res, data, setCookies } = await backendPostJson<Record<string, unknown>>(
			event,
			p,
			body,
			{ csrfToken, extraCookies: csrfCookies }
		);
		const headers = new Headers();
		for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);
		if (res.status === 404) continue;
		return json(data, { status: res.status, headers });
	}

	return json(
		{ detail: 'Slaptažodžio patvirtinimo endpointas backende nerastas.' },
		{ status: 501 }
	);
};
