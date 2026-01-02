import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

type TurnstileVerifyResponse = {
	success: boolean;
	'error-codes'?: string[];
	challenge_ts?: string;
	hostname?: string;
	action?: string;
	cdata?: string;
};

function firstHeader(headers: Headers, name: string): string | undefined {
	const v = headers.get(name);
	return v && v.trim() ? v.trim() : undefined;
}

function parseXForwardedFor(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const first = value.split(',')[0]?.trim();
	return first || undefined;
}

function getClientIp(event: RequestEvent): string | undefined {
	return (
		firstHeader(event.request.headers, 'cf-connecting-ip') ??
		parseXForwardedFor(firstHeader(event.request.headers, 'x-forwarded-for')) ??
		(() => {
			try {
				return event.getClientAddress?.();
			} catch {
				return undefined;
			}
		})()
	);
}

export async function verifyTurnstile(
	event: RequestEvent,
	turnstileToken: string
): Promise<{ ok: true } | { ok: false; message: string }> {
	const secret = env.TURNSTILE_SECRET_KEY;
	if (!secret) {
		return {
			ok: false,
			message: 'Trūksta TURNSTILE_SECRET_KEY aplinkos kintamojo.'
		};
	}

	const token = (turnstileToken ?? '').trim();
	if (!token) {
		return { ok: false, message: 'Patvirtinkite, kad nesate robotas.' };
	}

	try {
		const remoteip = getClientIp(event);
		const body = new URLSearchParams();
		body.set('secret', secret);
		body.set('response', token);
		if (remoteip) body.set('remoteip', remoteip);

		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body
		});

		const data = (await res.json().catch(() => null)) as TurnstileVerifyResponse | null;
		if (!res.ok || !data) {
			return { ok: false, message: 'Nepavyko patikrinti Turnstile.' };
		}

		if (!data.success) {
			return {
				ok: false,
				message: 'Nepavyko patvirtinti Turnstile. Pabandykite dar kartą.'
			};
		}

		return { ok: true };
	} catch {
		return { ok: false, message: 'Nepavyko patikrinti Turnstile.' };
	}
}
