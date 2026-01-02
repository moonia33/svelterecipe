<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	const dispatch = createEventDispatcher<{
		success: void;
		switchToSignup: void;
		forgot: void;
	}>();

	let identifier = $state('');
	let password = $state('');
	let pending = $state(false);
	let errorMsg = $state<string | null>(null);

	function asRecord(value: unknown): Record<string, unknown> | null {
		return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
	}

	async function submit() {
		errorMsg = null;
		pending = true;
		try {
			const res = await fetch('/api/auth/prisijungimas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier, password })
			});
			const payload = (await res.json().catch(() => null)) as unknown;
			const rec = asRecord(payload);
			const msg = typeof rec?.message === 'string' ? (rec.message as string) : undefined;
			if (!res.ok) {
				errorMsg = msg ?? 'Nepavyko prisijungti.';
				return;
			}
			if (rec?.loggedIn !== true) {
				errorMsg = msg ?? 'Nepavyko prisijungti.';
				return;
			}
			dispatch('success');
		} catch {
			errorMsg = 'Nepavyko prisijungti.';
		} finally {
			pending = false;
		}
	}
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Prisijungti</Card.Title>
		<Card.Description>Prisijunkite, kad galėtumėte išsisaugoti receptus.</Card.Description>
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
				<Label for="identifier">El. paštas arba vartotojo vardas</Label>
				<Input
					id="identifier"
					name="identifier"
					autocomplete="username"
					bind:value={identifier}
					required
				/>
			</div>
			<div class="grid gap-2">
				<div class="flex items-center justify-between gap-2">
					<Label for="password">Slaptažodis</Label>
					<button
						type="button"
						class="text-sm underline underline-offset-4"
						onclick={() => dispatch('forgot')}
					>
						Pamiršau slaptažodį
					</button>
				</div>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					bind:value={password}
					required
				/>
			</div>

			{#if errorMsg}
				<p class="text-sm text-destructive">{errorMsg}</p>
			{/if}

			<Button type="submit" class="w-full" disabled={pending}>
				{pending ? 'Jungiama…' : 'Prisijungti'}
			</Button>
			<p class="text-center text-sm text-muted-foreground">
				Neturite paskyros?
				<button
					type="button"
					class="underline underline-offset-4"
					onclick={() => dispatch('switchToSignup')}
				>
					Sukurti paskyrą
				</button>
			</p>
		</form>
	</Card.Content>
</Card.Root>
