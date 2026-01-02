<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { resolve } from '$app/paths';

	import type { LayoutData } from './$types';

	let { data, children } = $props<{ data: LayoutData; children: Snippet }>();

	function usernameOf(user: unknown): string | null {
		if (!user || typeof user !== 'object') return null;
		const v = (user as Record<string, unknown>).username;
		return typeof v === 'string' && v.trim() ? v.trim() : null;
	}
</script>

<div class="mx-auto grid max-w-5xl gap-6 md:grid-cols-[240px_1fr]">
	<aside>
		<Card.Root>
			<Card.Header>
				<Card.Title>Paskyra</Card.Title>
				{#if data.user}
					<Card.Description>
						Prisijungta{#if usernameOf(data.user)} kaip {usernameOf(data.user)}{/if}.
					</Card.Description>
				{/if}
			</Card.Header>
			<Card.Content class="grid gap-1">
				<a class="rounded-md px-3 py-2 text-sm hover:bg-accent" href={resolve('/paskyra/profilis')}>Profilis</a>
				<a class="rounded-md px-3 py-2 text-sm hover:bg-accent" href={resolve('/paskyra/mano-apetitas')}>Mano Apetitas</a>
				<a class="rounded-md px-3 py-2 text-sm hover:bg-accent" href={resolve('/paskyra/mano-komentarai')}>Mano komentarai</a>
			</Card.Content>
		</Card.Root>
	</aside>

	<section>
		{@render children()}
	</section>
</div>
