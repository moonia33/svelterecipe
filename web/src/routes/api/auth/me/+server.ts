import { json, type RequestHandler } from '@sveltejs/kit';

import { backendFetch } from '$lib/server/backend-api';

export const GET: RequestHandler = async (event) => {
	const res = await backendFetch(event, '/auth/session', { method: 'GET' });
	const payload = (await res.json().catch(() => null)) as {
		is_authenticated?: boolean;
		user?: unknown | null;
		csrf_token?: string;
	} | null;

	if (!res.ok) {
		return json({ message: 'Nepavyko gauti sesijos.' }, { status: res.status });
	}

	if (!payload?.is_authenticated) {
		return json({ message: 'Neprisijungęs.' }, { status: 401 });
	}

	return json({ user: payload.user ?? null });
};
