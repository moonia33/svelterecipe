<script lang="ts">
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';

	type Props = {
		onToken?: (token: string) => void;
		onError?: (message: string) => void;
	};

	let { onToken, onError }: Props = $props();

	let widgetId: string | null = null;

	type TurnstileRenderOptions = {
		sitekey: string;
		theme?: 'auto' | 'light' | 'dark';
		callback?: (token: string) => void;
		'expired-callback'?: () => void;
		'error-callback'?: () => void;
	};

	type TurnstileApi = {
		render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
		reset: (widgetId?: string) => void;
	};

	function getTurnstile(): TurnstileApi | null {
		const w = globalThis as unknown as { turnstile?: TurnstileApi };
		return w.turnstile ?? null;
	}

	function ensureScriptLoaded(): Promise<void> {
		if (getTurnstile()) return Promise.resolve();

		const existing = document.querySelector('script[data-turnstile="true"]');
		if (existing) {
			return new Promise((resolve, reject) => {
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener(
					'error',
					() => reject(new Error('Turnstile script load failed')),
					{
						once: true
					}
				);
			});
		}

		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.async = true;
			script.defer = true;
			script.dataset.turnstile = 'true';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Turnstile script load failed'));
			document.head.appendChild(script);
		});
	}

	function mountTurnstile(node: HTMLDivElement) {
		let disposed = false;

		void (async () => {
			try {
				await ensureScriptLoaded();
				if (disposed) return;

				const api = getTurnstile();
				if (!api) throw new Error('Turnstile API nepasiekiamas');

				widgetId = api.render(node, {
					sitekey: PUBLIC_TURNSTILE_SITE_KEY,
					theme: 'auto',
					callback: (token) => onToken?.(token),
					'expired-callback': () => onToken?.(''),
					'error-callback': () =>
						onError?.('Nepavyko įkelti Turnstile. Pabandykite perkrauti puslapį.')
				});
			} catch {
				onError?.('Nepavyko įkelti Turnstile. Pabandykite perkrauti puslapį.');
			}
		})();

		return () => {
			disposed = true;
			const api = getTurnstile();
			try {
				if (api && widgetId) api.reset(widgetId);
			} catch {
				// ignore
			}
		};
	}
</script>

<div {@attach mountTurnstile}></div>
