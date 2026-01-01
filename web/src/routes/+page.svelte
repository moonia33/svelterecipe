<script lang="ts">
</script>

<svelte:head>
 	<title>Receptai</title>
 	<meta name="description" content="Receptai, aiški gaminimo eiga ir pirkinių sąrašas." />
 </svelte:head>
 
 <div class="grid gap-6">
 	<header class="grid gap-2">
 		<h1 class="text-3xl font-semibold tracking-tight">Receptai</h1>
 		<p class="text-zinc-700">Sukurta Lietuvos rinkai: aiški gaminimo eiga, checkbox’ai ir pirkinių režimas.</p>
 	</header>
 
 	<div class="grid gap-3 sm:grid-cols-3">
		<a class="rounded-lg border p-4 hover:bg-zinc-50" href="/receptai">
 			<div class="font-medium">Receptų sąrašas</div>
 			<p class="mt-1 text-sm text-zinc-600">Filtrai ir kategorijos pagal modelius.</p>
 		</a>
		<a class="rounded-lg border p-4 hover:bg-zinc-50" href="/parduotuve">
 			<div class="font-medium">Esu parduotuvėje</div>
 			<p class="mt-1 text-sm text-zinc-600">Minimalus blaškymas, aiškūs checkbox’ai.</p>
 		</a>
		<a class="rounded-lg border p-4 hover:bg-zinc-50" href="/paieska">
 			<div class="font-medium">Paieška</div>
 			<p class="mt-1 text-sm text-zinc-600">Unsplash + AI (bus prijungta).</p>
 		</a>
 	</div>
 </div>
