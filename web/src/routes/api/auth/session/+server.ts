import type { RequestHandler } from '@sveltejs/kit';

import { backendFetch } from '$lib/server/backend-api';

export const GET: RequestHandler = async (event) => {
	const res = await backendFetch(event, '/auth/session', { method: 'GET' });
	const body = await res.text();

	const headers = new Headers();
	headers.set('content-type', res.headers.get('content-type') ?? 'application/json');

	const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] };
	const setCookies =
		anyHeaders.getSetCookie?.() ??
		(res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
	for (const c of setCookies) headers.append('set-cookie', c);

	return new Response(body, { status: res.status, headers });
};
