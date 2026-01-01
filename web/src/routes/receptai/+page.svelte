<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import Clock from '@lucide/svelte/icons/clock';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
	<title>Receptai</title>
	<meta name="description" content="Receptų sąrašas." />
</svelte:head>

<div class="bg-muted/30">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-2xl py-12 sm:py-16 lg:max-w-none lg:py-20">
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Receptai</h1>

			<div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-6">
				{#each data.recipes as recipe (recipe.id)}
					<div class="group relative">
						<a href={`/receptai/${recipe.slug}`} class="absolute inset-0" aria-label={recipe.title}></a>

						{#if recipe.coverImage?.url}
							{#if recipe.totalTimeMin && recipe.totalTimeMin <= 30}
								<Badge variant="destructive" class="absolute right-1 top-1 z-10">
									<Clock class="size-3" />
									{recipe.totalTimeMin} min
								</Badge>
							{/if}
							<img
								src={recipe.coverImage.url}
								alt={recipe.coverImage.alternativeText ?? recipe.title}
								class="w-full rounded-lg bg-card object-cover transition-opacity group-hover:opacity-75 max-sm:h-56 sm:aspect-[2/1] lg:aspect-square"
								loading="lazy"
							/>
						{:else}
							<div class="w-full rounded-lg bg-card border max-sm:h-56 sm:aspect-[2/1] lg:aspect-square"></div>
						{/if}

						<h2 class="mt-4 text-sm text-muted-foreground">
							{recipe.meal_type?.name ?? (recipe.difficulty ? `Sudėtingumas: ${recipe.difficulty}` : 'Receptas')}
						</h2>
						<p class="text-base font-semibold text-foreground">{recipe.title}</p>
						{#if recipe.summary}
							<p class="mt-1 text-sm text-muted-foreground line-clamp-2">{recipe.summary}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
