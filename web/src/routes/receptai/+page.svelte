<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import Clock from '@lucide/svelte/icons/clock';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { canonicalFromUrl, ensureAbsoluteUrl, jsonLdStringify } from '$lib/seo';
	import type { PageData } from './$types';

	let props = $props<{ data: PageData }>();
	const data = $derived(props.data);

	type Named = { id: number; name?: string | null; slug?: string | null };
	type DifficultyFilter = { key: string; label: string };

	function cleanValue(value: string | null | undefined): string {
		return typeof value === 'string' ? value.trim() : '';
	}

	function setQueryParams(
		next: Record<string, string | null | undefined>,
		opts?: { resetOffset?: boolean }
	) {
		const url = new URL(page.url);
		for (const [k, v] of Object.entries(next)) {
			const val = cleanValue(v ?? '');
			if (!val) url.searchParams.delete(k);
			else url.searchParams.set(k, val);
		}
		if (opts?.resetOffset !== false) url.searchParams.set('offset', '0');
		const qs = url.searchParams.toString();
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(qs ? `${resolve('/receptai')}?${qs}` : resolve('/receptai'), {
			keepFocus: true,
			noScroll: true
		});
	}

	function clearAllFilters() {
		setQueryParams(
			{
				search: null,
				tag: null,
				category: null,
				ingredient_category: null,
				cuisine: null,
				meal_type: null,
				cooking_method: null,
				difficulty: null
			},
			{ resetOffset: true }
		);
	}

	const selectedDifficultyLabel = $derived(
		(() => {
			const key = cleanValue(data.query?.difficulty);
			const d = (data.filters?.difficulties ?? []).find((x: DifficultyFilter) => x.key === key);
			return d?.label ?? '';
		})()
	);
	const selectedCuisineLabel = $derived(
		(() => {
			const slug = cleanValue(data.query?.cuisine);
			const x = (data.filters?.cuisines ?? []).find((c: Named) => c.slug === slug);
			return x?.name ?? x?.slug ?? '';
		})()
	);
	const selectedMealTypeLabel = $derived(
		(() => {
			const slug = cleanValue(data.query?.meal_type);
			const x = (data.filters?.meal_types ?? []).find((c: Named) => c.slug === slug);
			return x?.name ?? x?.slug ?? '';
		})()
	);
	const selectedCookingMethodLabel = $derived(
		(() => {
			const slug = cleanValue(data.query?.cooking_method);
			const x = (data.filters?.cooking_methods ?? []).find((c: Named) => c.slug === slug);
			return x?.name ?? x?.slug ?? '';
		})()
	);

	// eslint-disable-next-line svelte/prefer-writable-derived
	let searchText = $state('');
	$effect(() => {
		searchText = cleanValue(data.query?.search);
	});

	let difficultyOpen = $state(false);
	let cuisineOpen = $state(false);
	let mealTypeOpen = $state(false);
	let cookingMethodOpen = $state(false);
	let categoryOpen = $state(false);
	let ingredientCategoryOpen = $state(false);
	let tagOpen = $state(false);

	let categorySearch = $state('');
	let tagSearch = $state('');
	let categoryItems = $state<Named[]>([]);
	let tagItems = $state<Named[]>([]);
	let categoryLoading = $state(false);
	let tagLoading = $state(false);
	let categoryError = $state<string | null>(null);
	let tagError = $state<string | null>(null);
	let ingredientCategorySearch = $state('');
	let ingredientCategoryItems = $state<Named[]>([]);
	let ingredientCategoryLoading = $state(false);
	let ingredientCategoryError = $state<string | null>(null);
	let _catReq = 0;
	let _tagReq = 0;
	let _ingCatReq = 0;

	function queryString(params: Record<string, string | null | undefined>): string {
		const parts: string[] = [];
		for (const [k, v] of Object.entries(params)) {
			const val = cleanValue(v ?? '');
			if (!val) continue;
			parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
		}
		return parts.join('&');
	}

	async function fetchNamedList(path: string, search: string): Promise<Named[]> {
		const qs = queryString({ search: cleanValue(search), limit: '50', offset: '0' });
		const res = await fetch(qs ? `${path}?${qs}` : path);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as unknown;
		if (!data || typeof data !== 'object') return [];
		const items = (data as { items?: unknown }).items;
		return Array.isArray(items) ? (items as Named[]) : [];
	}

	$effect(() => {
		if (!categoryOpen) return;
		categoryError = null;
		categoryLoading = true;
		const reqId = ++_catReq;
		const t = setTimeout(async () => {
			try {
				const items = await fetchNamedList('/api/recipes/categories', categorySearch);
				if (reqId === _catReq) categoryItems = items;
			} catch (e) {
				if (reqId === _catReq) {
					categoryError = e instanceof Error ? e.message : 'Nepavyko užkrauti kategorijų.';
					categoryItems = [];
				}
			} finally {
				if (reqId === _catReq) categoryLoading = false;
			}
		}, 250);
		return () => clearTimeout(t);
	});

	$effect(() => {
		if (!tagOpen) return;
		tagError = null;
		tagLoading = true;
		const reqId = ++_tagReq;
		const t = setTimeout(async () => {
			try {
				const items = await fetchNamedList('/api/recipes/tags', tagSearch);
				if (reqId === _tagReq) tagItems = items;
			} catch (e) {
				if (reqId === _tagReq) {
					tagError = e instanceof Error ? e.message : 'Nepavyko užkrauti tagų.';
					tagItems = [];
				}
			} finally {
				if (reqId === _tagReq) tagLoading = false;
			}
		}, 250);
		return () => clearTimeout(t);
	});

	$effect(() => {
		if (!ingredientCategoryOpen) return;
		ingredientCategoryError = null;
		ingredientCategoryLoading = true;
		const reqId = ++_ingCatReq;
		const t = setTimeout(async () => {
			try {
				const items = await fetchNamedList(
					'/api/recipes/ingredient-categories',
					ingredientCategorySearch
				);
				if (reqId === _ingCatReq) ingredientCategoryItems = items;
			} catch (e) {
				if (reqId === _ingCatReq) {
					ingredientCategoryError =
						e instanceof Error ? e.message : 'Nepavyko užkrauti ingredientų kategorijų.';
					ingredientCategoryItems = [];
				}
			} finally {
				if (reqId === _ingCatReq) ingredientCategoryLoading = false;
			}
		}, 250);
		return () => clearTimeout(t);
	});

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
	const jsonLdHtml = $derived(
		(() => {
			const open = '<script type="application/ld+json">';
			const close = '</scr' + 'ipt>';
			return open + jsonLdStringify(jsonLd) + close;
		})()
	);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type _Keep = typeof jsonLdHtml;
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

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdHtml}
</svelte:head>

