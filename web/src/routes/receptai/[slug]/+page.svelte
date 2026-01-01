<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from "$lib/components/ui/badge/index.js";
	import AlarmClockCheck from "@lucide/svelte/icons/alarm-clock-check";
	import { badgeVariants } from "$lib/components/ui/badge/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import RecipeHero from '$lib/components/recipe/recipe-hero.svelte';
	import CollapsibleDescription from '$lib/components/recipe/collapsible-description.svelte';
	import { renderBlocks, renderMarkdown, sanitizeHtmlString } from '$lib/markdown';

	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let keepAwake = $state(false);
	let wakeLock: unknown = $state(null);

	const recipeBase = $derived(data.recipe);
	let recipeOverrides = $state<Partial<PageData['recipe']>>({});
	const recipe = $derived({ ...recipeBase, ...recipeOverrides });

	let ingredientMultiplier = $state(1);

	let actionError = $state<string | null>(null);
	let bookmarkPending = $state(false);
	let ratingPending = $state(false);
	let commentPending = $state(false);

	let ratingValue = $state<number>(0);
	let commentText = $state('');

	function asObject(value: unknown): Record<string, unknown> | null {
		if (!value || typeof value !== 'object') return null;
		return value as Record<string, unknown>;
	}

	function pickString(value: unknown, key: string): string | null {
		const obj = asObject(value);
		const v = obj?.[key];
		return typeof v === 'string' ? v : null;
	}

	function pickBoolean(value: unknown, key: string): boolean | null {
		const obj = asObject(value);
		const v = obj?.[key];
		return typeof v === 'boolean' ? v : null;
	}

	$effect(() => {
		// reset per navigaciją į kitą receptą
		if (!recipeBase.slug) return;
		recipeOverrides = {};
		actionError = null;
		ratingValue = recipeBase.userRating ?? 0;
		commentText = '';
	});

	function facetHref(kind: string, slug: string) {
		return `/paieska?${encodeURIComponent(kind)}=${encodeURIComponent(slug)}`;
	}

	function formatScaledQuantity(value: unknown, multiplier: number): string {
		if (value === null || value === undefined) return '';
		if (typeof value === 'number' && Number.isFinite(value)) {
			const scaled = value * multiplier;
			return String(Number(scaled.toFixed(2))).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
		}
		if (typeof value === 'string') {
			const raw = value.trim();
			if (!raw) return '';

			// support simple fractions like "1/2"
			if (/^\d+\s*\/\s*\d+$/.test(raw)) {
				const [a, b] = raw.split('/').map((x) => Number(x.trim()));
				if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) {
					const scaled = (a / b) * multiplier;
					return String(Number(scaled.toFixed(2))).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
				}
			}

			const n = Number(raw.replace(',', '.'));
			if (Number.isFinite(n)) {
				const scaled = n * multiplier;
				return String(Number(scaled.toFixed(2))).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
			}

			return raw;
		}
		return '';
	}

	function ingredientTitle(item: unknown): string {
		const rel = item as {
			name?: string | null;
			ingredient_name?: string | null;
			ingredient?: { name?: string | null } | null;
		};
		return rel.ingredient?.name ?? rel.ingredient_name ?? rel.name ?? 'Ingredientas';
	}

	function ingredientNote(item: unknown): string {
		const it = item as { note?: string | null; optional?: boolean | null };
		const note = it.note ?? '';
		const opt = it.optional ? 'Nebūtina' : '';
		return [note, opt].filter((x) => x && String(x).trim()).join(' • ');
	}

	function ingredientQtyText(item: unknown): string {
		const it = item as {
			quantity?: number | string | null;
			amount?: number | string | null;
			unit?: { name?: string | null; short_name?: string | null } | string | null;
		};
		const qty = formatScaledQuantity(it.quantity ?? it.amount ?? null, ingredientMultiplier);
		const unit =
			typeof it.unit === 'string' ? it.unit : (it.unit?.short_name ?? it.unit?.name ?? '');
		return [qty, unit].filter((x) => x && String(x).trim()).join(' ');
	}

	function mediaUrl(media: unknown): string {
		if (!media) return '';
		if (typeof media === 'string') return media;
		const m = media as { url?: string | null };
		return m.url ?? '';
	}

	function mediaAlt(media: unknown): string {
		if (!media) return '';
		if (typeof media === 'string') return '';
		const m = media as { alternativeText?: string | null; name?: string | null };
		return m.alternativeText ?? m.name ?? '';
	}

	function stepDescriptionHtml(step: unknown): string {
		const s = step as {
			description_html?: string | null;
			descriptionHtml?: string | null;
			description?: unknown;
		};
		if (s.description_html) return sanitizeHtmlString(s.description_html);
		if (s.descriptionHtml) return sanitizeHtmlString(s.descriptionHtml);

		const v = s.description;
		if (!v) return '';
		if (typeof v === 'string') return renderMarkdown(v);
		if (Array.isArray(v)) return renderBlocks(v as Array<{ type: string; children?: Array<{ text?: string }> }>);
		return '';
	}

	const recipeDescriptionHtml = $derived(
		(() => {
			return sanitizeHtmlString(recipe.heroTextHtml ?? recipe.descriptionHtml ?? '');
		})()
	);

	type IngredientItem = PageData['recipe']['ingredients'][number];
	type IngredientGroup = { key: string; name: string | null; items: IngredientItem[] };

	const ingredientGroups = $derived(
		((): IngredientGroup[] => {
			const items = (recipe.ingredients ?? []) as IngredientItem[];
			const groups: IngredientGroup[] = [];
			const idx: Record<string, number> = Object.create(null);

			for (const item of items) {
				const rawGroup = item.group as unknown;
				let name = '';
				if (typeof rawGroup === 'string') {
					name = rawGroup.trim();
				} else if (rawGroup && typeof rawGroup === 'object') {
					const maybeName = (rawGroup as { name?: unknown }).name;
					name = typeof maybeName === 'string' ? maybeName.trim() : '';
				} else if (rawGroup != null) {
					name = String(rawGroup).trim();
				}
				const key = name || '__default__';
				if (idx[key] === undefined) {
					idx[key] = groups.length;
					groups.push({ key, name: name || null, items: [] });
				}
				groups[idx[key]].items.push(item);
			}

			for (const g of groups) {
				g.items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
			}

			return groups;
		})()
	);

	function asNumber(value: unknown): number | null {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string') {
			const n = Number(value);
			return Number.isFinite(n) ? n : null;
		}
		return null;
	}

	function pickImageUrl(images: unknown): string {
		if (!images) return '';
		if (typeof images === 'string') return images;
		if (Array.isArray(images)) return mediaUrl(images[0]);

		const v = images as {
			original?: string | null;
			thumb?: { avif?: string | null; webp?: string | null } | null;
			small?: { avif?: string | null; webp?: string | null } | null;
			medium?: { avif?: string | null; webp?: string | null } | null;
			large?: { avif?: string | null; webp?: string | null } | null;
		};
		const candidates: Array<string | null | undefined> = [
			v.large?.webp,
			v.large?.avif,
			v.medium?.webp,
			v.medium?.avif,
			v.small?.webp,
			v.small?.avif,
			v.thumb?.webp,
			v.thumb?.avif,
			v.original
		];
		return candidates.find((x) => typeof x === 'string' && x.trim())?.trim() ?? '';
	}

	function stepImageUrls(step: unknown): Array<{ url: string; alt: string }> {
		const s = step as { images?: unknown; title?: string | null };
		if (!s.images) return [];
		if (Array.isArray(s.images)) {
			return (s.images as unknown[])
				.map((img) => ({ url: mediaUrl(img), alt: mediaAlt(img) || s.title || recipe.title || '' }))
				.filter((x) => x.url);
		}
		const url = pickImageUrl(s.images);
		if (!url) return [];
		return [{ url, alt: s.title || recipe.title || '' }];
	}

	function commentAuthor(c: unknown): string {
		const it = c as { user?: { username?: string | null } | null };
		return it.user?.username ?? 'Vartotojas';
	}

	function commentId(c: unknown): string | number | null {
		const it = c as { id?: unknown };
		const id = it?.id;
		if (typeof id === 'string' && id.trim()) return id;
		if (typeof id === 'number' && Number.isFinite(id)) return id;
		return null;
	}

	function commentContent(c: unknown): string {
		const it = c as { content?: unknown };
		const v = it?.content;
		return typeof v === 'string' ? v : '';
	}

	function commentDateText(c: unknown): string {
		const it = c as { created_at?: string | null };
		const raw = it.created_at;
		if (!raw) return '';
		const d = new Date(raw);
		return Number.isFinite(d.getTime()) ? d.toLocaleString('lt-LT') : raw;
	}

	async function toggleBookmark() {
		if (!recipe?.id || bookmarkPending) return;
		actionError = null;
		bookmarkPending = true;
		try {
			const res = await fetch(`/api/recipes/${recipe.id}/bookmark`, { method: 'POST' });
			const payload = (await res.json().catch(() => null)) as unknown;
			if (!res.ok) throw new Error(pickString(payload, 'detail') ?? 'Nepavyko išsaugoti');
			const next =
				pickBoolean(payload, 'is_bookmarked') ??
				pickBoolean(payload, 'isBookmarked') ??
				!recipe.isBookmarked;
			recipeOverrides = { ...recipeOverrides, isBookmarked: Boolean(next) };
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Nepavyko išsaugoti';
		} finally {
			bookmarkPending = false;
		}
	}

	async function submitRating() {
		if (!recipe?.id || ratingPending) return;
		actionError = null;
		if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
			actionError = 'Pasirink įvertinimą nuo 1 iki 5.';
			return;
		}
		ratingPending = true;
		try {
			const res = await fetch(`/api/recipes/${recipe.id}/rating`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ value: ratingValue })
			});
			const payload = (await res.json().catch(() => null)) as unknown;
			if (!res.ok) throw new Error(pickString(payload, 'detail') ?? 'Nepavyko įvertinti');
			const obj = asObject(payload);
			const avg =
				asNumber(obj?.rating_average ?? obj?.ratingAverage) ?? recipe.ratingAverage ?? null;
			const cnt =
				asNumber(obj?.rating_count ?? obj?.ratingCount) ?? recipe.ratingCount ?? null;
			recipeOverrides = { ...recipeOverrides, ratingAverage: avg, ratingCount: cnt, userRating: ratingValue };
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Nepavyko įvertinti';
		} finally {
			ratingPending = false;
		}
	}

	async function submitComment() {
		if (!recipe?.id || commentPending) return;
		actionError = null;
		const content = commentText.trim();
		if (!content) {
			actionError = 'Įrašyk komentarą.';
			return;
		}
		commentPending = true;
		try {
			const res = await fetch(`/api/recipes/${recipe.id}/comments`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ content })
			});
			const payload = (await res.json().catch(() => null)) as unknown;
			if (!res.ok) throw new Error(pickString(payload, 'detail') ?? 'Nepavyko išsiųsti komentaro');
			const obj = asObject(payload);
			const newComment = obj?.comment ?? payload;
			const comments = Array.isArray(recipe.comments) ? recipe.comments : [];
			recipeOverrides = { ...recipeOverrides, comments: [newComment, ...comments] };
			commentText = '';
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Nepavyko išsiųsti komentaro';
		} finally {
			commentPending = false;
		}
	}

	async function releaseWakeLock() {
		const sentinel = wakeLock as { release?: () => Promise<void> } | null;
		if (sentinel?.release) {
			try {
				await sentinel.release();
			} catch {
				// ignore
			}
		}
		wakeLock = null;
	}

	async function requestWakeLock() {
		if (!('wakeLock' in navigator)) return;

		try {
			wakeLock = await (navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<unknown> } }).wakeLock.request(
				'screen'
			);
		} catch {
			keepAwake = false;
			wakeLock = null;
		}
	}

	let visibilityHandler: (() => void) | null = null;

	onMount(() => {
		visibilityHandler = () => {
			if (document.visibilityState === 'visible' && keepAwake) {
				void requestWakeLock();
			}
		};

		document.addEventListener('visibilitychange', visibilityHandler);
	});

	onDestroy(() => {
		if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
		void releaseWakeLock();
	});

	$effect(() => {
		if (!browser) return;
		if (keepAwake) {
			void requestWakeLock();
		} else {
			void releaseWakeLock();
		}
	});
