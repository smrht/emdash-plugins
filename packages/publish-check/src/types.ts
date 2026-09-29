export type Lang = "en" | "nl";

export type Severity = "error" | "warning";

/**
 * One finding from one check. Messages are short on purpose: they end up
 * concatenated in the rejection reason (1-500 chars plain text).
 */
export interface CheckFinding {
	id: string;
	severity: Severity;
	en: string;
	nl: string;
}

export interface PublishCheckSettings {
	mode: "block" | "warn";
	language: Lang;
	maxTitle: number;
	titleSuffix: string;
	minDesc: number;
	maxDesc: number;
	minInternalLinks: number;
	siteUrl: string;
	checkTitle: boolean;
	checkDescription: boolean;
	checkH1: boolean;
	checkAlt: boolean;
	checkHeadingOrder: boolean;
	checkInternalLinks: boolean;
	checkLinkQuality: boolean;
}

/**
 * One row in the `reports` storage collection (manifest: index on checkedAt).
 */
export interface PublishCheckReport {
	checkedAt: string;
	collection: string;
	entryId: string | null;
	slug: string | null;
	title: string;
	action: "publish" | "schedule";
	mode: "block" | "warn";
	passed: boolean;
	rejected: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * The shape of event.content on content:beforePublish/beforeSchedule,
 * as EmDash 1.0.1 delivers it (verified against a real event): the
 * effective draft in `data`, the core SEO panel as a sibling in `seo`.
 */
export interface PublishCheckContent {
	data?: unknown;
	seo?: { title?: unknown; description?: unknown };
	slug?: unknown;
	id?: unknown;
}

/**
 * The fields of event.content.data this plugin reads. Everything is
 * defensive: the schema is site-defined, so nothing may assume a shape.
 */
export interface ContentData {
	title?: unknown;
	excerpt?: unknown;
	content?: unknown;
	[key: string]: unknown;
}