<div class="bg-muted/30">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-2xl py-12 sm:py-16 lg:max-w-none lg:py-20">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="text-2xl font-bold tracking-tight text-foreground">Receptai</h1>
				{#if cleanValue(data.query?.search) || cleanValue(data.query?.tag) || cleanValue(data.query?.category) || cleanValue(data.query?.ingredient_category) || cleanValue(data.query?.cuisine) || cleanValue(data.query?.meal_type) || cleanValue(data.query?.cooking_method) || cleanValue(data.query?.difficulty)}
					<Button variant="outline" size="sm" onclick={clearAllFilters}>Išvalyti filtrus</Button>
				{/if}
			</div>

			<form
				class="mt-4 grid gap-3 rounded-lg border bg-card p-4"
				onsubmit={(e) => {
					e.preventDefault();
					setQueryParams({ search: searchText }, { resetOffset: true });
				}}
			>
				<div class="grid gap-2 md:grid-cols-3">
					<div class="md:col-span-2">
						<Input
							placeholder="Paieška (pavadinimas, aprašymas)"
							bind:value={searchText}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									setQueryParams({ search: searchText }, { resetOffset: true });
								}
							}}
						/>
					</div>
					<div class="flex gap-2">
						<Button type="submit" class="w-full">Taikyti</Button>
					</div>
				</div>

				<div class="flex flex-wrap gap-2">
					<Button type="button" variant="outline" size="sm" onclick={() => (difficultyOpen = true)}>
						Sudėtingumas{selectedDifficultyLabel ? `: ${selectedDifficultyLabel}` : ''}
					</Button>
					<Button type="button" variant="outline" size="sm" onclick={() => (cuisineOpen = true)}>
						Virtuvė{selectedCuisineLabel ? `: ${selectedCuisineLabel}` : ''}
					</Button>
					<Button type="button" variant="outline" size="sm" onclick={() => (mealTypeOpen = true)}>
						Valgio tipas{selectedMealTypeLabel ? `: ${selectedMealTypeLabel}` : ''}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => (cookingMethodOpen = true)}
					>
						Metodas{selectedCookingMethodLabel ? `: ${selectedCookingMethodLabel}` : ''}
					</Button>
					<Button type="button" variant="outline" size="sm" onclick={() => (categoryOpen = true)}>
						Kategorija{cleanValue(data.query?.category)
							? `: ${cleanValue(data.query?.category)}`
							: ''}
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => (ingredientCategoryOpen = true)}
					>
						Ingredientai{cleanValue(data.query?.ingredient_category)
							? `: ${cleanValue(data.query?.ingredient_category)}`
							: ''}
					</Button>
					<Button type="button" variant="outline" size="sm" onclick={() => (tagOpen = true)}>
						Tagas{cleanValue(data.query?.tag) ? `: ${cleanValue(data.query?.tag)}` : ''}
					</Button>
				</div>

				<div class="flex flex-wrap gap-2">
					{#if cleanValue(data.query?.difficulty)}
						<Badge variant="secondary" class="gap-2">
							Sudėtingumas: {selectedDifficultyLabel || cleanValue(data.query?.difficulty)}
							<button
								type="button"
								class="rounded px-1 hover:bg-accent"
								aria-label="Pašalinti sudėtingumą"
								onclick={(e) => (
									e.preventDefault(),
									e.stopPropagation(),
									setQueryParams({ difficulty: null }, { resetOffset: true })
								)}
							>
								×
							</button>
						</Badge>
					{/if}
					{#if cleanValue(data.query?.cuisine)}
						<Badge variant="secondary" class="gap-2">
							Virtuvė: {selectedCuisineLabel || cleanValue(data.query?.cuisine)}
							<button
								type="button"
								class="rounded px-1 hover:bg-accent"
								aria-label="Pašalinti virtuvę"
								onclick={(e) => (
									e.preventDefault(),
									e.stopPropagation(),
									setQueryParams({ cuisine: null }, { resetOffset: true })
								)}
							>
								×
							</button>
						</Badge>
					{/if}
					{#if cleanValue(data.query?.meal_type)}
						<Badge variant="secondary" class="gap-2">
							Valgio tipas: {selectedMealTypeLabel || cleanValue(data.query?.meal_type)}
							<button
								type="button"
								class="rounded px-1 hover:bg-accent"
								aria-label="Pašalinti valgio tipą"
								onclick={(e) => (
									e.preventDefault(),
									e.stopPropagation(),
									setQueryParams({ meal_type: null }, { resetOffset: true })
								)}
							>
								×
							</button>
						</Badge>
					{/if}
					{#if cleanValue(data.query?.cooking_method)}
						<Badge variant="secondary" class="gap-2">
							Metodas: {selectedCookingMethodLabel || cleanValue(data.query?.cooking_method)}
							<button
								type="button"
								class="rounded px-1 hover:bg-accent"
								aria-label="Pašalinti metodą"
								onclick={(e) => (
									e.preventDefault(),
									e.stopPropagation(),
									setQueryParams({ cooking_method: null }, { resetOffset: true })
								)}
							>
								×
							</button>
						</Badge>
					{/if}
					{#if cleanValue(data.query?.category)}
						<Badge variant="secondary" class="gap-2">
							Kategorija: {cleanValue(data.query?.category)}
							<button
								type="button"
								class="rounded px-1 hover:bg-accent"
								aria-label="Pašalinti kategoriją"
								onclick={(e) => (
									e.preventDefault(),
									e.stopPropagation(),
									setQueryParams({ category: null }, { resetOffset: true })
								)}
							>
								×
							</button>
						</Badge>
					{/if}
					{#if cleanValue(data.query?.ingredient_category)}
						<Badge variant="secondary" class="gap-2">
							Ingredientai: {cleanValue(data.query?.ingredient_category)}
							<button
								type="button"
								class="rounded px-1 hover:bg-accent"
								aria-label="Pašalinti ingredientų kategoriją"
								onclick={(e) => (
									e.preventDefault(),
									e.stopPropagation(),
									setQueryParams({ ingredient_category: null }, { resetOffset: true })
								)}
							>
								×
							</button>
						</Badge>
					{/if}
					{#if cleanValue(data.query?.tag)}
						<Badge variant="secondary" class="gap-2">
							Tagas: {cleanValue(data.query?.tag)}
							<button
								type="button"
								class="rounded px-1 hover:bg-accent"
								aria-label="Pašalinti tagą"
								onclick={(e) => (
									e.preventDefault(),
									e.stopPropagation(),
									setQueryParams({ tag: null }, { resetOffset: true })
								)}
							>
								×
							</button>
						</Badge>
					{/if}
				</div>
			</form>

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

			<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
				<div class="text-sm text-muted-foreground">
					Rodoma {Math.min(data.offset + 1, data.total)}–
					{Math.min(data.offset + data.limit, data.total)} iš {data.total}
				</div>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={data.offset <= 0}
						onclick={() => {
							const nextOffset = Math.max(0, (data.offset ?? 0) - (data.limit ?? 20));
							setQueryParams(
								{ offset: String(nextOffset), limit: String(data.limit ?? 20) },
								{ resetOffset: false }
							);
						}}
					>
						Atgal
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={(data.offset ?? 0) + (data.limit ?? 20) >= (data.total ?? 0)}
						onclick={() => {
							const nextOffset = (data.offset ?? 0) + (data.limit ?? 20);
							setQueryParams(
								{ offset: String(nextOffset), limit: String(data.limit ?? 20) },
								{ resetOffset: false }
							);
						}}
					>
						Kitas
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>

<Dialog.Root bind:open={difficultyOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Sudėtingumas</Dialog.Title>
			<Dialog.Description>Pasirink vieną reikšmę arba išvalyk.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-2">
			<Button
				variant="outline"
				onclick={() => (
					setQueryParams({ difficulty: null }, { resetOffset: true }),
					(difficultyOpen = false)
				)}
			>
				Išvalyti
			</Button>
			{#each data.filters?.difficulties ?? [] as d (d.key)}
				<Button
					variant={cleanValue(data.query?.difficulty) === d.key ? 'default' : 'outline'}
					onclick={() => (
						setQueryParams({ difficulty: d.key }, { resetOffset: true }),
						(difficultyOpen = false)
					)}
				>
					{d.label}
				</Button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={cuisineOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Virtuvė</Dialog.Title>
			<Dialog.Description>Pasirink virtuvę arba išvalyk.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-2">
			<Button
				variant="outline"
				onclick={() => (
					setQueryParams({ cuisine: null }, { resetOffset: true }),
					(cuisineOpen = false)
				)}
			>
				Išvalyti
			</Button>
			{#each data.filters?.cuisines ?? [] as c (c.id)}
				{#if c.slug || c.name}
					<Button
						variant={cleanValue(data.query?.cuisine) === cleanValue(c.slug) ? 'default' : 'outline'}
						onclick={() => (
							setQueryParams({ cuisine: c.slug ?? c.name ?? '' }, { resetOffset: true }),
							(cuisineOpen = false)
						)}
					>
						{c.name ?? c.slug}
					</Button>
				{/if}
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={mealTypeOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Valgio tipas</Dialog.Title>
			<Dialog.Description>Pasirink valgio tipą arba išvalyk.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-2">
			<Button
				variant="outline"
				onclick={() => (
					setQueryParams({ meal_type: null }, { resetOffset: true }),
					(mealTypeOpen = false)
				)}
			>
				Išvalyti
			</Button>
			{#each data.filters?.meal_types ?? [] as c (c.id)}
				{#if c.slug || c.name}
					<Button
						variant={cleanValue(data.query?.meal_type) === cleanValue(c.slug)
							? 'default'
							: 'outline'}
						onclick={() => (
							setQueryParams({ meal_type: c.slug ?? c.name ?? '' }, { resetOffset: true }),
							(mealTypeOpen = false)
						)}
					>
						{c.name ?? c.slug}
					</Button>
				{/if}
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={cookingMethodOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Gaminimo metodas</Dialog.Title>
			<Dialog.Description>Pasirink metodą arba išvalyk.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-2">
			<Button
				variant="outline"
				onclick={() => (
					setQueryParams({ cooking_method: null }, { resetOffset: true }),
					(cookingMethodOpen = false)
				)}
			>
				Išvalyti
			</Button>
			{#each data.filters?.cooking_methods ?? [] as c (c.id)}
				{#if c.slug || c.name}
					<Button
						variant={cleanValue(data.query?.cooking_method) === cleanValue(c.slug)
							? 'default'
							: 'outline'}
						onclick={() => (
							setQueryParams({ cooking_method: c.slug ?? c.name ?? '' }, { resetOffset: true }),
							(cookingMethodOpen = false)
						)}
					>
						{c.name ?? c.slug}
					</Button>
				{/if}
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={categoryOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Kategorija</Dialog.Title>
			<Dialog.Description>Ieškok ir pasirink kategoriją.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-3">
			<Input placeholder="Paieška..." bind:value={categorySearch} />
			<div class="flex justify-between gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (
						setQueryParams({ category: null }, { resetOffset: true }),
						(categoryOpen = false)
					)}
				>
					Išvalyti
				</Button>
				<Button variant="secondary" size="sm" onclick={() => (categorySearch = '')}
					>Išvalyti paiešką</Button
				>
			</div>
			{#if categoryError}
				<p class="text-sm text-destructive">{categoryError}</p>
			{/if}
			{#if categoryLoading}
				<p class="text-sm text-muted-foreground">Kraunama...</p>
			{:else}
				<div class="grid max-h-80 gap-2 overflow-auto">
					{#each categoryItems as c (c.id)}
						{#if c.slug || c.name}
							<Button
								variant={cleanValue(data.query?.category) === cleanValue(c.slug)
									? 'default'
									: 'outline'}
								onclick={() => (
									setQueryParams({ category: c.slug ?? c.name ?? '' }, { resetOffset: true }),
									(categoryOpen = false)
								)}
							>
								{c.name ?? c.slug}
							</Button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={ingredientCategoryOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Ingredientų kategorija</Dialog.Title>
			<Dialog.Description>Ieškok ir pasirink ingredientų kategoriją.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-3">
			<Input placeholder="Paieška..." bind:value={ingredientCategorySearch} />
			<div class="flex justify-between gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (
						setQueryParams({ ingredient_category: null }, { resetOffset: true }),
						(ingredientCategoryOpen = false)
					)}
				>
					Išvalyti
				</Button>
				<Button variant="secondary" size="sm" onclick={() => (ingredientCategorySearch = '')}>
					Išvalyti paiešką
				</Button>
			</div>
			{#if ingredientCategoryError}
				<p class="text-sm text-destructive">{ingredientCategoryError}</p>
			{/if}
			{#if ingredientCategoryLoading}
				<p class="text-sm text-muted-foreground">Kraunama...</p>
			{:else}
				<div class="grid max-h-80 gap-2 overflow-auto">
					{#each ingredientCategoryItems as c (c.id)}
						{#if c.slug || c.name}
							<Button
								variant={cleanValue(data.query?.ingredient_category) === cleanValue(c.slug)
									? 'default'
									: 'outline'}
								onclick={() => (
									setQueryParams(
										{ ingredient_category: c.slug ?? c.name ?? '' },
										{ resetOffset: true }
									),
									(ingredientCategoryOpen = false)
								)}
							>
								{c.name ?? c.slug}
							</Button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={tagOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Tagas</Dialog.Title>
			<Dialog.Description>Ieškok ir pasirink tagą.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-3">
			<Input placeholder="Paieška..." bind:value={tagSearch} />
			<div class="flex justify-between gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (setQueryParams({ tag: null }, { resetOffset: true }), (tagOpen = false))}
				>
					Išvalyti
				</Button>
				<Button variant="secondary" size="sm" onclick={() => (tagSearch = '')}
					>Išvalyti paiešką</Button
				>
			</div>
			{#if tagError}
				<p class="text-sm text-destructive">{tagError}</p>
			{/if}
			{#if tagLoading}
				<p class="text-sm text-muted-foreground">Kraunama...</p>
			{:else}
				<div class="grid max-h-80 gap-2 overflow-auto">
					{#each tagItems as t (t.id)}
						{#if t.slug || t.name}
							<Button
								variant={cleanValue(data.query?.tag) === cleanValue(t.slug) ? 'default' : 'outline'}
								onclick={() => (
									setQueryParams({ tag: t.slug ?? t.name ?? '' }, { resetOffset: true }),
									(tagOpen = false)
								)}
							>
								{t.name ?? t.slug}
							</Button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
