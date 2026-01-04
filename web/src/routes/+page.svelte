<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { canonicalFromUrl, jsonLdStringify } from '$lib/seo';

	const title = 'Receptai – Apetitas.lt';
	const description = 'Receptai, aiški gaminimo eiga ir pirkinių sąrašas Lietuvos rinkai.';
	const canonical = $derived(canonicalFromUrl(page.url));

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Apetitas.lt',
		url: canonical,
		potentialAction: {
			'@type': 'SearchAction',
			target: `${page.url.origin}${resolve('/paieska')}?q={search_term_string}`,
			'query-input': 'required name=search_term_string'
		}
	});
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

<div class="grid gap-6">
	<header class="grid gap-2">
		<h1 class="text-3xl font-semibold tracking-tight">Receptai</h1>
		<p class="text-zinc-700">
			Sukurta Lietuvos rinkai: aiški gaminimo eiga, checkbox’ai ir pirkinių režimas.
		</p>
	</header>

	<div class="grid gap-3 sm:grid-cols-3">
		<a class="rounded-lg border p-4 hover:bg-zinc-50" href={resolve('/receptai')}>
			<div class="font-medium">Receptų sąrašas</div>
			<p class="mt-1 text-sm text-zinc-600">Filtrai ir kategorijos pagal modelius.</p>
		</a>
		<a class="rounded-lg border p-4 hover:bg-zinc-50" href={resolve('/parduotuve')}>
			<div class="font-medium">Esu parduotuvėje</div>
			<p class="mt-1 text-sm text-zinc-600">Minimalus blaškymas, aiškūs checkbox’ai.</p>
		</a>
		<a class="rounded-lg border p-4 hover:bg-zinc-50" href={resolve('/paieska')}>
			<div class="font-medium">Paieška</div>
			<p class="mt-1 text-sm text-zinc-600">Unsplash + AI (bus prijungta).</p>
		</a>
	</div>
</div>
