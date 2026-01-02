<script lang="ts">
	import SignupForm from '$lib/components/signup-form.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') ?? '/receptai');

	async function onSuccess() {
		await invalidateAll();
		const target = new URL(redirectTo, 'http://local');
		const href = `${target.pathname}${target.search}${target.hash}`;
		await goto(resolve(...([href] as unknown as Parameters<typeof resolve>)));
	}

	async function goToLogin() {
		const q = new SvelteURLSearchParams();
		if (redirectTo && redirectTo !== '/receptai') q.set('redirectTo', redirectTo);
		const href = `/auth/prisijungimas${q.size ? `?${q.toString()}` : ''}`;
		await goto(resolve(...([href] as unknown as Parameters<typeof resolve>)));
	}
</script>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm">
		<SignupForm on:success={() => void onSuccess()} on:switchToLogin={() => void goToLogin()} />
	</div>
</div>
