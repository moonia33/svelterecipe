<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import Turnstile from '$lib/components/auth/turnstile.svelte';

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') ?? '');

	let email = $state('');
	let turnstileToken = $state('');
	let turnstileError = $state<string | null>(null);
	let pending = $state(false);
	let message = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	function asRecord(value: unknown): Record<string, unknown> | null {
		return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
	}

	async function goToLogin() {
		const q = new SvelteURLSearchParams();
		if (redirectTo) q.set('redirectTo', redirectTo);
		const href = `/auth/prisijungimas${q.size ? `?${q.toString()}` : ''}`;
		await goto(resolve(...([href] as unknown as Parameters<typeof resolve>)));
	}

	async function submit() {
		message = null;
		errorMsg = null;
		turnstileError = null;

		if (!turnstileToken) {
			errorMsg = 'Patvirtinkite, kad nesate robotas.';
			return;
		}

		pending = true;
		try {
			const res = await fetch('/api/auth/password-reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, turnstileToken })
			});
			const payload = (await res.json().catch(() => null)) as unknown;
			const rec = asRecord(payload);
			const msg = typeof rec?.message === 'string' ? (rec.message as string) : null;

			if (!res.ok) {
				errorMsg = msg ?? 'Nepavyko išsiųsti laiško.';
				return;
			}

			message = 'Jei el. paštas egzistuoja, išsiuntėme atstatymo laišką.';
		} catch {
			errorMsg = 'Nepavyko išsiųsti laiško.';
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Pamiršau slaptažodį</title>
	<meta name="description" content="Slaptažodžio atstatymo nuorodos siuntimas." />
</svelte:head>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-2xl">Pamiršau slaptažodį</Card.Title>
				<Card.Description>Įveskite el. paštą ir atsiųsime atstatymo nuorodą.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					class="grid gap-4"
					onsubmit={(e) => {
						e.preventDefault();
						void submit();
					}}
				>
					<div class="grid gap-2">
						<Label for="fp_email">El. paštas</Label>
						<Input id="fp_email" type="email" autocomplete="email" bind:value={email} required />
					</div>

					<div class="grid gap-2">
						<Turnstile
							onToken={(t) => (turnstileToken = t)}
							onError={(m) => (turnstileError = m)}
						/>
						{#if turnstileError}
							<p class="text-sm text-destructive">{turnstileError}</p>
						{/if}
					</div>

					{#if errorMsg}
						<p class="text-sm text-destructive">{errorMsg}</p>
					{/if}
					{#if message}
						<p class="text-sm text-muted-foreground">{message}</p>
					{/if}

					<Button type="submit" class="w-full" disabled={pending}>
						{pending ? 'Siunčiama…' : 'Siųsti nuorodą'}
					</Button>

					<Button type="button" variant="outline" class="w-full" onclick={() => void goToLogin()}>
						Grįžti į prisijungimą
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
