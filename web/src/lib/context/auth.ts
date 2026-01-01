import { getContext, setContext } from 'svelte';

export type AuthDialogView = 'login' | 'signup' | 'forgot';

export type AuthContext = {
	open: (view?: AuthDialogView) => void;
	close: () => void;
};

const AUTH_CONTEXT_KEY = Symbol('auth-context');

export function setAuthContext(ctx: AuthContext): void {
	setContext(AUTH_CONTEXT_KEY, ctx);
}

export function getAuthContext(): AuthContext | null {
	return getContext<AuthContext | null>(AUTH_CONTEXT_KEY);
}
