<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { resolveRoute } from '$app/paths';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	function pickImageUrl(images: PageData['items'][number]['images'] | null | undefined): string | undefined {
		const v = images ?? null;
		const candidates: Array<string | null | undefined> = [
			v?.large?.webp,
			v?.large?.avif,
			v?.medium?.webp,
			v?.medium?.avif,
			v?.small?.webp,
			v?.small?.avif,
			v?.original
		];
		return candidates.find((x) => typeof x === 'string' && x.trim())?.trim();
	}
</script>

<header class="grid gap-1">
	<h1 class="text-2xl font-semibold tracking-tight">Mano Apetitas</h1>
	<p class="text-sm text-muted-foreground">Išsaugoti receptai ({data.total}).</p>
</header>

{#if data.error}
	<Card.Root class="mt-6 max-w-2xl">
		<Card.Header>
			<Card.Title>Nepavyko užkrauti</Card.Title>
			<Card.Description>{data.error}</Card.Description>
		</Card.Header>
	</Card.Root>
{/if}

{#if !data.error && data.items.length === 0}
	<Card.Root class="mt-6 max-w-2xl">
		<Card.Header>
			<Card.Title>Kol kas tuščia</Card.Title>
			<Card.Description>Išsisaugokite receptų ir jie atsiras čia.</Card.Description>
		</Card.Header>
	</Card.Root>
{:else}
	<div class="mt-6 grid gap-4 md:grid-cols-2">
		{#each data.items as item (item.id)}
			<a class="block" href={resolveRoute('/receptai/[slug]', { slug: item.slug })}>
				<Card.Root class="h-full">
					<div class="flex gap-4 px-6">
						{#if pickImageUrl(item.images)}
							<img
								class="h-16 w-16 rounded-md object-cover"
								src={pickImageUrl(item.images)}
								alt={item.title}
								loading="lazy"
							/>
						{:else}
							<div class="h-16 w-16 rounded-md bg-muted"></div>
						{/if}
						<div class="min-w-0 flex-1 py-6">
							<p class="truncate font-medium">{item.title}</p>
							<div class="mt-1 flex items-center gap-2">
								{#if typeof item.rating_average === 'number'}
									<Badge variant="secondary">★ {item.rating_average.toFixed(1)}</Badge>
								{/if}
								{#if typeof item.rating_count === 'number'}
									<span class="text-xs text-muted-foreground">({item.rating_count})</span>
								{/if}
							</div>
						</div>
					</div>
				</Card.Root>
			</a>
		{/each}
	</div>
{/if}
