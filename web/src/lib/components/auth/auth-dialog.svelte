<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import LoginForm from '$lib/components/login-form.svelte';
	import SignupForm from '$lib/components/signup-form.svelte';
	import { invalidateAll } from '$app/navigation';

	import type { AuthDialogView } from '$lib/context/auth';

	let { open = $bindable(false), view = $bindable<AuthDialogView>('login') } = $props<{
		open?: boolean;
		view?: AuthDialogView;
	}>();

	let email = $state('');
	let pending = $state(false);
	let message = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	async function forgotPassword() {
		message = null;
		errorMsg = null;
		pending = true;
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			const payload = (await res.json().catch(() => null)) as unknown;
			const msg =
				payload && typeof payload === 'object'
					? (payload as Record<string, unknown>).message
					: undefined;
			if (!res.ok) {
				errorMsg = typeof msg === 'string' ? msg : 'Nepavyko išsiųsti laiško.';
				return;
			}
			message = 'Jei el. paštas egzistuoja, išsiuntėme atstatymo laišką.';
		} catch {
			errorMsg = 'Nepavyko išsiųsti laiško.';
		} finally {
			pending = false;
		}
	}

	async function onAuthSuccess() {
		await invalidateAll();
		open = false;
	}

	$effect(() => {
		if (!open) {
			// reset local state when closed
			email = '';
			pending = false;
			message = null;
			errorMsg = null;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="p-0 sm:max-w-md">
		{#if view === 'login'}
			<LoginForm
				on:success={() => void onAuthSuccess()}
				on:switchToSignup={() => (view = 'signup')}
				on:forgot={() => (view = 'forgot')}
			/>
		{:else if view === 'signup'}
			<SignupForm on:success={() => void onAuthSuccess()} on:switchToLogin={() => (view = 'login')} />
		{:else}
			<div class="p-6">
				<h2 class="text-2xl font-semibold tracking-tight">Slaptažodžio atstatymas</h2>
				<p class="mt-2 text-sm text-muted-foreground">Įveskite el. paštą ir atsiųsime atstatymo nuorodą.</p>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						void forgotPassword();
					}}
					class="mt-6 grid gap-4"
				>
					<div class="grid gap-2">
						<Label for="fp_email">El. paštas</Label>
						<Input id="fp_email" type="email" autocomplete="email" bind:value={email} required />
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
					<button type="button" class="text-sm underline underline-offset-4" onclick={() => (view = 'login')}>
						Grįžti į prisijungimą
					</button>
				</form>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
