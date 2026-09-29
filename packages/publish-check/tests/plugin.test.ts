import { afterEach, describe, expect, it } from "vitest";

import { createPluginTestHost, type PluginTestHost } from "@emdash-cms/plugin-test";
import { SETTINGS_DEFAULTS } from "../src/settings";
import type { PublishCheckReport, PublishCheckSettings } from "../src/types";

const TITLE_SUFFIX = " — EmDash Plugins";

function paragraph(text: string, style = "normal"): Record<string, unknown> {
	return {
		_type: "block",
		_key: `k-${Math.random().toString(36).slice(2)}`,
		style,
		children: [{ _type: "span", _key: "s1", text }],
	};
}

function imageBlock(alt?: string): Record<string, unknown> {
	return {
		_type: "image",
		_key: "i1",
		asset: { _ref: "media-1" },
		...(alt !== undefined ? { alt } : {}),
	};
}

function paragraphWithLink(text: string, href: string): Record<string, unknown> {
	return {
		_type: "block",
		_key: `k-${Math.random().toString(36).slice(2)}`,
		style: "normal",
		markDefs: [{ _type: "link", _key: "l1", href }],
		children: [{ _type: "span", _key: "s1", text, marks: ["l1"] }],
	};
}

/** Broken post: title too long, H1 in body, two images without alt, no internal link. */
function brokenPost() {
	return {
		collection: "posts",
		content: {
			slug: "broken-post",
			data: {
				title: "G".repeat(61),
				excerpt: "x".repeat(130),
				featured_image: {
					$media: { url: "https://example.com/a.jpg", filename: "a.jpg" },
				},
				content: [paragraph("Intro", "h1"), imageBlock(), paragraph("Text")],
			},
		},
		origin: { source: "api" },
	};
}

/** Clean post: fits every check. */
function cleanPost() {
	return {
		collection: "posts",
		content: {
			slug: "clean-post",
			data: {
				title: "A perfectly fine title",
				excerpt: "x".repeat(130),
				featured_image: {
					$media: { url: "https://example.com/b.jpg", alt: "A keyboard", filename: "b.jpg" },
				},
				content: [
					paragraph("Intro"),
					paragraph("Section", "h2"),
					paragraphWithLink("Read this next", "/posts/next"),
				],
			},
		},
		origin: { source: "api" },
	};
}

function formValues(overrides: Partial<PublishCheckSettings> = {}) {
	return { ...SETTINGS_DEFAULTS, ...overrides };
}

let host: PluginTestHost | undefined;

afterEach(async () => {
	await host?.dispose();
	host = undefined;
});

describe("content:beforePublish (sandbox host)", () => {
	it("rejects a broken post with a short Publish Check reason", async () => {
		host = await createPluginTestHost();
		const result = (await host.invokeHook("content:beforePublish", brokenPost())) as {
			cancel: boolean;
			reason: string;
		};
		expect(result.cancel).toBe(true);
		expect(result.reason).toBe(
			"Publish Check: title is 61 chars incl. suffix (max 60) · 1 H1 block in the body (the title is the H1) · 2 images without alt text · 0 internal links (min 1)",
		);
	});

	it("stores a rejected report row", async () => {
		host = await createPluginTestHost();
		await host.invokeHook("content:beforePublish", brokenPost());
		const rows = await host.storage<PublishCheckReport>("reports").list();
		expect(rows).toHaveLength(1);
		const report = rows[0].data;
		expect(report.rejected).toBe(true);
		expect(report.passed).toBe(false);
		expect(report.action).toBe("publish");
		expect(report.mode).toBe("block");
		expect(report.slug).toBe("broken-post");
		expect(report.errors).toHaveLength(4);
	});

	it("allows a clean post and stores a passing report", async () => {
		host = await createPluginTestHost();
		const result = await host.invokeHook("content:beforePublish", cleanPost());
		expect(result).toBeFalsy();
		const rows = await host.storage<PublishCheckReport>("reports").list();
		expect(rows).toHaveLength(1);
		expect(rows[0].data.passed).toBe(true);
		expect(rows[0].data.rejected).toBe(false);
		expect(rows[0].data.warnings).toHaveLength(0);
	});
});

