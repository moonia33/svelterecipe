<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import Turnstile from '$lib/components/auth/turnstile.svelte';

	const uid = $derived(
		page.url.searchParams.get('uid') ??
			page.url.searchParams.get('uidb64') ??
			page.url.searchParams.get('u') ??
			''
	);
	const token = $derived(
		page.url.searchParams.get('token') ?? page.url.searchParams.get('t') ?? ''
	);

	let password = $state('');
	let passwordConfirmation = $state('');
	let turnstileToken = $state('');
	let turnstileError = $state<string | null>(null);

	let pending = $state(false);
	let errorMsg = $state<string | null>(null);
	let successMsg = $state<string | null>(null);

	function asRecord(value: unknown): Record<string, unknown> | null {
		return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
	}

	async function goToLogin() {
		await goto(resolve(...(['/auth/prisijungimas'] as unknown as Parameters<typeof resolve>)));
	}

	async function goToForgot() {
		await goto(
			resolve(...(['/auth/pamirsau-slaptazodi'] as unknown as Parameters<typeof resolve>))
		);
	}

	async function submit() {
		errorMsg = null;
		successMsg = null;
		turnstileError = null;

		if (!uid || !token) {
			errorMsg = 'Nuoroda neteisinga arba pasibaigusio galiojimo.';
			return;
		}
		if (password.length < 8) {
			errorMsg = 'Slaptažodis per trumpas (bent 8 simboliai).';
			return;
		}
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
			const res = await fetch('/api/auth/password-reset-confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid, token, new_password: password, turnstileToken })
			});

			const payload = (await res.json().catch(() => null)) as unknown;
			const rec = asRecord(payload);
			const detail =
				typeof rec?.detail === 'string'
					? (rec.detail as string)
					: typeof rec?.message === 'string'
						? (rec.message as string)
						: null;

			if (!res.ok) {
				errorMsg = detail ?? 'Nepavyko atnaujinti slaptažodžio.';
				return;
			}

			successMsg = 'Slaptažodis atnaujintas. Dabar galite prisijungti.';
			password = '';
			passwordConfirmation = '';
			turnstileToken = '';
		} catch {
			errorMsg = 'Nepavyko atnaujinti slaptažodžio.';
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head>
	<title>Slaptažodžio atstatymas</title>
	<meta name="description" content="Nustatykite naują slaptažodį." />
</svelte:head>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-2xl">Slaptažodžio atstatymas</Card.Title>
				<Card.Description>Įveskite naują slaptažodį.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if !uid || !token}
					<p class="text-sm text-muted-foreground">
						Atidarykite slaptažodžio atstatymo nuorodą iš el. laiško. Jei laiško negavote, galite
						išsiųsti naują atstatymo nuorodą.
					</p>
					<div class="mt-4">
						<Button type="button" class="w-full" onclick={() => void goToForgot()}>
							Siųsti atstatymo nuorodą
						</Button>
						<Button
							type="button"
							variant="outline"
							class="mt-2 w-full"
							onclick={() => void goToLogin()}
						>
							Grįžti į prisijungimą
						</Button>
					</div>
				{:else}
					<form
						class="grid gap-4"
						onsubmit={(e) => {
							e.preventDefault();
							void submit();
						}}
					>
						<div class="grid gap-2">
							<Label for="new_password">Naujas slaptažodis</Label>
							<Input
								id="new_password"
								name="new_password"
								type="password"
								autocomplete="new-password"
								bind:value={password}
								required
							/>
							<p class="text-xs text-muted-foreground">Bent 8 simboliai.</p>
						</div>

						<div class="grid gap-2">
							<Label for="new_password_confirm">Pakartoti slaptažodį</Label>
							<Input
								id="new_password_confirm"
								name="new_password_confirm"
								type="password"
								autocomplete="new-password"
								bind:value={passwordConfirmation}
								required
							/>
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
						{#if successMsg}
							<p class="text-sm text-muted-foreground">{successMsg}</p>
						{/if}

						<Button type="submit" class="w-full" disabled={pending}>
							{pending ? 'Atnaujinama…' : 'Atnaujinti slaptažodį'}
						</Button>

						<Button type="button" variant="outline" class="w-full" onclick={() => void goToLogin()}>
							Prisijungti
						</Button>
					</form>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