</script>

<svelte:head>
	<title>{recipe.title} – Receptai</title>
	{#if recipe.summary}
		<meta name="description" content={recipe.summary} />
	{/if}
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<RecipeHero
			title={recipe.title ?? ''}
			summary={recipe.summary}
			coverUrl={recipe.coverImage?.url}
			coverAlt={mediaAlt(recipe.coverImage)}
			rating={recipe.ratingAverage ?? 0}
			ratingCount={recipe.ratingCount ?? 0}
		/>
	</div>
	<div class="grid gap-6">
		<div class="flex flex-wrap items-center gap-3">
			<Button variant="outline" size="sm" onclick={() => document.getElementById('receptas')?.scrollIntoView()}>
				Pereiti prie recepto
			</Button>
			<Button
				variant={recipe.isBookmarked ? 'default' : 'outline'}
				size="sm"
				disabled={bookmarkPending}
				onclick={toggleBookmark}
			>
				{recipe.isBookmarked ? 'Išsaugota' : 'Išsaugoti'}
			</Button>
		</div>
		<CollapsibleDescription html={recipeDescriptionHtml} collapsedLines={4} />

		<Card.Root>
			<Card.Header>
				<Card.Title>Įvertinimas</Card.Title>
				<Card.Description>
					{#if recipe.userRating}
						Tavo įvertinimas: {recipe.userRating}/5
					{:else}
						Pasirink įvertinimą (1–5)
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-wrap items-center gap-2">
					{#each [1, 2, 3, 4, 5] as v (v)}
						<Button
							variant={ratingValue === v ? 'default' : 'outline'}
							size="sm"
							onclick={() => (ratingValue = v)}
						>
							{v}
						</Button>
					{/each}
					<Button variant="secondary" size="sm" disabled={ratingPending} onclick={submitRating}>
						Siųsti
					</Button>
				</div>
				{#if actionError}
					<p class="mt-2 text-sm text-destructive">{actionError}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
	<section class="grid gap-4">
		<div class="flex items-baseline justify-between gap-4 border-b pb-2">
			<h2 class="text-xl font-semibold tracking-tight">Recepto informacija</h2>
			<div class="flex items-center gap-3">
				<Switch bind:checked={keepAwake} />
				<div class="text-sm">
					<div class="font-medium">Neišjungti ekrano</div>
					<div class="text-xs text-muted-foreground">Naudinga gaminant pagal žingsnius</div>
				</div>
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="grid gap-2">
				<div class="text-xs font-semibold tracking-wide text-muted-foreground">FACETAI</div>
				<div class="flex flex-col items-center gap-2">
					<div class="flex w-full flex-wrap gap-2">
					{#if recipe.cuisines?.length}
						{#each recipe.cuisines as c (c.id)}
							{#if c.slug || c.name}
								<a href={facetHref('q', c.slug ?? c.name ?? '')} class={badgeVariants({ variant: 'destructive' })}>
									{c.name ?? c.slug}
								</a>
							{/if}
						{/each}
					{:else if recipe.cuisine?.slug || recipe.cuisine?.name}
						<a
							href={facetHref('q', recipe.cuisine?.slug ?? recipe.cuisine?.name ?? '')}
							class={badgeVariants({ variant: 'destructive' })}
						>
							{recipe.cuisine?.name ?? recipe.cuisine?.slug}
						</a>
					{/if}

					{#if recipe.mealTypes?.length}
						{#each recipe.mealTypes as mt (mt.id)}
							{#if mt.slug || mt.name}
								<a
									href={facetHref('q', mt.slug ?? mt.name ?? '')}
									class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
								>
									Valgis: {mt.name ?? mt.slug}
								</a>
							{/if}
						{/each}
					{:else if recipe.meal_type?.slug || recipe.meal_type?.name}
						<a
							href={facetHref('q', recipe.meal_type?.slug ?? recipe.meal_type?.name ?? '')}
							class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
						>
							Valgis: {recipe.meal_type?.name ?? recipe.meal_type?.slug}
						</a>
					{/if}

					{#if recipe.categories?.length}
						{#each recipe.categories as cat (cat.id)}
							{#if cat.slug || cat.name}
								<a
									href={facetHref('q', cat.slug ?? cat.name ?? '')}
									class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
								>
									Kategorija: {cat.name ?? cat.slug}
								</a>
							{/if}
						{/each}
					{/if}

					{#if recipe.cookingMethods?.length}
						{#each recipe.cookingMethods as cm (cm.id)}
							{#if cm.slug || cm.name}
								<a
									href={facetHref('q', cm.slug ?? cm.name ?? '')}
									class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
								>
									Metodas: {cm.name ?? cm.slug}
								</a>
							{/if}
						{/each}
					{/if}

					{#if recipe.tags?.length}
						{#each recipe.tags as t (t.id)}
							{#if t.slug || t.name}
								<a
									href={facetHref('q', t.slug ?? t.name ?? '')}
									class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
								>
									{t.name ?? t.slug}
								</a>
							{/if}
						{/each}
					{:else if recipe.tag?.length}
						{#each recipe.tag as t (t.id)}
							{#if t.slug || t.name}
								<a
									href={facetHref('q', t.slug ?? t.name ?? '')}
									class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
								>
									{t.name ?? t.slug}
								</a>
							{/if}
						{/each}
					{/if}

					{#if recipe.difficulty}
						<span class="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium">
							Sudėtingumas: {recipe.difficulty}
						</span>
					{/if}
				</div>
				</div>
			</div>

			<div class="grid gap-2">
				<div class="text-xs font-semibold tracking-wide text-muted-foreground">LAIKAI</div>
				<div class="grid grid-cols-2 gap-2 text-sm">
					{#if recipe.prepTimeMin}
						<div class="rounded-md border bg-card p-3">
							<div class="text-xs text-muted-foreground">Paruošimas</div>
							<div class="font-medium tabular-nums">{recipe.prepTimeMin} min</div>
						</div>
					{/if}
					{#if recipe.cookTimeMin}
						<div class="rounded-md border bg-card p-3">
							<div class="text-xs text-muted-foreground">Gaminimas</div>
							<div class="font-medium tabular-nums">{recipe.cookTimeMin} min</div>
						</div>
					{/if}
					{#if recipe.totalTimeMin}
						<div class="rounded-md border bg-card p-3">
							<div class="text-xs text-muted-foreground">Viso</div>
							<div class="font-medium tabular-nums">{recipe.totalTimeMin} min</div>
						</div>
					{/if}
					{#if recipe.servings}
						<div class="rounded-md border bg-card p-3">
							<div class="text-xs text-muted-foreground">Porcijos</div>
							<div class="font-medium tabular-nums">{recipe.servings}</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>



	<section id="receptas" class="grid gap-6s">
		<div class="grid gap-6 md:grid-cols-12">
			<section class="md:col-span-4 pr-7">
				<div class="flex items-end justify-between gap-4 border-b pb-2">
					<h2 class="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">Ingredientai</h2>
					<div class="flex items-center gap-2">
						<Button
							variant={ingredientMultiplier === 0.5 ? 'default' : 'outline'}
							size="sm"
							onclick={() => (ingredientMultiplier = 0.5)}
						>
							x0,5
						</Button>
						<Button
							variant={ingredientMultiplier === 1 ? 'default' : 'outline'}
							size="sm"
							onclick={() => (ingredientMultiplier = 1)}
						>
							x1
						</Button>
						<Button
							variant={ingredientMultiplier === 2 ? 'default' : 'outline'}
							size="sm"
							onclick={() => (ingredientMultiplier = 2)}
						>
							x2
						</Button>
					</div>
				</div>

				<div class="mt-4 grid gap-6">
					{#if ingredientGroups.length}
						{#each ingredientGroups as g (g.key)}
							<div class="grid gap-3">
								{#if g.name}
									<h3 class="text-sm font-semibold tracking-wide text-muted-foreground">{g.name}</h3>
								{/if}
								<ul class="grid gap-3">
									{#each g.items as item, i (i)}
										{@const note = ingredientNote(item)}
										{@const qty = ingredientQtyText(item)}
										<li class="flex items-start justify-between gap-4">
											<div class="min-w-0">
												<div class="font-medium leading-snug">{ingredientTitle(item)}</div>
												{#if note}
													<small class="text-muted-foreground">{note}</small>
												{/if}
											</div>
											<div class="shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
												{qty}
											</div>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					{:else}
						<p class="text-sm text-muted-foreground">Ingredientų sąrašas dar neparuoštas.</p>
					{/if}
				</div>
			</section>

			<section class="md:col-span-8">
				<div class="border-b pb-2">
					<h2 class="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">Paruošimas</h2>
				</div>

				<div class="mt-4 grid gap-8">
					{#if recipe.steps?.length}
						{#each recipe.steps as step, i (i)}
							{@const descHtml = stepDescriptionHtml(step)}
							{@const timerMin = (step.duration ?? null) as unknown}
							{@const images = stepImageUrls(step)}
							<div class="grid gap-3">
								<div class="grid gap-1">
									<h3 class="scroll-m-20 text-xl font-extrabold tracking-tight text-balance">
										Žingsnis {step.number ?? i + 1}
										{#if step.title}
											- {step.title}
										{/if}
									</h3>
								
									{#if asNumber(timerMin)}
									<Badge variant="secondary">
										<AlarmClockCheck class="h-4 w-4" />
										{asNumber(timerMin)} min
									  </Badge>
										<!-- <div class="text-xs text-muted-foreground">{step.timerMin} min</div> -->
									{/if}
								</div>

								{#if descHtml}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									<div class="prose prose-zinc max-w-none">{@html descHtml}</div>
								{/if}

								{#if step.note}
								<blockquote class="my-6 border-s-2 ps-6 italic">{step.note}</blockquote>

								{/if}

								{#if images.length}
									<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
										{#each images as img (img.url)}
											{#if img.url}
												<img
													src={img.url}
													alt={img.alt}
													class="aspect-video w-full rounded-md border object-cover"
													loading="lazy"
												/>
											{/if}
										{/each}
									</div>
								{/if}
							</div>
							<Separator />
						{/each}
						
					{:else}
						<p class="text-sm text-muted-foreground">Gaminimo eiga dar neparuošta.</p>
					{/if}
				</div>
			</section>
		</div>
	</section>

	<section class="grid gap-4">
		<div class="border-b pb-2">
			<h2 class="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">Komentarai</h2>
		</div>

		<Card.Root>
			<Card.Content>
				<form class="grid gap-3" onsubmit={(e) => (e.preventDefault(), void submitComment())}>
					<textarea
						class="border-input bg-background ring-offset-background placeholder:text-muted-foreground min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
						placeholder="Parašyk komentarą..."
						bind:value={commentText}
					></textarea>
					<div class="flex items-center justify-end gap-2">
						<Button type="submit" size="sm" disabled={commentPending}>Siųsti</Button>
					</div>
				</form>
				{#if actionError}
					<p class="mt-2 text-sm text-destructive">{actionError}</p>
				{/if}
			</Card.Content>
		</Card.Root>

		{#if recipe.comments?.length}
			<div class="grid gap-3">
				{#each recipe.comments as c, i (commentId(c) ?? i)}
					<Card.Root>
						<Card.Header>
							<Card.Title class="text-base">{commentAuthor(c)}</Card.Title>
							{@const dt = commentDateText(c)}
							{#if dt}
								<Card.Description>{dt}</Card.Description>
							{/if}
						</Card.Header>
						<Card.Content>
							<p class="whitespace-pre-wrap text-sm">{commentContent(c)}</p>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Komentarų dar nėra.</p>
		{/if}
	</section>
</div>
