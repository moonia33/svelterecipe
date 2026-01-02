<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import Clock from '@lucide/svelte/icons/clock';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	type TypeaheadItem = {
		id: string;
		score: number;
		slug?: string;
		title?: string;
		summary?: string;
		coverImage?: { url?: string; alternativeText?: string | null } | null;
	};

	type TypeaheadResponse = {
		query: string;
		indexName: string;
		results: TypeaheadItem[];
		error?: string;
	};

	let q = $derived(data.query ?? '');
	let isFocused = $state(false);
	let isLoading = $state(false);
	let typeaheadError = $state<string | null>(null);
	let suggestions = $state<TypeaheadItem[]>([]);

	let debounceHandle: ReturnType<typeof setTimeout> | null = null;
	let blurHandle: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;

	const qTrim = $derived(q.trim());

	$effect(() => {
		if (debounceHandle) clearTimeout(debounceHandle);
		debounceHandle = null;
		controller?.abort();
		controller = null;
		typeaheadError = null;

		if (!qTrim || qTrim.length < 2) {
			suggestions = [];
			isLoading = false;
			return;
		}

		debounceHandle = setTimeout(async () => {
			try {
				isLoading = true;
				controller?.abort();
				controller = new AbortController();

				const res = await fetch(`/api/search?q=${encodeURIComponent(qTrim)}`, {
					method: 'GET',
					headers: { accept: 'application/json' },
					signal: controller.signal
				});
				const payload = (await res.json()) as TypeaheadResponse;
				if (!res.ok) {
					typeaheadError = payload.error ?? 'Nepavyko atlikti paieškos.';
					suggestions = [];
					return;
				}

				typeaheadError = payload.error ?? null;
				suggestions = Array.isArray(payload.results) ? payload.results : [];
			} catch (e) {
				if (e instanceof DOMException && e.name === 'AbortError') return;
				typeaheadError = e instanceof Error ? e.message : 'Nepavyko atlikti paieškos.';
				suggestions = [];
			} finally {
				isLoading = false;
			}
		}, 300);
	});
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
				<div class="relative w-full">
					<input
						name="q"
						bind:value={q}
						placeholder="Ieškoti receptų..."
						class="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
						autocomplete="off"
						onfocus={() => {
							if (blurHandle) clearTimeout(blurHandle);
							blurHandle = null;
							isFocused = true;
						}}
						onblur={() => {
							if (blurHandle) clearTimeout(blurHandle);
							blurHandle = setTimeout(() => {
								isFocused = false;
							}, 120);
						}}
					/>

					{#if isFocused && qTrim.length >= 2}
						<div
							class="absolute top-full right-0 left-0 z-20 mt-2 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-sm"
						>
							{#if isLoading}
								<div class="px-3 py-2 text-sm text-muted-foreground">Ieškoma…</div>
							{:else if typeaheadError}
								<div class="px-3 py-2 text-sm text-destructive">{typeaheadError}</div>
							{:else if suggestions.length}
								<ul class="max-h-80 overflow-auto py-1">
									{#each suggestions as item (item.id)}
										<li>
											{#if item.slug}
												<a
													href={resolve(
														...([`/receptai/${item.slug}`] as unknown as Parameters<typeof resolve>)
													)}
													class="flex items-start gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
												>
													{#if item.coverImage?.url}
														<img
															src={item.coverImage.url}
															alt={item.coverImage.alternativeText ?? item.title ?? item.slug}
															class="mt-0.5 size-10 shrink-0 rounded-md border bg-card object-cover"
															loading="lazy"
														/>
													{:else}
														<div class="mt-0.5 size-10 shrink-0 rounded-md border bg-card"></div>
													{/if}

													<div class="min-w-0">
														<div class="truncate font-medium">
															{item.title ?? item.slug}
														</div>
														<div class="mt-0.5 text-xs text-muted-foreground">
															Atitikimas paieškai: {item.score.toFixed(2)}
														</div>
														{#if item.summary}
															<div class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
																{item.summary}
															</div>
														{/if}
													</div>
												</a>
											{:else}
												<div class="px-3 py-2 text-sm text-muted-foreground">Receptas</div>
											{/if}
										</li>
									{/each}
								</ul>
							{:else}
								<div class="px-3 py-2 text-sm text-muted-foreground">Nieko nerasta.</div>
							{/if}
						</div>
					{/if}
				</div>
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
