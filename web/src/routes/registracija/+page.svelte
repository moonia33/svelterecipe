<script lang="ts">
	import SignupForm from '$lib/components/signup-form.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	const redirectTo = $derived(page.url.searchParams.get('redirectTo') ?? '/receptai');

	async function onSuccess() {
		await invalidateAll();
		await goto(redirectTo);
	}

	async function goToLogin() {
		const q = new URLSearchParams();
		if (redirectTo && redirectTo !== '/receptai') q.set('redirectTo', redirectTo);
		await goto(`/prisijungimas${q.size ? `?${q.toString()}` : ''}`);
	}
</script>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm">
		<SignupForm on:success={() => void onSuccess()} on:switchToLogin={() => void goToLogin()} />
	</div>
</div>
