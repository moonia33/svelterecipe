<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import Clock from '@lucide/svelte/icons/clock';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { canonicalFromUrl, ensureAbsoluteUrl, jsonLdStringify } from '$lib/seo';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const title = 'Receptai – Apetitas.lt';
	const description = 'Receptų sąrašas.';
	const canonical = $derived(canonicalFromUrl(page.url));

	const jsonLd = $derived(
		(() => {
			const origin = page.url.origin;
			const base = `${origin}${resolve('/')}`;
			const listUrl = canonical;

			const itemListElement = (data.recipes ?? []).map(
				(r: PageData['recipes'][number], i: number) => {
					const url = `${origin}${resolve(
						...([`/receptai/${r.slug}`] as unknown as Parameters<typeof resolve>)
					)}`;
					const img = ensureAbsoluteUrl(r.coverImage?.url ?? null, origin);
					return {
						'@type': 'ListItem',
						position: i + 1,
						item: {
							'@type': 'Recipe',
							name: r.title,
							url,
							...(img ? { image: [img] } : {})
						}
					};
				}
			);

			return {
				'@context': 'https://schema.org',
				'@graph': [
					{
						'@type': 'BreadcrumbList',
						itemListElement: [
							{
								'@type': 'ListItem',
								position: 1,
								name: 'Pagrindinis',
								item: base
							},
							{
								'@type': 'ListItem',
								position: 2,
								name: 'Receptai',
								item: listUrl
							}
						]
					},
					{
						'@type': 'ItemList',
						name: 'Receptai',
						itemListElement
					}
				]
			};
		})()
	);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const jsonLdJson = $derived(jsonLdStringify(jsonLd));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Apetitas.lt" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />

	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />

	<!-- prettier-ignore -->
	<script type="application/ld+json">
{jsonLdJson}
	</script>
</svelte:head>

<div class="bg-muted/30">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-2xl py-12 sm:py-16 lg:max-w-none lg:py-20">
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Receptai</h1>

			<div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-6">
				{#each data.recipes as recipe (recipe.id)}
					<div class="group relative">
						<a
							href={resolve(
								...([`/receptai/${recipe.slug}`] as unknown as Parameters<typeof resolve>)
							)}
							class="absolute inset-0"
							aria-label={recipe.title}
						></a>

						{#if recipe.coverImage?.url}
							{#if recipe.totalTimeMin && recipe.totalTimeMin <= 30}
								<Badge variant="destructive" class="absolute top-1 right-1 z-10">
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
							<div
								class="w-full rounded-lg border bg-card max-sm:h-56 sm:aspect-[2/1] lg:aspect-square"
							></div>
						{/if}

						<h2 class="mt-4 text-sm text-muted-foreground">
							{recipe.meal_type?.name ??
								(recipe.difficulty ? `Sudėtingumas: ${recipe.difficulty}` : 'Receptas')}
						</h2>
						<p class="text-base font-semibold text-foreground">{recipe.title}</p>
						{#if recipe.summary}
							<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{recipe.summary}</p>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