describe("content:beforeSchedule (sandbox host)", () => {
	it("rejects a broken scheduled post and records the action", async () => {
		host = await createPluginTestHost();
		const event = {
			...brokenPost(),
			scheduledAt: "2026-10-01T09:00:00.000Z",
		};
		const result = (await host.invokeHook("content:beforeSchedule", event)) as {
			cancel: boolean;
			reason: string;
		};
		expect(result.cancel).toBe(true);
		const rows = await host.storage<PublishCheckReport>("reports").list();
		expect(rows[0].data.action).toBe("schedule");
	});
});

describe("mode=warn via the Block Kit settings form", () => {
	it("never rejects, but reports the errors", async () => {
		host = await createPluginTestHost();
		const saved = (await host.invokeRoute("admin", {
			type: "form_submit",
			action_id: "save",
			values: formValues({ mode: "warn", titleSuffix: TITLE_SUFFIX }),
		})) as { toast?: { message: string } };
		expect(saved.toast?.message).toBe("Settings saved");

		const result = await host.invokeHook("content:beforePublish", brokenPost());
		expect(result).toBeFalsy();
		const rows = await host.storage<PublishCheckReport>("reports").list();
		const report = rows.find((row) => row.data.slug === "broken-post")?.data;
		expect(report?.mode).toBe("warn");
		expect(report?.rejected).toBe(false);
		expect(report?.passed).toBe(false);
		expect(report?.errors.length).toBeGreaterThan(0);
	});

	it("rejects invalid form values without saving", async () => {
		host = await createPluginTestHost();
		const response = (await host.invokeRoute("admin", {
			type: "form_submit",
			action_id: "save",
			values: { ...formValues(), maxTitle: "not-a-number" },
		})) as { blocks: Array<{ type: string; title?: string }> };
		expect(response.blocks[0]).toMatchObject({ type: "banner", title: "Invalid settings" });
	});
});

describe("Block Kit admin pages", () => {
	it("renders the reports table on page_load /reports", async () => {
		host = await createPluginTestHost();
		await host.invokeHook("content:beforePublish", brokenPost());
		const response = (await host.invokeRoute("admin", {
			type: "page_load",
			page: "/reports",
		})) as {
			blocks: Array<{
				type: string;
				text?: string;
				rows?: Array<Record<string, unknown>>;
			}>;
		};
		expect(response.blocks[0]).toMatchObject({ type: "header", text: "Publish Check" });
		const table = response.blocks.find((block) => block.type === "table");
		expect(table?.rows).toHaveLength(1);
		const row = table?.rows?.[0] as Record<string, string>;
		expect(row.result).toContain("Rejected");
		expect(row.messages).toContain("title is 61 chars incl. suffix (max 60)");
	});

	it("renders an empty state before the first check", async () => {
		host = await createPluginTestHost();
		const response = (await host.invokeRoute("admin", {
			type: "page_load",
			page: "/reports",
		})) as { blocks: Array<{ type: string; title?: string }> };
		expect(response.blocks.some((block) => block.type === "empty")).toBe(true);
	});

	it("renders the settings form with every setting", async () => {
		host = await createPluginTestHost();
		const response = (await host.invokeRoute("admin", {
			type: "page_load",
			page: "/settings",
		})) as {
			blocks: Array<{
				type: string;
				fields?: Array<{ type: string; action_id?: string }>;
			}>;
		};
		const form = response.blocks.find((block) => block.type === "form");
		const actionIds = form?.fields?.map((field) => field.action_id);
		expect(actionIds).toEqual(
			expect.arrayContaining([
				"mode",
				"language",
				"maxTitle",
				"titleSuffix",
				"minDesc",
				"maxDesc",
				"minInternalLinks",
				"siteUrl",
				"checkTitle",
				"checkLinkQuality",
			]),
		);
	});
});
