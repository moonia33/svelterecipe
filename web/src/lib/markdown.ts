import { marked } from 'marked';
import sanitizeHtml, { type Transformer } from 'sanitize-html';

const allowedTags = [
	'p',
	'br',
	'hr',
	'em',
	'strong',
	's',
	'code',
	'pre',
	'blockquote',
	'ul',
	'ol',
	'li',
	'h1',
	'h2',
	'h3',
	'h4',
	'a',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td'
];

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
	a: ['href', 'title', 'target', 'rel', 'class'],
	p: ['class'],
	h1: ['class'],
	h2: ['class'],
	h3: ['class'],
	h4: ['class'],
	blockquote: ['class'],
	ul: ['class'],
	ol: ['class'],
	hr: ['class'],
	pre: ['class'],
	code: ['class'],
	table: ['class'],
	tr: ['class'],
	th: ['class', 'align'],
	td: ['class', 'align'],
	thead: ['class'],
	tbody: ['class']
};

function mergeClass(existing: string | undefined, add: string): string {
	const e = (existing ?? '').trim();
	const a = add.trim();
	if (!e) return a;
	if (!a) return e;
	return `${e} ${a}`;
}

function withClass(
	tagName: string,
	attribs: Record<string, string>,
	className: string
): sanitizeHtml.Tag {
	return {
		tagName,
		attribs: {
			...attribs,
			class: mergeClass(attribs.class, className)
		}
	};
}

function sanitize(dirtyHtml: string): string {
	const transformATag: Transformer = (tagName, attribs) => {
		const href = attribs.href ?? '';
		const isExternal = /^https?:\/\//i.test(href);

		return {
			tagName,
			attribs: {
				...attribs,
				class: mergeClass(attribs.class, 'font-medium text-primary underline underline-offset-4'),
				target: isExternal ? '_blank' : attribs.target,
				rel: isExternal ? 'noopener noreferrer' : attribs.rel
			}
		};
	};

	const transformTag = (tag: string, className: string): Transformer => {
		return (tagName, attribs) => withClass(tagName, attribs, className);
	};

	return sanitizeHtml(dirtyHtml, {
		allowedTags,
		allowedAttributes,
		disallowedTagsMode: 'discard',
		transformTags: {
			a: transformATag,
			h1: transformTag('h1', 'scroll-m-20 text-4xl font-extrabold tracking-tight text-balance'),
			h2: transformTag(
				'h2',
				'mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0'
			),
			h3: transformTag('h3', 'mt-8 scroll-m-20 text-2xl font-semibold tracking-tight'),
			h4: transformTag('h4', 'mt-8 scroll-m-20 text-xl font-semibold tracking-tight'),
			p: transformTag('p', 'leading-7 not-first:mt-6'),
			blockquote: transformTag('blockquote', 'mt-6 border-s-2 ps-6 italic'),
			ul: transformTag('ul', 'my-6 ms-6 list-disc [&>li]:mt-2'),
			ol: transformTag('ol', 'my-6 ms-6 list-decimal [&>li]:mt-2'),
			hr: transformTag('hr', 'my-4 md:my-8'),
			pre: transformTag('pre', 'my-6 overflow-x-auto rounded-lg bg-muted p-4'),
			code: transformTag('code', 'rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm'),
			table: transformTag('table', 'my-6 w-full'),
			tr: transformTag('tr', 'm-0 border-t p-0 even:bg-muted'),
			th: transformTag(
				'th',
				'border px-4 py-2 text-start font-bold [&[align=center]]:text-center [&[align=right]]:text-end'
			),
			td: transformTag(
				'td',
				'border px-4 py-2 text-start [&[align=center]]:text-center [&[align=right]]:text-end'
			)
		}
	});
}

export function sanitizeHtmlString(html: string | null | undefined): string {
	const text = (html ?? '').trim();
	if (!text) return '';
	return sanitize(text);
}

export function renderMarkdown(markdown: string | null | undefined): string {
	const text = (markdown ?? '').trim();
	if (!text) return '';

	marked.setOptions({
		gfm: true,
		breaks: true
	});

	const html = marked.parse(text) as string;
	return sanitize(html);
}

// Rich text "blocks" minimal renderis: paverčia į paprastus paragrafus.
export type RichTextBlock = { type: string; children?: Array<{ text?: string }> };

export function renderBlocks(blocks: RichTextBlock[] | null | undefined): string {
	if (!blocks?.length) return '';
	const html = blocks
		.map((b) => {
			const text = (b.children ?? []).map((c) => c.text ?? '').join('');
			const safe = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
			return safe.trim() ? `<p class="leading-7 not-first:mt-6">${safe}</p>` : '';
		})
		.join('');
	return html;
}
