<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import Clock from '@lucide/svelte/icons/clock';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Paieška – Receptai</title>
	<meta name="description" content="Receptų paieška." />
</svelte:head>

<div class="bg-muted/30">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-2xl py-10 sm:py-14 lg:max-w-none lg:py-16">
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Paieška</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Paieška vykdoma per Upstash Search indeksą <span class="font-medium text-foreground"
					>{data.indexName}</span
				>.
			</p>

			<form class="mt-6 flex gap-2" method="GET" action="/paieska">
				<input
					name="q"
					value={data.query}
					placeholder="Ieškoti receptų..."
					class="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
					autocomplete="off"
				/>
				<button
					type="submit"
					class="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Ieškoti
				</button>
			</form>

			{#if data.error}
				<div class="mt-4 rounded-md border bg-card p-4 text-sm text-destructive">{data.error}</div>
			{/if}

			{#if data.query}
				<p class="mt-6 text-sm text-muted-foreground">Rasta: {data.results.length}</p>
			{/if}

			{#if data.results.length}
				<div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-6">
					{#each data.results as recipe (recipe.id)}
						<div class="group relative">
							{#if recipe.slug}
								<a
									href={resolve(
										...([`/receptai/${recipe.slug}`] as unknown as Parameters<typeof resolve>)
									)}
									class="absolute inset-0"
									aria-label={recipe.title ?? recipe.slug}
								></a>
							{/if}

							{#if recipe.coverImage?.url}
								{#if recipe.totalTimeMin && recipe.totalTimeMin <= 30}
									<Badge variant="destructive" class="absolute top-1 right-1 z-10">
										<Clock class="size-3" />
										{recipe.totalTimeMin} min
									</Badge>
								{/if}
								<img
									src={recipe.coverImage.url}
									alt={recipe.coverImage.alternativeText ??
										recipe.title ??
										recipe.slug ??
										'Receptas'}
									class="w-full rounded-lg bg-card object-cover transition-opacity group-hover:opacity-75 max-sm:h-56 sm:aspect-[2/1] lg:aspect-square"
									loading="lazy"
								/>
							{:else}
								<div
									class="w-full rounded-lg border bg-card max-sm:h-56 sm:aspect-[2/1] lg:aspect-square"
								></div>
							{/if}

							<h2 class="mt-4 text-sm text-muted-foreground">
								{recipe.meal_type?.name ??
									(recipe.difficulty ? `Sudėtingumas: ${recipe.difficulty}` : 'Receptas')}
							</h2>
							<p class="text-base font-semibold text-foreground">
								{recipe.title ?? recipe.slug ?? recipe.id}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Paieškos atitikimas: {recipe.score.toFixed(2)}
							</p>
							{#if recipe.summary}
								<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.summary}</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else if data.query && !data.error}
				<p class="mt-6 text-sm text-muted-foreground">Nieko nerasta pagal „{data.query}“.</p>
			{/if}
		</div>
	</div>
</div>
