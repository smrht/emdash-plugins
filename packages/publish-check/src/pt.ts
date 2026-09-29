import type { ContentData } from "./types";

/**
 * Defensive readers for the content fields Publish Check inspects.
 * The Portable Text shapes follow EmDash's PortableTextBlock types:
 * text blocks with `style` and `markDefs`, image blocks with a top-level
 * `alt`, gallery blocks with per-image `alt`, and image fields as
 * `{ $media: { url, alt, filename } }` values.
 */

export function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

export function bodyBlocks(data: ContentData): Array<Record<string, unknown>> {
	const body = data.content;
	if (!Array.isArray(body)) return [];
	return body.filter(
		(block): block is Record<string, unknown> =>
			typeof block === "object" && block !== null,
	);
}

export function blockStyle(block: Record<string, unknown>): string | undefined {
	return asString(block.style);
}

export interface PtLink {
	href: string | undefined;
	text: string;
}

/** Links declared in a text block's markDefs, with their visible text. */
export function blockLinks(block: Record<string, unknown>): PtLink[] {
	const defs = Array.isArray(block.markDefs) ? block.markDefs : [];
	const children = Array.isArray(block.children) ? block.children : [];
	const links: PtLink[] = [];
	for (const def of defs) {
		if (typeof def !== "object" || def === null) continue;
		const record = def as Record<string, unknown>;
		if (record._type !== "link") continue;
		const key = asString(record._key);
		const href = asString(record.href);
		let text = "";
		for (const child of children) {
			if (typeof child !== "object" || child === null) continue;
			const span = child as Record<string, unknown>;
			const marks = Array.isArray(span.marks) ? span.marks : [];
			if (key !== undefined && marks.includes(key)) {
				text += asString(span.text) ?? "";
			}
		}
		links.push({ href, text });
	}
	return links;
}

export function allLinks(data: ContentData): PtLink[] {
	const links: PtLink[] = [];
	for (const block of bodyBlocks(data)) {
		links.push(...blockLinks(block));
	}
	return links;
}

/** Alt values of every image inside the Portable Text body. */
export function bodyImageAlts(data: ContentData): Array<string | undefined> {
	const alts: Array<string | undefined> = [];
	for (const block of bodyBlocks(data)) {
		if (block._type === "image") {
			alts.push(imageAlt(block));
		} else if (block._type === "gallery" && Array.isArray(block.images)) {
			for (const image of block.images) {
				if (typeof image === "object" && image !== null) {
					alts.push(imageAlt(image as Record<string, unknown>));
				}
			}
		}
	}
	return alts;
}

function imageAlt(block: Record<string, unknown>): string | undefined {
	const direct = asString(block.alt);
	if (direct !== undefined) return direct;
	if (
		typeof block.$media === "object" &&
		block.$media !== null
	) {
		const alt = asString((block.$media as Record<string, unknown>).alt);
		if (alt !== undefined) return alt;
	}
	if (
		typeof block.asset === "object" &&
		block.asset !== null
	) {
		return asString((block.asset as Record<string, unknown>).alt);
	}
	return undefined;
}

/** Alt values of every image-typed field (`{ $media: ... }`) on the entry. */
export function imageFieldAlts(data: ContentData): Array<string | undefined> {
	const alts: Array<string | undefined> = [];
	for (const [key, value] of Object.entries(data)) {
		if (key === "content") continue;
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			continue;
		}
		const record = value as Record<string, unknown>;
		const media = record.$media;
		if (typeof media === "object" && media !== null) {
			alts.push(asString((media as Record<string, unknown>).alt));
			continue;
		}
		// Publish/schedule events expose image fields expanded with the
		// stored media metadata, so the alt may live directly on the value.
		alts.push(asString(record.alt));
	}
	return alts;
}
