<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Turnstile from '$lib/components/auth/turnstile.svelte';

	const dispatch = createEventDispatcher<{
		success: void;
		switchToLogin: void;
	}>();

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirmation = $state('');
	let turnstileToken = $state('');
	let turnstileError = $state<string | null>(null);
	let pending = $state(false);
	let errorMsg = $state<string | null>(null);

	function asRecord(value: unknown): Record<string, unknown> | null {
		return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
	}

	async function submit() {
		errorMsg = null;
		turnstileError = null;
		if (password !== passwordConfirmation) {
			errorMsg = 'Slaptažodžiai nesutampa.';
			return;
		}
		if (!turnstileToken) {
			errorMsg = 'Patvirtinkite, kad nesate robotas.';
			return;
		}

		pending = true;
		try {
			const res = await fetch('/api/auth/registracija', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, email, password, turnstileToken })
			});
			const payload = (await res.json().catch(() => null)) as unknown;
			const rec = asRecord(payload);
			const msg = typeof rec?.message === 'string' ? (rec.message as string) : undefined;
			if (!res.ok) {
				errorMsg = msg ?? 'Nepavyko sukurti paskyros.';
				return;
			}
			if (rec?.loggedIn !== true) {
				errorMsg = msg ?? 'Paskyra sukurta, bet neprisijungta.';
				return;
			}
			dispatch('success');
		} catch {
			errorMsg = 'Nepavyko sukurti paskyros.';
		} finally {
			pending = false;
		}
	}
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Sukurti paskyrą</Card.Title>
		<Card.Description>Susikurkite paskyrą, kad galėtumėte išsisaugoti receptus.</Card.Description>
	</Card.Header>
	<Card.Content>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				void submit();
			}}
			class="grid gap-4"
		>
			<div class="grid gap-2">
				<Label for="username">Vardas</Label>
				<Input
					id="username"
					name="username"
					autocomplete="username"
					bind:value={username}
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label for="email">El. paštas</Label>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					bind:value={email}
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label for="password">Slaptažodis</Label>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="new-password"
					bind:value={password}
					required
				/>
				<p class="text-xs text-muted-foreground">Bent 8 simboliai.</p>
			</div>
			<div class="grid gap-2">
				<Label for="passwordConfirmation">Pakartoti slaptažodį</Label>
				<Input
					id="passwordConfirmation"
					name="passwordConfirmation"
					type="password"
					autocomplete="new-password"
					bind:value={passwordConfirmation}
					required
				/>
			</div>

			<div class="grid gap-2">
				<Turnstile onToken={(t) => (turnstileToken = t)} onError={(m) => (turnstileError = m)} />
				{#if turnstileError}
					<p class="text-sm text-destructive">{turnstileError}</p>
				{/if}
			</div>

			{#if errorMsg}
				<p class="text-sm text-destructive">{errorMsg}</p>
			{/if}

			<Button type="submit" class="w-full" disabled={pending}>
				{pending ? 'Kuriama…' : 'Sukurti paskyrą'}
			</Button>
			<p class="text-center text-sm text-muted-foreground">
				Jau turite paskyrą?
				<button
					type="button"
					class="underline underline-offset-4"
					onclick={() => dispatch('switchToLogin')}
				>
					Prisijungti
				</button>
			</p>
		</form>
	</Card.Content>
</Card.Root>
