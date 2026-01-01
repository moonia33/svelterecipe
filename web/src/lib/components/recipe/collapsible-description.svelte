<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { sanitizeHtmlString } from '$lib/markdown';

	let {
		heading = 'Aprašymas',
		html,
		collapsedLines = 4
	} = $props<{
		heading?: string;
		html: string;
		collapsedLines?: 3 | 4 | 5 | number;
	}>();

	let expanded = $state(false);

	const safeHtml = $derived(sanitizeHtmlString(html));

	const clampedStyle = () => {
		const lines = Math.max(1, Math.min(10, Math.floor(collapsedLines)));
		return `display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:${lines}; overflow:hidden;`;
	};
</script>

{#if html}
	<section class="grid gap-3">
		<div class="flex items-center justify-between gap-3">
			<h2 class="text-xl font-semibold tracking-tight">{heading}</h2>
			<Button variant="outline" size="sm" onclick={() => (expanded = !expanded)}>
				{#if expanded}
					Sutraukti
				{:else}
					Skaityti daugiau
				{/if}
			</Button>
		</div>

		<div class="relative">
			<div
				class="max-w-none"
				style={!expanded ? clampedStyle() : undefined}
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html safeHtml}
			</div>

			{#if !expanded}
				<div class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent"></div>
			{/if}
		</div>
	</section>
{/if}
