import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';
import { verifyTurnstile } from '$lib/server/turnstile';

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
	for (const k of keys) {
		const v = obj[k];
		if (typeof v === 'string' && v.trim()) return v.trim();
	}
	return undefined;
}

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) return json({ detail: 'Trūksta duomenų.' }, { status: 400 });

	const uid = pickString(body, ['uid', 'uidb64']);
	const token = pickString(body, ['token']);
	const newPassword = pickString(body, ['new_password', 'newPassword', 'password']);
	const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';

	if (!uid || !token || !newPassword) {
		return json({ detail: 'Trūksta uid, token arba naujo slaptažodžio.' }, { status: 400 });
	}

	const turnstile = await verifyTurnstile(event, turnstileToken);
	if (!turnstile.ok) {
		return json({ detail: turnstile.message }, { status: 403 });
	}

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<Record<string, unknown>>(
		event,
		'/auth/password-reset-confirm',
		{ uid, token, new_password: newPassword },
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);
	return json(data, { status: res.status, headers });
};
