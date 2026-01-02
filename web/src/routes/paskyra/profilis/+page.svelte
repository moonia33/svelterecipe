<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	function field(user: unknown, key: string): string | null {
		if (!user || typeof user !== 'object') return null;
		const v = (user as Record<string, unknown>)[key];
		if (typeof v === 'string' && v.trim()) return v.trim();
		if (typeof v === 'number') return String(v);
		return null;
	}

</script>

<Card.Root class="max-w-2xl">
	<Card.Header>
		<Card.Title>Profilis</Card.Title>
		<Card.Description>Jūsų paskyros informacija.</Card.Description>
	</Card.Header>
	<Card.Content class="grid gap-2 text-sm">
		<p><span class="text-muted-foreground">Vartotojo vardas:</span> {field(data.user, 'username') ?? '—'}</p>
		<p><span class="text-muted-foreground">El. paštas:</span> {field(data.user, 'email') ?? '—'}</p>
		<p><span class="text-muted-foreground">ID:</span> {field(data.user, 'id') ?? '—'}</p>
	</Card.Content>
</Card.Root>
