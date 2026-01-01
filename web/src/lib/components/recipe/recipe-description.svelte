<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { sanitizeHtmlString } from '$lib/markdown';

	// Į vidų jau paduodam PARUOŠTĄ HTML (pvz. iš renderMarkdown).
	let { html, previewLines = 4 } = $props<{ html: string; previewLines?: number }>();

	let expanded = $state(false);
	const safeHtml = $derived(sanitizeHtmlString(html));

	const collapsedStyle = () =>
		expanded
			? ''
			: `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${previewLines};overflow:hidden;`;
</script>

{#if html?.trim()}
	<section class="grid gap-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-xl font-semibold tracking-tight">Aprašymas</h2>
			<Button variant="outline" size="sm" onclick={() => (expanded = !expanded)}>
				{expanded ? 'Rodyti mažiau' : 'Rodyti daugiau'}
			</Button>
		</div>

		<div class="relative">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="prose prose-zinc max-w-none" style={collapsedStyle()}>{@html safeHtml}</div>

			{#if !expanded}
				<div class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-b from-transparent to-background"></div>
			{/if}
		</div>
	</section>
{/if}
