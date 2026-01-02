<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children: Snippet }>();
</script>

 <svelte:head>
 	<link rel="icon" href={favicon} />
 	<title>Receptai</title>
 	<meta name="description" content="Receptai ir pirkinių sąrašas Lietuvos rinkai." />
 </svelte:head>

<a class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow" href="#turinys">Į turinį</a>

 <div class="min-h-dvh bg-white text-zinc-950">
 	<header class="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
		<div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
			<a class="font-semibold tracking-tight" href={resolve('/')}>Receptai</a>
			<nav class="flex items-center gap-3 text-sm">
				<a class="rounded px-2 py-1 hover:bg-zinc-100" href={resolve('/receptai')}>Receptai</a>
				<a class="rounded px-2 py-1 hover:bg-zinc-100" href={resolve('/parduotuve')}>Esu parduotuvėje</a>
				<a class="rounded px-2 py-1 hover:bg-zinc-100" href={resolve('/paieska')}>Paieška</a>
				<Button variant="ghost" size="sm" href="/paskyra">Paskyra</Button>
			</nav>
 		</div>
 	</header>

 	<main id="turinys" class="mx-auto max-w-7xl px-4 py-6">
 		{@render children()}
 	</main>
 </div>
