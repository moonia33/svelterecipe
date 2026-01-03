import { json, type RequestHandler } from '@sveltejs/kit';

import { ensureCsrf, backendPostJson } from '$lib/server/backend-api';

type ConsentsPayload = {
	newsletter_consent?: boolean;
	privacy_policy_consent?: boolean;
	terms_of_service_consent?: boolean;
};

export const POST: RequestHandler = async (event) => {
	const body = (await event.request.json().catch(() => null)) as ConsentsPayload | null;
	if (!body) return json({ detail: 'Trūksta duomenų.' }, { status: 400 });

	const payload: ConsentsPayload = {};
	if (typeof body.newsletter_consent === 'boolean')
		payload.newsletter_consent = body.newsletter_consent;
	if (typeof body.privacy_policy_consent === 'boolean')
		payload.privacy_policy_consent = body.privacy_policy_consent;
	if (typeof body.terms_of_service_consent === 'boolean')
		payload.terms_of_service_consent = body.terms_of_service_consent;

	if (!Object.keys(payload).length) {
		return json({ detail: 'Nėra ką atnaujinti.' }, { status: 400 });
	}

	const { csrfToken, setCookies: csrfCookies } = await ensureCsrf(event);
	const { res, data, setCookies } = await backendPostJson<Record<string, unknown>>(
		event,
		'/auth/consents',
		payload,
		{ csrfToken, extraCookies: csrfCookies }
	);

	const headers = new Headers();
	for (const c of [...csrfCookies, ...setCookies]) headers.append('set-cookie', c);
	return json(data, { status: res.status, headers });
};
