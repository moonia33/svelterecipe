import type { PageServerLoad } from './$types';

import { error } from '@sveltejs/kit';

import { backendJson } from '$lib/server/backend-api';

type ImageVariant = { avif?: string | null; webp?: string | null } | null;
type ImageSet = {
	original?: string | null;
	thumb?: ImageVariant;
	small?: ImageVariant;
	medium?: ImageVariant;
	large?: ImageVariant;
} | null;

type Named = { id: number; name?: string | null; slug?: string | null };

type IngredientItem = {
	group?: Named | string | null;
	order?: number | null;
	optional?: boolean | null;
	note?: string | null;
	quantity?: number | string | null;
	amount?: number | string | null;
	ingredient?: Named | null;
	unit?: { id: number; name?: string | null; short_name?: string | null } | null;
};

type StepItem = {
	title?: string | null;
	note?: string | null;
	order?: number | null;
	number?: number | null;
	duration?: number | null;
	description?: string | null;
	description_html?: string | null;
	images?: ImageSet;
	video_url?: string | null;
};

type CommentItem = {
	id?: number;
	content?: string;
	created_at?: string;
	user?: { id?: number; username?: string | null } | null;
	is_approved?: boolean;
};

type RecipeDetail = {
	id: number;
	title: string;
	slug: string;
	difficulty?: string | null;
	images?: ImageSet;
	summary?: string | null;
	is_generated?: boolean | null;
	nutrition?: unknown | null;
	nutrition_updated_at?: string | null;
	note?: string | null;
	description?: string | null;
	description_html?: string | null;
	hero_text_html?: string | null;
	preparation_time?: number | null;
	cooking_time?: number | null;
	servings?: number | null;
	published_at?: string | null;
	meta_title?: string | null;
	meta_description?: string | null;
	categories?: Named[] | null;
	cuisines?: Named[] | null;
	cooking_methods?: Named[] | null;
	meal_types?: Named[] | null;
	tags?: Named[] | null;
	ingredients?: IngredientItem[] | null;
	steps?: StepItem[] | null;
	comments?: CommentItem[] | null;
	rating_average?: number | null;
	rating_count?: number | null;
	is_bookmarked?: boolean | null;
	user_rating?: number | null;
};

function difficultyLt(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	const v = value.trim().toLowerCase();
	if (v === 'easy') return 'lengvas';
	if (v === 'medium') return 'vidutinis';
	if (v === 'hard') return 'sunkus';
	return value;
}

function pickImageUrl(images: ImageSet | undefined | null): string | undefined {
	const v = images ?? null;
	const candidates: Array<string | null | undefined> = [
		v?.large?.webp,
		v?.large?.avif,
		v?.medium?.webp,
		v?.medium?.avif,
		v?.small?.webp,
		v?.small?.avif,
		v?.original
	];
	return candidates.find((x) => typeof x === 'string' && x.trim())?.trim();
}

export const load: PageServerLoad = async (event) => {
	const slug = event.params.slug;

	let data: RecipeDetail;
	try {
		data = await backendJson<RecipeDetail>(event, `/recipes/${encodeURIComponent(slug)}`);
	} catch {
		throw error(404, 'Receptas nerastas');
	}

	const prep = data.preparation_time ?? 0;
	const cook = data.cooking_time ?? 0;
	const totalTimeMin = Number.isFinite(prep + cook) && prep + cook > 0 ? prep + cook : undefined;

	const recipe = {
		id: data.id,
		slug: data.slug,
		title: data.title,
		summary: data.summary ?? null,
		isGenerated: data.is_generated ?? false,
		nutrition: data.nutrition ?? null,
		nutritionUpdatedAt: data.nutrition_updated_at ?? null,
		note: data.note ?? null,
		description: data.description ?? null,
		difficulty: difficultyLt(data.difficulty ?? undefined),
		prepTimeMin: data.preparation_time ?? null,
		cookTimeMin: data.cooking_time ?? null,
		totalTimeMin,
		servings: data.servings ?? null,
		publishedAt: data.published_at ?? null,
		metaTitle: data.meta_title ?? null,
		metaDescription: data.meta_description ?? null,
		coverImage: pickImageUrl(data.images)
			? { url: pickImageUrl(data.images), alternativeText: data.title }
			: null,
		// legacy: dar gali būti likęs HTML laukas kai kuriuose įrašuose
		descriptionHtml: data.description_html ?? null,
		heroTextHtml: data.hero_text_html ?? null,
		categories: (data.categories ?? []) as Named[],
		cuisines: (data.cuisines ?? []) as Named[],
		mealTypes: (data.meal_types ?? []) as Named[],
		cookingMethods: (data.cooking_methods ?? []) as Named[],
		tags: (data.tags ?? []) as Named[],
		cuisine: (data.cuisines?.[0] ?? null) as Named | null,
		meal_type: (data.meal_types?.[0] ?? null) as Named | null,
		dish_types: [] as Named[],
		diet_tags: [] as Named[],
		// legacy key (buvo naudota UI)
		tag: (data.tags ?? []) as Named[],
		ingredients: (data.ingredients ?? []) as IngredientItem[],
		steps: (data.steps ?? []) as StepItem[],
		comments: (data.comments ?? []) as CommentItem[],
		ratingAverage: data.rating_average ?? null,
		ratingCount: data.rating_count ?? null,
		isBookmarked: data.is_bookmarked ?? false,
		userRating: data.user_rating ?? null
	};

	return { recipe };
};
