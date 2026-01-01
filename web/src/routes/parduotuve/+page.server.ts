import type { PageServerLoad } from './$types';

import { backendJson } from '$lib/server/backend-api';

type Named = { id: number; name?: string | null; slug?: string | null };

type RecipeIngredientComponent = {
	group?: string | null;
	order?: number | null;
	ingredient?: Named | null;
	quantity?: number | string | null;
	unit?: { id: number; name?: string | null; short_name?: string | null } | null;
	optional?: boolean | null;
	note?: string | null;
};

type RecipeListItem = { id: number; title: string; slug: string };

type RecipeListResponse = { total: number; items: RecipeListItem[] };

type RecipeDetailForShop = {
	id: number;
	title: string;
	slug: string;
	ingredients?: RecipeIngredientComponent[] | null;
};

export type ShoppingItem = {
	key: string;
	ingredientId: number | null;
	ingredientName: string;
	unitId: number | null;
	unitName: string | null;
	totalQuantity: number | null;
	optional: boolean;
	note: string | null;
};

function toNumber(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string') {
		const normalized = value.replace(',', '.').trim();
		if (!normalized) return null;
		const n = Number(normalized);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function makeKey(ingredientId: number | null, unitId: number | null, note: string | null): string {
	return `${ingredientId ?? 'x'}:${unitId ?? 'x'}:${note ?? ''}`;
}

function buildShoppingList(ingredients: RecipeIngredientComponent[]): ShoppingItem[] {
	const map = new Map<string, ShoppingItem>();

	for (const item of ingredients) {
		const ingredientId = item.ingredient?.id ?? null;
		const ingredientName = item.ingredient?.name?.trim() || 'Ingredientas';
		const unitId = item.unit?.id ?? null;
		const unitName = item.unit?.name?.trim() || null;
		const note = item.note?.trim() || null;
		const optional = !!item.optional;

		const qty = toNumber(item.quantity);

		const key = makeKey(ingredientId, unitId, note);
		const existing = map.get(key);
		if (!existing) {
			map.set(key, {
				key,
				ingredientId,
				ingredientName,
				unitId,
				unitName,
				totalQuantity: qty,
				optional,
				note
			});
			continue;
		}

		// quantity sum only if both are numbers
		if (existing.totalQuantity !== null && qty !== null) {
			existing.totalQuantity = existing.totalQuantity + qty;
		} else {
			existing.totalQuantity = existing.totalQuantity ?? qty;
		}

		// if any is non-optional, treat as non-optional (more strict)
		existing.optional = existing.optional && optional;
	}

	return [...map.values()].sort((a, b) => {
		const byName = a.ingredientName.localeCompare(b.ingredientName, 'lt');
		if (byName !== 0) return byName;
		return (a.unitName ?? '').localeCompare(b.unitName ?? '', 'lt');
	});
}

export const load = (async (event) => {
	const { url } = event;
	const selectedSlug = url.searchParams.get('receptas') ?? null;

	const recipesRes = await backendJson<RecipeListResponse>(event, '/recipes?limit=100&offset=0');
	const recipes = (recipesRes.items ?? [])
		.map((r) => ({ id: r.id, slug: r.slug, title: r.title ?? r.slug }))
		.sort((a, b) => a.title.localeCompare(b.title, 'lt'));

	let shopping: ShoppingItem[] = [];
	let selectedTitle: string | null = null;

	if (selectedSlug) {
		let selectedRecipe: RecipeDetailForShop | null = null;
		try {
			selectedRecipe = await backendJson<RecipeDetailForShop>(
				event,
				`/recipes/${encodeURIComponent(selectedSlug)}`
			);
		} catch {
			selectedRecipe = null;
		}

		selectedTitle = selectedRecipe?.title ?? null;
		const list = selectedRecipe?.ingredients ?? [];
		if (list.length) {
			shopping = buildShoppingList(list);
		}
	}

	return {
		recipes,
		selectedSlug,
		selectedTitle,
		shopping
	};
}) satisfies PageServerLoad;
