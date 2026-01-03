<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	function field(user: unknown, key: string): string | null {
		if (!user || typeof user !== 'object') return null;
		const v = (user as Record<string, unknown>)[key];
		if (typeof v === 'string' && v.trim()) return v.trim();
		if (typeof v === 'number') return String(v);
		return null;
	}

	function consentsObj(user: unknown): Record<string, unknown> | null {
		if (!user || typeof user !== 'object') return null;
		const v = (user as Record<string, unknown>).consents;
		return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
	}

	function pickBool(obj: Record<string, unknown> | null, key: string, fallback = false): boolean {
		const v = obj?.[key];
		return typeof v === 'boolean' ? v : fallback;
	}

	const initialConsents = $derived(consentsObj(data.user));

	let newsletterConsent = $state(false);
	let privacyPolicyConsent = $state(false);
	let termsOfServiceConsent = $state(false);

	let saving = $state(false);
	let message = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	const dirty = $derived(
		newsletterConsent !== pickBool(initialConsents, 'newsletter_consent', false) ||
			privacyPolicyConsent !== pickBool(initialConsents, 'privacy_policy_consent', false) ||
			termsOfServiceConsent !== pickBool(initialConsents, 'terms_of_service_consent', false)
	);

	$effect(() => {
		// jei sesijos user atsinaujino (pvz. po invalidate), perstatom į serverio reikšmes
		newsletterConsent = pickBool(initialConsents, 'newsletter_consent', false);
		privacyPolicyConsent = pickBool(initialConsents, 'privacy_policy_consent', false);
		termsOfServiceConsent = pickBool(initialConsents, 'terms_of_service_consent', false);
	});

	async function saveConsents() {
		message = null;
		errorMsg = null;
		if (!dirty) {
			message = 'Nėra pakeitimų.';
			return;
		}

		saving = true;
		try {
			const prev = initialConsents;
			const payload: Record<string, boolean> = {};
			if (newsletterConsent !== pickBool(prev, 'newsletter_consent', false)) {
				payload.newsletter_consent = newsletterConsent;
			}
			if (privacyPolicyConsent !== pickBool(prev, 'privacy_policy_consent', false)) {
				payload.privacy_policy_consent = privacyPolicyConsent;
			}
			if (termsOfServiceConsent !== pickBool(prev, 'terms_of_service_consent', false)) {
				payload.terms_of_service_consent = termsOfServiceConsent;
			}

			const res = await fetch('/api/auth/consents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const body = (await res.json().catch(() => null)) as unknown;
			const detail =
				body && typeof body === 'object' && 'detail' in (body as Record<string, unknown>)
					? (body as Record<string, unknown>).detail
					: undefined;
			if (!res.ok) {
				errorMsg = typeof detail === 'string' ? detail : 'Nepavyko atnaujinti sutikimų.';
				return;
			}

			message = 'Sutikimai atnaujinti.';
			await invalidateAll();
		} catch {
			errorMsg = 'Nepavyko atnaujinti sutikimų.';
		} finally {
			saving = false;
		}
	}
</script>

<Card.Root class="max-w-2xl">
	<Card.Header>
		<Card.Title>Profilis</Card.Title>
		<Card.Description>Jūsų paskyros informacija.</Card.Description>
	</Card.Header>
	<Card.Content class="grid gap-6 text-sm">
		<div class="grid gap-2">
			<p>
				<span class="text-muted-foreground">Vartotojo vardas:</span>
				{field(data.user, 'username') ?? '—'}
			</p>
			<p>
				<span class="text-muted-foreground">El. paštas:</span>
				{field(data.user, 'email') ?? '—'}
			</p>
			<p><span class="text-muted-foreground">ID:</span> {field(data.user, 'id') ?? '—'}</p>
		</div>

		<div class="grid gap-3">
			<div class="grid gap-1">
				<p class="font-medium">Sutikimai</p>
				<p class="text-xs text-muted-foreground">Galite atnaujinti savo pasirinkimus.</p>
			</div>

			<div class="grid gap-3">
				<label class="flex items-start gap-2">
					<Checkbox bind:checked={privacyPolicyConsent} />
					<span class="leading-5">Privatumo politika</span>
				</label>
				<label class="flex items-start gap-2">
					<Checkbox bind:checked={termsOfServiceConsent} />
					<span class="leading-5">Naudojimo taisyklės</span>
				</label>
				<label class="flex items-start gap-2">
					<Checkbox bind:checked={newsletterConsent} />
					<span class="leading-5">Naujienlaiškis</span>
				</label>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<Button variant="secondary" size="sm" disabled={!dirty || saving} onclick={saveConsents}>
					{saving ? 'Saugoma…' : 'Išsaugoti'}
				</Button>
				{#if message}
					<span class="text-xs text-muted-foreground">{message}</span>
				{/if}
				{#if errorMsg}
					<span class="text-xs text-destructive">{errorMsg}</span>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>
