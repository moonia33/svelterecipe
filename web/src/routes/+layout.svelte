<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children: Snippet }>();

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

	let headerQ = $state('');
	let isFocused = $state(false);
	let isLoading = $state(false);
	let typeaheadError = $state<string | null>(null);
	let suggestions = $state<TypeaheadItem[]>([]);

	let debounceHandle: ReturnType<typeof setTimeout> | null = null;
	let blurHandle: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;

	const qTrim = $derived(headerQ.trim());

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
	<link rel="icon" href={favicon} />
	<title>Receptai</title>
	<meta name="description" content="Receptai ir pirkinių sąrašas Lietuvos rinkai." />
</svelte:head>

<a
	class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
	href="#turinys">Į turinį</a
>

<div class="min-h-dvh bg-white text-zinc-950">
	<header class="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
		<div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
			<a class="shrink-0 font-semibold tracking-tight" href={resolve('/')}>Receptai</a>

			<form class="relative hidden w-full max-w-md sm:block" method="GET" action="/paieska">
				<Input
					name="q"
					placeholder="Ieškoti receptų..."
					autocomplete="off"
					bind:value={headerQ}
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
						class="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-sm"
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
													<div class="truncate font-medium">{item.title ?? item.slug}</div>
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
			</form>

			<nav class="ml-auto flex items-center gap-3 text-sm">
				<a class="rounded px-2 py-1 hover:bg-zinc-100" href={resolve('/receptai')}>Receptai</a>
				<a class="rounded px-2 py-1 hover:bg-zinc-100" href={resolve('/parduotuve')}
					>Esu parduotuvėje</a
				>
				<a class="rounded px-2 py-1 hover:bg-zinc-100" href={resolve('/paieska')}>Paieška</a>
				<Button variant="ghost" size="sm" href="/paskyra">Paskyra</Button>
			</nav>
		</div>
	</header>

	<main id="turinys" class="mx-auto max-w-7xl px-4 py-6">
		{@render children()}
	</main>
</div>
