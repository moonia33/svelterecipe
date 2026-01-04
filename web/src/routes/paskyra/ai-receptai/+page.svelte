<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { resolve } from '$app/paths';

	type IngredientCategory = { id: number; name?: string | null; slug?: string | null };
	type Ingredient = {
		id: number;
		name?: string | null;
		title?: string | null;
		category?: IngredientCategory | null;
	};

	type RecipeJobCreateResponse = { job_id: number; status: string };
	type RecipeJobStatus = {
		job_id: number;
		status: string;
		created_at?: string | null;
		started_at?: string | null;
		finished_at?: string | null;
		result_recipe_id?: number | null;
		result_recipe_slug?: string | null;
		error?: string | null;
	};

	type ImageJobCreateResponse = { job_id: number; status: string };
	type ImageJobStatus = {
		job_id: number;
		status: string;
		created_at?: string | null;
		started_at?: string | null;
		finished_at?: string | null;
		recipe_id?: number | null;
		recipe_slug?: string | null;
		error?: string | null;
	};

	function clean(value: string): string {
		return value.trim();
	}

	function labelOfIngredient(i: Ingredient): string {
		return clean(i.name ?? '') || clean(i.title ?? '') || `#${i.id}`;
	}

	function pushUnique(arr: string[], v: string): string[] {
		const val = clean(v);
		if (!val) return arr;
		if (arr.some((x) => clean(x).toLowerCase() === val.toLowerCase())) return arr;
		return [...arr, val];
	}

	function removeAt<T>(arr: T[], idx: number): T[] {
		return arr.filter((_, i) => i !== idx);
	}

	let dishType = $state('');
	let prepSpeed = $state('');

	let haveIngredientIds = $state<number[]>([]);
	let canBuyIngredientIds = $state<number[]>([]);
	let ingredientLabelById = $state<Record<number, string>>({});

	let haveIngredientsText = $state<string[]>([]);
	let canBuyIngredientsText = $state<string[]>([]);
	let exclude = $state<string[]>([]);

	let addHaveText = $state('');
	let addCanBuyText = $state('');
	let addExcludeText = $state('');

	let jobCreate = $state<RecipeJobCreateResponse | null>(null);
	let jobStatus = $state<RecipeJobStatus | null>(null);
	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	let imageJobCreate = $state<ImageJobCreateResponse | null>(null);
	let imageJobStatus = $state<ImageJobStatus | null>(null);
	let imageSubmitting = $state(false);
	let imageError = $state<string | null>(null);

	let pickHaveOpen = $state(false);
	let pickCanBuyOpen = $state(false);

	let ingCategoryOpen = $state(false);
	let ingCategorySearch = $state('');
	let ingCategoryItems = $state<IngredientCategory[]>([]);
	let ingCategoryLoading = $state(false);
	let ingCategoryError = $state<string | null>(null);
	let selectedIngCategorySlug = $state<string>('');

	let ingSearch = $state('');
	let ingItems = $state<Ingredient[]>([]);
	let ingLoading = $state(false);
	let ingError = $state<string | null>(null);

	let _catReq = 0;
	let _ingReq = 0;

	function queryString(params: Record<string, string | null | undefined>): string {
		const parts: string[] = [];
		for (const [k, v] of Object.entries(params)) {
			const val = clean(v ?? '');
			if (!val) continue;
			parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
		}
		return parts.join('&');
	}

	async function fetchIngredientCategories(search: string): Promise<IngredientCategory[]> {
		const qs = queryString({ search: clean(search), limit: '50', offset: '0' });
		const res = await fetch(
			qs ? `/api/recipes/ingredient-categories?${qs}` : '/api/recipes/ingredient-categories'
		);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as unknown;
		const items =
			data && typeof data === 'object' && 'items' in (data as Record<string, unknown>)
				? (data as { items?: unknown }).items
				: null;
		return Array.isArray(items) ? (items as IngredientCategory[]) : [];
	}

	async function fetchIngredients(search: string, categorySlug: string): Promise<Ingredient[]> {
		const qs = queryString({
			search: clean(search),
			limit: '50',
			offset: '0',
			category: clean(categorySlug) || null
		});
		const res = await fetch(qs ? `/api/recipes/ingredients?${qs}` : '/api/recipes/ingredients');
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = (await res.json()) as unknown;
		const items =
			data && typeof data === 'object' && 'items' in (data as Record<string, unknown>)
				? (data as { items?: unknown }).items
				: null;
		return Array.isArray(items) ? (items as Ingredient[]) : [];
	}

	$effect(() => {
		if (!ingCategoryOpen) return;
		ingCategoryError = null;
		ingCategoryLoading = true;
		const reqId = ++_catReq;
		const t = setTimeout(async () => {
			try {
				const items = await fetchIngredientCategories(ingCategorySearch);
				if (reqId === _catReq) ingCategoryItems = items;
			} catch (e) {
				if (reqId === _catReq) {
					ingCategoryError =
						e instanceof Error ? e.message : 'Nepavyko užkrauti ingredientų kategorijų.';
					ingCategoryItems = [];
				}
			} finally {
				if (reqId === _catReq) ingCategoryLoading = false;
			}
		}, 250);
		return () => clearTimeout(t);
	});

	$effect(() => {
		const anyPickerOpen = pickHaveOpen || pickCanBuyOpen;
		if (!anyPickerOpen) return;
		ingError = null;
		ingLoading = true;
		const reqId = ++_ingReq;
		const t = setTimeout(async () => {
			try {
				const items = await fetchIngredients(ingSearch, selectedIngCategorySlug);
				if (reqId === _ingReq) ingItems = items;
			} catch (e) {
				if (reqId === _ingReq) {
					ingError = e instanceof Error ? e.message : 'Nepavyko užkrauti ingredientų.';
					ingItems = [];
				}
			} finally {
				if (reqId === _ingReq) ingLoading = false;
			}
		}, 250);
		return () => clearTimeout(t);
	});

	function toggleIngredient(target: 'have' | 'can_buy', i: Ingredient) {
		const id = i.id;
		if (!Number.isFinite(id)) return;
		ingredientLabelById = { ...ingredientLabelById, [id]: labelOfIngredient(i) };
		if (target === 'have') {
			haveIngredientIds = haveIngredientIds.includes(id)
				? haveIngredientIds.filter((x) => x !== id)
				: [...haveIngredientIds, id];
		} else {
			canBuyIngredientIds = canBuyIngredientIds.includes(id)
				? canBuyIngredientIds.filter((x) => x !== id)
				: [...canBuyIngredientIds, id];
		}
	}

	async function submitRecipeJob() {
		submitting = true;
		submitError = null;
		jobCreate = null;
		jobStatus = null;
		imageJobCreate = null;
		imageJobStatus = null;
		imageError = null;
		try {
			const payload = {
				dish_type: clean(dishType) || undefined,
				prep_speed: clean(prepSpeed) || undefined,
				have_ingredient_ids: haveIngredientIds,
				have_ingredients_text: haveIngredientsText,
				can_buy_ingredient_ids: canBuyIngredientIds,
				can_buy_ingredients_text: canBuyIngredientsText,
				exclude
			};
			const res = await fetch('/api/ai/recipe-jobs', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const data = (await res.json().catch(() => ({}))) as RecipeJobCreateResponse & {
				detail?: string;
			};
			if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
			jobCreate = data;
			jobStatus = { job_id: data.job_id, status: data.status };
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'Nepavyko sukurti jobo.';
		} finally {
			submitting = false;
		}
	}

	async function refreshRecipeJob() {
		if (!jobCreate?.job_id) return;
		const id = jobCreate.job_id;
		const res = await fetch(`/api/ai/recipe-jobs/${encodeURIComponent(String(id))}`);
		if (!res.ok) return;
		jobStatus = (await res.json().catch(() => null)) as RecipeJobStatus | null;
	}

	$effect(() => {
		const id = jobCreate?.job_id;
		if (!id) return;
		const status = jobStatus?.status ?? '';
		if (status === 'succeeded' || status === 'failed') return;
		let alive = true;
		refreshRecipeJob();
		const t = setInterval(() => {
			if (!alive) return;
			refreshRecipeJob();
		}, 1500);
		return () => {
			alive = false;
			clearInterval(t);
		};
	});

	async function submitImageJob() {
		imageSubmitting = true;
		imageError = null;
		imageJobCreate = null;
		imageJobStatus = null;
		try {
			const recipeSlug = jobStatus?.result_recipe_slug ?? null;
			const recipeId = jobStatus?.result_recipe_id ?? null;
			if (!recipeSlug && !recipeId) throw new Error('Trūksta sugeneruoto recepto ID/slug.');
			const payload = recipeSlug
				? { recipe_slug: recipeSlug }
				: { recipe_id: recipeId ?? undefined };
			const res = await fetch('/api/ai/recipe-image-jobs', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const data = (await res.json().catch(() => ({}))) as ImageJobCreateResponse & {
				detail?: string;
			};
			if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
			imageJobCreate = data;
			imageJobStatus = { job_id: data.job_id, status: data.status };
		} catch (e) {
			imageError = e instanceof Error ? e.message : 'Nepavyko sukurti paveikslo jobo.';
		} finally {
			imageSubmitting = false;
		}
	}

	async function refreshImageJob() {
		if (!imageJobCreate?.job_id) return;
		const id = imageJobCreate.job_id;
		const res = await fetch(`/api/ai/recipe-image-jobs/${encodeURIComponent(String(id))}`);
		if (!res.ok) return;
		imageJobStatus = (await res.json().catch(() => null)) as ImageJobStatus | null;
	}

	$effect(() => {
		const id = imageJobCreate?.job_id;
		if (!id) return;
		const status = imageJobStatus?.status ?? '';
		if (status === 'succeeded' || status === 'failed') return;
		let alive = true;
		refreshImageJob();
		const t = setInterval(() => {
			if (!alive) return;
			refreshImageJob();
		}, 1500);
		return () => {
			alive = false;
			clearInterval(t);
		};
	});
</script>

<div class="grid gap-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>AI receptų generavimas</Card.Title>
			<Card.Description>Susirink ingredientus, pridėk draudimus ir sukurk job’ą.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				class="grid gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					submitRecipeJob();
				}}
			>
				<div class="grid gap-2 md:grid-cols-2">
					<div class="grid gap-2">
						<Label for="dish_type">Patiekalo tipas</Label>
						<Input id="dish_type" placeholder="pvz. desertas" bind:value={dishType} />
					</div>
					<div class="grid gap-2">
						<Label for="prep_speed">Gaminimo greitis</Label>
						<Input id="prep_speed" placeholder="pvz. greitas" bind:value={prepSpeed} />
					</div>
				</div>

				<div class="grid gap-2">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="text-sm font-medium">Ingredientai (iš DB)</p>
						<div class="flex gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onclick={() => (pickHaveOpen = true)}
							>
								Turiu namuose ({haveIngredientIds.length})
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onclick={() => (pickCanBuyOpen = true)}
							>
								Galiu nupirkti ({canBuyIngredientIds.length})
							</Button>
						</div>
					</div>

					<div class="flex flex-wrap gap-2">
						{#each haveIngredientIds as id, idx (id)}
							<Badge variant="secondary" class="gap-2">
								Turiu: {ingredientLabelById[id] ?? `#${id}`}
								<button
									type="button"
									class="rounded px-1 hover:bg-accent"
									aria-label="Pašalinti ingredientą"
									onclick={() => (haveIngredientIds = removeAt(haveIngredientIds, idx))}
								>
									×
								</button>
							</Badge>
						{/each}
						{#each canBuyIngredientIds as id, idx (id)}
							<Badge variant="secondary" class="gap-2">
								Nupirksiu: {ingredientLabelById[id] ?? `#${id}`}
								<button
									type="button"
									class="rounded px-1 hover:bg-accent"
									aria-label="Pašalinti ingredientą"
									onclick={() => (canBuyIngredientIds = removeAt(canBuyIngredientIds, idx))}
								>
									×
								</button>
							</Badge>
						{/each}
					</div>
				</div>

				<div class="grid gap-3 md:grid-cols-3">
					<div class="grid gap-2">
						<Label for="have_text">Turiu (tekstas)</Label>
						<div class="flex gap-2">
							<Input id="have_text" placeholder="pvz. kiaušiniai" bind:value={addHaveText} />
							<Button
								type="button"
								variant="secondary"
								onclick={() => {
									haveIngredientsText = pushUnique(haveIngredientsText, addHaveText);
									addHaveText = '';
								}}
							>
								Pridėti
							</Button>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each haveIngredientsText as t, i (t)}
								<Badge variant="secondary" class="gap-2">
									{t}
									<button
										type="button"
										class="rounded px-1 hover:bg-accent"
										aria-label="Pašalinti"
										onclick={() => (haveIngredientsText = removeAt(haveIngredientsText, i))}
									>
										×
									</button>
								</Badge>
							{/each}
						</div>
					</div>

					<div class="grid gap-2">
						<Label for="can_buy_text">Galiu nupirkti (tekstas)</Label>
						<div class="flex gap-2">
							<Input id="can_buy_text" placeholder="pvz. grietinėlė" bind:value={addCanBuyText} />
							<Button
								type="button"
								variant="secondary"
								onclick={() => {
									canBuyIngredientsText = pushUnique(canBuyIngredientsText, addCanBuyText);
									addCanBuyText = '';
								}}
							>
								Pridėti
							</Button>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each canBuyIngredientsText as t, i (t)}
								<Badge variant="secondary" class="gap-2">
									{t}
									<button
										type="button"
										class="rounded px-1 hover:bg-accent"
										aria-label="Pašalinti"
										onclick={() => (canBuyIngredientsText = removeAt(canBuyIngredientsText, i))}
									>
										×
									</button>
								</Badge>
							{/each}
						</div>
					</div>

					<div class="grid gap-2">
						<Label for="exclude_text">Draudimai (exclude)</Label>
						<div class="flex gap-2">
							<Input id="exclude_text" placeholder="pvz. laktozė" bind:value={addExcludeText} />
							<Button
								type="button"
								variant="secondary"
								onclick={() => {
									exclude = pushUnique(exclude, addExcludeText);
									addExcludeText = '';
								}}
							>
								Pridėti
							</Button>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each exclude as t, i (t)}
								<Badge variant="secondary" class="gap-2">
									be {t}
									<button
										type="button"
										class="rounded px-1 hover:bg-accent"
										aria-label="Pašalinti"
										onclick={() => (exclude = removeAt(exclude, i))}
									>
										×
									</button>
								</Badge>
							{/each}
						</div>
					</div>
				</div>

				{#if submitError}
					<p class="text-sm text-destructive">{submitError}</p>
				{/if}
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Kuriama...' : 'Kurti receptą'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if jobStatus}
		<Card.Root>
			<Card.Header>
				<Card.Title>Job statusas</Card.Title>
				<Card.Description>ID: {jobStatus.job_id}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="secondary">{jobStatus.status}</Badge>
					<Button type="button" variant="outline" size="sm" onclick={refreshRecipeJob}
						>Atnaujinti</Button
					>
				</div>
				{#if jobStatus.error}
					<p class="text-sm text-destructive">{jobStatus.error}</p>
				{/if}
				{#if jobStatus.status === 'succeeded' && jobStatus.result_recipe_slug}
					<div class="flex flex-wrap items-center gap-2">
						<a
							class="text-sm underline"
							href={resolve(
								...([`/receptai/${jobStatus.result_recipe_slug}`] as unknown as Parameters<
									typeof resolve
								>)
							)}
						>
							Atidaryti receptą
						</a>
						<Button type="button" onclick={submitImageJob} disabled={imageSubmitting}>
							{imageSubmitting ? 'Kuriama...' : 'Kurti hero paveikslą'}
						</Button>
					</div>
				{/if}
				{#if imageError}
					<p class="text-sm text-destructive">{imageError}</p>
				{/if}
				{#if imageJobStatus}
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-sm text-muted-foreground">Paveikslo job:</span>
						<Badge variant="secondary">{imageJobStatus.status}</Badge>
						<Button type="button" variant="outline" size="sm" onclick={refreshImageJob}
							>Atnaujinti</Button
						>
					</div>
					{#if imageJobStatus.error}
						<p class="text-sm text-destructive">{imageJobStatus.error}</p>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Ingredient picker dialogs -->
<Dialog.Root bind:open={pickHaveOpen}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Ingredientai: turiu namuose</Dialog.Title>
			<Dialog.Description>Ieškok ingredientų, pasirink (multi) ir uždaryk.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-3">
			<div class="flex flex-wrap gap-2">
				<Button type="button" variant="outline" size="sm" onclick={() => (ingCategoryOpen = true)}>
					Kategorija{selectedIngCategorySlug ? `: ${selectedIngCategorySlug}` : ''}
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => (selectedIngCategorySlug = '')}
				>
					Išvalyti kategoriją
				</Button>
			</div>
			<Input placeholder="Paieška..." bind:value={ingSearch} />
			{#if ingError}
				<p class="text-sm text-destructive">{ingError}</p>
			{/if}
			{#if ingLoading}
				<p class="text-sm text-muted-foreground">Kraunama...</p>
			{:else}
				<div class="grid max-h-96 gap-2 overflow-auto">
					{#each ingItems as i (i.id)}
						<Button
							type="button"
							variant={haveIngredientIds.includes(i.id) ? 'default' : 'outline'}
							onclick={() => toggleIngredient('have', i)}
						>
							{labelOfIngredient(i)}
						</Button>
					{/each}
				</div>
			{/if}
			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (pickHaveOpen = false)}
					>Uždaryti</Button
				>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={pickCanBuyOpen}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Ingredientai: galiu nupirkti</Dialog.Title>
			<Dialog.Description>Ieškok ingredientų, pasirink (multi) ir uždaryk.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-3">
			<div class="flex flex-wrap gap-2">
				<Button type="button" variant="outline" size="sm" onclick={() => (ingCategoryOpen = true)}>
					Kategorija{selectedIngCategorySlug ? `: ${selectedIngCategorySlug}` : ''}
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => (selectedIngCategorySlug = '')}
				>
					Išvalyti kategoriją
				</Button>
			</div>
			<Input placeholder="Paieška..." bind:value={ingSearch} />
			{#if ingError}
				<p class="text-sm text-destructive">{ingError}</p>
			{/if}
			{#if ingLoading}
				<p class="text-sm text-muted-foreground">Kraunama...</p>
			{:else}
				<div class="grid max-h-96 gap-2 overflow-auto">
					{#each ingItems as i (i.id)}
						<Button
							type="button"
							variant={canBuyIngredientIds.includes(i.id) ? 'default' : 'outline'}
							onclick={() => toggleIngredient('can_buy', i)}
						>
							{labelOfIngredient(i)}
						</Button>
					{/each}
				</div>
			{/if}
			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (pickCanBuyOpen = false)}
					>Uždaryti</Button
				>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={ingCategoryOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Ingredientų kategorijos</Dialog.Title>
			<Dialog.Description>Pasirink kategoriją ingredientų paieškai.</Dialog.Description>
		</Dialog.Header>
		<div class="mt-4 grid gap-3">
			<Input placeholder="Paieška..." bind:value={ingCategorySearch} />
			<div class="flex justify-between gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={() => ((selectedIngCategorySlug = ''), (ingCategoryOpen = false))}
				>
					Išvalyti
				</Button>
				<Button
					type="button"
					variant="secondary"
					size="sm"
					onclick={() => (ingCategorySearch = '')}
				>
					Išvalyti paiešką
				</Button>
			</div>
			{#if ingCategoryError}
				<p class="text-sm text-destructive">{ingCategoryError}</p>
			{/if}
			{#if ingCategoryLoading}
				<p class="text-sm text-muted-foreground">Kraunama...</p>
			{:else}
				<div class="grid max-h-80 gap-2 overflow-auto">
					{#each ingCategoryItems as c (c.id)}
						{#if c.slug || c.name}
							<Button
								type="button"
								variant={clean(selectedIngCategorySlug) === clean(c.slug ?? '')
									? 'default'
									: 'outline'}
								onclick={() => (
									(selectedIngCategorySlug = c.slug ?? ''),
									(ingCategoryOpen = false)
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
