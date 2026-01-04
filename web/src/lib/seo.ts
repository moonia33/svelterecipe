export function canonicalFromUrl(url: URL): string {
	return `${url.origin}${url.pathname}`;
}

export function ensureAbsoluteUrl(
	urlOrPath: string | null | undefined,
	origin: string
): string | null {
	const raw = typeof urlOrPath === 'string' ? urlOrPath.trim() : '';
	if (!raw) return null;
	try {
		return new URL(raw, origin).toString();
	} catch {
		return null;
	}
}

export function isoDurationFromMinutes(minutes: number | null | undefined): string | null {
	if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) return null;
	return `PT${Math.round(minutes)}M`;
}

export function stripHtml(input: string): string {
	return input
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function truncate(input: string, maxLen: number): string {
	const v = input.trim();
	if (v.length <= maxLen) return v;
	return `${v.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

export function jsonLdStringify(value: unknown): string {
	// JSON-LD dedamas į <script> tagą, todėl apsaugom nuo netyčinio "</script" substring.
	return JSON.stringify(value).replace(/<\//g, '<\\/');
}
