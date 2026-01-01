import type { PageServerLoad } from './$types';

import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.toString();
	throw redirect(308, `/registracija${q ? `?${q}` : ''}`);
};
