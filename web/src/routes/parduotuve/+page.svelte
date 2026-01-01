<script lang="ts">
	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';

	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';

	import type { PageData } from './$types';

	let props = $props<{ data: PageData }>();
	// eslint-disable-next-line svelte/prefer-writable-derived
	let page = $state<PageData>(props.data);
	$effect(() => {
		page = props.data;
	});

	type CheckedMap = Record<string, boolean | undefined>;

	let checked = $state<CheckedMap>({});
	let keepAwake = $state(false);
	let wakeLock: unknown = $state(null);
	let loadedSlug = $state<string | null>(null);

	function isChecked(key: string) {
		return !!checked[key];
	}

	function setChecked(key: string, value: boolean) {
		checked = {
			...checked,
			[key]: value
		};
	}

	const storageKey = () => `shop:checked:${page?.selectedSlug ?? 'none'}`;
	const storageKeyKeepAwake = () => `shop:keepAwake:${page?.selectedSlug ?? 'none'}`;

	function persist() {
		try {
			localStorage.setItem(storageKey(), JSON.stringify(checked));
			localStorage.setItem(storageKeyKeepAwake(), JSON.stringify(keepAwake));
		} catch {
			// ignore
		}
	}

	function clearChecked() {
		checked = {};
		try {
			localStorage.removeItem(storageKey());
		} catch {
			// ignore
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
			wakeLock = await (
				navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<unknown> } }
			).wakeLock.request('screen');
		} catch {
			keepAwake = false;
			wakeLock = null;
		}
	}

	let visibilityHandler: (() => void) | null = null;

	$effect(() => {
		if (!browser) return;
		if (!page) return;
		const slug = page.selectedSlug ?? 'none';
		if (loadedSlug === slug) return;
		loadedSlug = slug;
		try {
			checked = JSON.parse(localStorage.getItem(storageKey()) ?? '{}') as CheckedMap;
			keepAwake = JSON.parse(localStorage.getItem(storageKeyKeepAwake()) ?? 'false') as boolean;
		} catch {
			checked = {};
			keepAwake = false;
		}
	});

	onMount(() => {

		visibilityHandler = () => {
			if (document.visibilityState === 'visible' && keepAwake) {
				void requestWakeLock();
			}
		};
		document.addEventListener('visibilitychange', visibilityHandler);
	});

	onDestroy(() => {
		persist();
		if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
		void releaseWakeLock();
	});

	$effect(() => {
		if (!browser) return;
		if (!page) return;
		persist();
	});

	$effect(() => {
		if (!browser) return;
		if (keepAwake) {
			void requestWakeLock();
		} else {
			void releaseWakeLock();
		}
	});

	function formatQuantity(q: number | null) {
		if (q === null) return null;
		const rounded = Math.round(q * 100) / 100;
		return String(rounded).replace('.', ',');
	}
</script>

<svelte:head>
	<title>Esu parduotuvėje – Receptai</title>
	<meta name="description" content="Pirkinių sąrašas be blaškymo, su checkbox’ais." />
</svelte:head>

<div class="grid gap-6">
	<header class="grid gap-3">
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">Esu parduotuvėje</h1>
				<p class="mt-1 text-sm text-zinc-600">Minimalus režimas: aiškus sąrašas, be blaškymo.</p>
			</div>
			<a class="text-sm text-zinc-600 underline underline-offset-4 hover:text-zinc-900" href="/receptai">Atgal į receptus</a>
		</div>

		<form method="GET" class="grid gap-2 rounded-lg border p-4">
			<label class="text-sm font-medium" for="receptas">Receptas</label>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
				<select
					id="receptas"
					name="receptas"
					class="h-10 w-full rounded-md border bg-background px-3 text-sm"
					value={page.selectedSlug ?? ''}
				>
					<option value="">Pasirinkite receptą...</option>
					{#each page.recipes as r (r.id)}
						<option value={r.slug}>{r.title}</option>
					{/each}
				</select>
				<Button type="submit" class="sm:w-auto">Rodyti sąrašą</Button>
			</div>
			{#if page.selectedTitle}
				<div class="mt-2 text-sm text-zinc-600">Pasirinktas receptas: <span class="font-medium text-zinc-900">{page.selectedTitle}</span></div>
			{/if}
			<div class="mt-2 flex items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<Switch bind:checked={keepAwake} />
					<div class="text-sm">
						<div class="font-medium">Neišjungti ekrano</div>
						<div class="text-xs text-zinc-600">Patogu parduotuvėje</div>
					</div>
				</div>
				<Button variant="outline" type="button" onclick={clearChecked}>Išvalyti pažymėjimus</Button>
			</div>
		</form>
	</header>

	{#if !page.selectedSlug}
		<div class="rounded-lg border p-4 text-sm text-zinc-600">Pasirinkite receptą, kad sugeneruočiau pirkinių sąrašą.</div>
	{:else}
		{#if page.shopping.length === 0}
			<div class="rounded-lg border p-4 text-sm text-zinc-600">Šiam receptui ingredientų sąrašas tuščias.</div>
		{:else}
			<section class="grid gap-3">
				<h2 class="text-lg font-semibold tracking-tight">Pirkinių sąrašas</h2>

				<div class="grid gap-2">
					{#each page.shopping as item (item.key)}
						<div class="flex items-start gap-3 rounded-md border p-3">
							<Checkbox
								checked={isChecked(item.key)}
								onclick={() => setChecked(item.key, !isChecked(item.key))}
								class="mt-0.5"
							/>
							<div class={isChecked(item.key) ? 'text-zinc-500 line-through' : ''}>
								<div class="font-medium">{item.ingredientName}</div>
								<div class="mt-0.5 text-sm text-zinc-600">
									{#if item.totalQuantity !== null}
										{formatQuantity(item.totalQuantity)}
									{/if}
									{#if item.unitName}
										{#if item.totalQuantity !== null}&nbsp;{/if}{item.unitName}
									{/if}
									{#if item.note}
										<span class="text-zinc-500"> – {item.note}</span>
									{/if}
								</div>
								{#if item.optional}
									<div class="mt-1 text-xs text-zinc-500">Nebūtina</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>
