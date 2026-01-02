import { env } from '$env/dynamic/public';
import type { RequestEvent } from '@sveltejs/kit';

function apiBase(): string {
	const base = (env.PUBLIC_API_BASE_URL ?? '').trim();
	// Patogus fallback, kad puslapiai nekrėstų 500 vien dėl env.
	// Jei nori kviesti lokalią Django instanciją, nustatyk PUBLIC_API_BASE_URL=http://localhost:8000
	if (!base) return 'https://api.apetitas.lt';
	return base.endsWith('/') ? base.slice(0, -1) : base;
}

export function apiUrl(path: string): string {
	const base = apiBase();
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	// Jei base neturi /api pabaigoje, o kelias jo irgi neprasideda, pridedam /api.
	let baseHasApi = false;
	try {
		const u = new URL(base);
		baseHasApi = u.pathname.replace(/\/+$/, '') === '/api';
	} catch {
		// ignore
	}

	const needsApiPrefix = !baseHasApi && !normalizedPath.startsWith('/api');
	const finalPath = needsApiPrefix ? `/api${normalizedPath}` : normalizedPath;
	return `${base}${finalPath}`;
}

function applyCsrfOriginHeaders(event: RequestEvent, headers: Headers): void {
	// Django CSRF apsauga HTTPS režime dažnai reikalauja `Origin` ir/arba `Referer`.
	// Kadangi šiuos requestus darome server-side (proxy), naršyklės headeriai
	// automatiškai nepridedami, todėl pridedame patys.
	//
	// Backend'e turi būti sukonfigūruota `CSRF_TRUSTED_ORIGINS` (žr. .copilot/backend.md)
	// įtraukiant frontendo origin (pvz. https://apetitas.lt).
	const origin = event.url.origin;
	if (origin) {
		headers.set('origin', origin);
		headers.set('referer', `${origin}/`);
	}
}

function getSetCookies(res: Response): string[] {
	const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] };
	const fromMethod = anyHeaders.getSetCookie?.() ?? [];
	const fromGet = res.headers.get('set-cookie');
	const out = [...fromMethod];
	if (fromGet) out.push(fromGet);
	return out.filter(Boolean);
}

function mergeCookieHeader(
	existingCookieHeader: string | null,
	extraCookies: string[]
): string | undefined {
	const existing = (existingCookieHeader ?? '').trim();
	// extraCookies gali būti tiek "name=value", tiek pilnos "Set-Cookie" eilutės.
	// Cookie headeriui tinka tik "name=value" poros.
	const extra = extraCookies.map((c) => c.split(';', 1)[0]?.trim() ?? '').filter(Boolean);
	if (!existing && extra.length === 0) return undefined;
	if (!existing) return extra.join('; ');
	if (extra.length === 0) return existing;
	return `${existing}; ${extra.join('; ')}`;
}

export async function backendFetch(
	event: RequestEvent,
	path: string,
	init?: RequestInit
): Promise<Response> {
	const url = apiUrl(path);
	const headers = new Headers(init?.headers);
	headers.set('accept', 'application/json');
	applyCsrfOriginHeaders(event, headers);

	// Forward browser cookies (sessionid/csrftoken) to backend.
	const cookieHeader = mergeCookieHeader(event.request.headers.get('cookie'), []);
	if (cookieHeader) headers.set('cookie', cookieHeader);

	return fetch(url, {
		...init,
		headers
	});
}

export async function backendJson<T>(
	event: RequestEvent,
	path: string,
	init?: RequestInit
): Promise<T> {
	const res = await backendFetch(event, path, init);
	if (!res.ok) {
		let detail: string | undefined;
		try {
			const data = (await res.json()) as unknown;
			if (data && typeof data === 'object' && 'detail' in data) {
				const v = (data as Record<string, unknown>).detail;
				if (typeof v === 'string') detail = v;
			}
		} catch {
			// ignore
		}
		throw new Error(detail ?? `Backend klaida: HTTP ${res.status}`);
	}
	return (await res.json()) as T;
}

export async function ensureCsrf(
	event: RequestEvent
): Promise<{ csrfToken: string; setCookies: string[] }> {
	const existing = event.cookies.get('csrftoken');
	if (existing) return { csrfToken: existing, setCookies: [] };

	const res = await fetch(apiUrl('/auth/session'), {
		method: 'GET',
		headers: { accept: 'application/json' }
	});

	const setCookies = getSetCookies(res);
	let csrfToken = '';
	try {
		const payload = (await res.json()) as unknown;
		if (payload && typeof payload === 'object') {
			const v = (payload as Record<string, unknown>).csrf_token;
			if (typeof v === 'string') csrfToken = v;
		}
	} catch {
		// ignore
	}

	if (!csrfToken) {
		// fallback: try to parse from Set-Cookie
		const cookieLine = setCookies.find((c) => c.toLowerCase().startsWith('csrftoken='));
		if (cookieLine) csrfToken = cookieLine.split(';', 1)[0]?.split('=', 2)[1] ?? '';
	}

	if (!csrfToken) {
		throw new Error('Nepavyko gauti CSRF tokeno. Pabandykite perkrauti puslapį.');
	}

	return { csrfToken, setCookies };
}

export async function backendPostJson<T>(
	event: RequestEvent,
	path: string,
	body: unknown,
	opts?: { extraCookies?: string[]; csrfToken?: string }
): Promise<{ res: Response; data: T; setCookies: string[] }> {
	const headers = new Headers();
	headers.set('accept', 'application/json');
	headers.set('content-type', 'application/json');
	if (opts?.csrfToken) headers.set('x-csrftoken', opts.csrfToken);
	applyCsrfOriginHeaders(event, headers);

	const cookieHeader = mergeCookieHeader(
		event.request.headers.get('cookie'),
		opts?.extraCookies ?? []
	);
	if (cookieHeader) headers.set('cookie', cookieHeader);

	const res = await fetch(apiUrl(path), {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	const setCookies = getSetCookies(res);
	const data = (await res.json().catch(() => ({}))) as T;
	return { res, data, setCookies };
}
