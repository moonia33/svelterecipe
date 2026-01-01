<script lang="ts">
	import RatingPreview from './rating-preview.svelte';

	let {
		title,
		summary,
		coverUrl,
		coverAlt,
		// kol kas statinis (kaip prašei). vėliau galėsim sujungti su realiais atsiliepimais.
		rating = 4.6,
		ratingCount = 0
	} = $props<{
		title: string;
		summary?: string | null;
		coverUrl?: string | null;
		coverAlt?: string | null;
		rating?: number;
		ratingCount?: number;
	}>();
</script>

<section class="grid gap-6 md:grid-cols-2 md:gap-10">
	<div class="flex flex-col justify-center gap-4 py-6 md:py-12">
		<div>
			<div class="inline-flex bg-zinc-950 px-3 py-1 text-xs font-semibold tracking-widest text-white">
				RECEPTAI
			</div>
		</div>

		<h1 class="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
			{title}
		</h1>

		{#if summary}
			<p class="max-w-prose text-base text-zinc-700 sm:text-lg">{summary}</p>
		{/if}

		<RatingPreview rating={rating} count={ratingCount} />
	</div>

	{#if coverUrl}
		<div class="md:py-6">
			<img
				src={coverUrl}
				alt={coverAlt ?? ''}
				class="h-72 w-full rounded-md border object-cover md:h-full"
				loading="eager"
			/>
		</div>
	{/if}
</section>
