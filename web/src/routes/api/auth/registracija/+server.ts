import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';
import { verifyTurnstile } from '$lib/server/turnstile';

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as {
		username?: string;
		email?: string;
		password?: string;
		turnstileToken?: string;
	} | null;

	const username = body?.username?.trim();
	const email = body?.email?.trim();
	const password = body?.password ?? '';
	const turnstileToken = body?.turnstileToken ?? '';

	if (!username || !email || !password) {
		return json(
			{ message: 'Trūksta registracijos duomenų.', loggedIn: false, user: null },
			{ status: 400 }
		);
	}

	const turnstile = await verifyTurnstile(event, turnstileToken);
	if (!turnstile.ok) {
		return json({ message: turnstile.message, loggedIn: false, user: null }, { status: 403 });
	}

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);

	const { res, data, setCookies } = await backendPostJson<Record<string, unknown>>(
		event,
		'/auth/register',
		{ username, email, password },
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);

	if (!res.ok) {
		const detail =
			(typeof (data as Record<string, unknown>)?.detail === 'string'
				? ((data as Record<string, unknown>).detail as string)
				: undefined) ?? 'Nepavyko sukurti paskyros.';
		return json({ message: detail, loggedIn: false, user: null }, { status: res.status, headers });
	}

	const isAuthed = (data as Record<string, unknown>)?.is_authenticated === true;
	return json(
		{ user: (data as Record<string, unknown>)?.user ?? null, loggedIn: isAuthed },
		{ status: 200, headers }
	);
};
