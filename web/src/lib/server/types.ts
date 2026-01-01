export type Media = {
	url?: string;
	alternativeText?: string;
	caption?: string;
	width?: number;
	height?: number;
	formats?: {
		thumbnail?: { url?: string; width?: number; height?: number };
		small?: { url?: string; width?: number; height?: number };
		medium?: { url?: string; width?: number; height?: number };
		large?: { url?: string; width?: number; height?: number };
	} | null;
};

export type StepBlock = {
	type: string;
	children?: Array<{ text?: string }>;
};

export type Step = {
	title?: string;
	description?: StepBlock[] | string | null;
	note?: string;
	timerMin?: number;
	number?: number;
	images?: Media[] | null;
};

export type Ingredient = {
	id: number;
	documentId?: string;
	name?: string;
	slug?: string;
	createdAt?: string;
	updatedAt?: string;
	publishedAt?: string;
};

export type Unit = {
	id: number;
	documentId?: string;
	name?: string;
	slug?: string;
	createdAt?: string;
	updatedAt?: string;
	publishedAt?: string;
};

export type RecipeIngredient = {
	id?: number;
	group?: string;
	order?: number;
	ingredient?: Ingredient | null;
	quantity?: number | string;
	unit?: Unit | null;
	optional?: boolean | null;
	note?: string | null;
};

export type RecipeAttributes = {
	id?: number;
	documentId?: string;
	title?: string;
	note?: string;
	description?: string;
	slug: string;
	ingradientsList?: RecipeIngredient[];
	coverImage?: Media | null;
	summary?: string;
	servings?: number;
	prepTimeMin?: number;
	cookTimeMin?: number;
	totalTimeMin?: number;
	difficulty?: 'lengvas' | 'vidutinis' | 'sunkus';
	step?: Step[];
	meal_type?: { id: number; name?: string; slug?: string } | null;
	dish_types?: Array<{ id: number; name?: string; slug?: string }>;
	diet_tags?: Array<{ id: number; name?: string; slug?: string }>;
	cuisine?: { id: number; name?: string; slug?: string } | null;
	createdAt?: string;
	updatedAt?: string;
	publishedAt?: string;
};
