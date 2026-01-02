import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const next = new URL('/auth/slaptazodzio-atstatymas', url);
	for (const [k, v] of url.searchParams.entries()) next.searchParams.set(k, v);
	next.searchParams.set('uid', params.uid);
	next.searchParams.set('token', params.token);
	throw redirect(302, `${next.pathname}${next.search}`);
};
