import type { LayoutServerLoad } from './$types';

import { redirect } from '@sveltejs/kit';

import { backendJson } from '$lib/server/backend-api';

type SessionSchema = {
	is_authenticated?: boolean;
	user?: unknown | null;
	csrf_token?: string;
};

export const load: LayoutServerLoad = async (event) => {
	const session = await backendJson<SessionSchema>(event, '/auth/session', { method: 'GET' });
	if (!session?.is_authenticated) {
		throw redirect(303, '/auth/prisijungimas');
	}

	return {
		user: session.user ?? null
	};
};
