<script lang="ts">
	import StarIcon from '@lucide/svelte/icons/star';

	let { rating = 4.6, count = 0 } = $props<{ rating?: number; count?: number }>();
	const maxStars = 5;

	function filledStars(r: number) {
		return Math.max(0, Math.min(maxStars, Math.floor(r)));
	}

	function hasPartial(r: number) {
		return r - Math.floor(r) >= 0.25 && r - Math.floor(r) < 0.95;
	}
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
	<div class="text-3xl font-semibold tracking-tight">{rating.toFixed(1)}</div>

	<div class="flex items-center gap-1" aria-label={`Reitingas ${rating.toFixed(1)} iš ${maxStars}`}> 
		{#each Array.from({ length: maxStars }, (_, i) => i) as i (i)}
			{@const full = i < filledStars(rating)}
			{@const partial = !full && i === filledStars(rating) && hasPartial(rating)}
			<StarIcon
				class={full ? 'h-5 w-5 text-zinc-950' : partial ? 'h-5 w-5 text-zinc-950/60' : 'h-5 w-5 text-zinc-950/25'}
				fill={full || partial ? 'currentColor' : 'none'}
				stroke="currentColor"
			/>
		{/each}
	</div>

	{#if count > 0}
		<div class="text-sm text-zinc-600">({count})</div>
	{:else}
		<div class="text-sm text-zinc-600">(atsiliepimai netrukus)</div>
	{/if}
</div>
