import { describe, expect, it } from "vitest";

import { buildReason, isInternalHref, runChecks, siteHostFromUrl } from "../src/checks";
import { SETTINGS_DEFAULTS } from "../src/settings";
import type { ContentData, PublishCheckSettings } from "../src/types";

const SETTINGS: PublishCheckSettings = { ...SETTINGS_DEFAULTS };

const TITLE_SUFFIX = " — EmDash Plugins";

function paragraph(text: string, style = "normal"): Record<string, unknown> {
	return {
		_type: "block",
		_key: `k-${Math.random().toString(36).slice(2)}`,
		style,
		children: [{ _type: "span", _key: "s1", text }],
	};
}

function paragraphWithLink(
	text: string,
	href: string | undefined,
	options: { linkText?: string; key?: string } = {},
): Record<string, unknown> {
	const key = options.key ?? "l1";
	return {
		_type: "block",
		_key: `k-${Math.random().toString(36).slice(2)}`,
		style: "normal",
		markDefs: [{ _type: "link", _key: key, ...(href !== undefined ? { href } : {}) }],
		children: [
			{
				_type: "span",
				_key: "s1",
				text: options.linkText ?? text,
				marks: [key],
			},
		],
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

function goodData(overrides: Partial<ContentData> = {}): ContentData {
	return {
		title: "A perfectly fine title",
		excerpt: "x".repeat(130),
		content: [paragraph("Hello world")],
		...overrides,
	};
}

function run(data: ContentData, settings: PublishCheckSettings = SETTINGS) {
	return runChecks({ data }, settings);
}

function findingIds(data: ContentData, settings: PublishCheckSettings = SETTINGS) {
	return run(data, settings).map((finding) => finding.id);
}

describe("check: title", () => {
	it("rejects a missing title", () => {
		const findings = run({ ...goodData(), title: "   " });
		expect(findings).toContainEqual(
			expect.objectContaining({ id: "title", severity: "error", en: "title is missing" }),
		);
	});

	it("measures the SEO title plus suffix against maxTitle", () => {
		const data = goodData({
			title: "G".repeat(57),
			seo: { description: "d".repeat(130) },
		});
		const settings = { ...SETTINGS, titleSuffix: TITLE_SUFFIX };
		const findings = run(data, settings);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "title",
				severity: "error",
				en: "title is 74 chars incl. suffix (max 60)",
				nl: "titel is 74 tekens incl. suffix (max 60)",
			}),
		);
	});

	it("prefers the SEO title over the plain title", () => {
		const content = {
			data: goodData({ title: "T".repeat(70) }),
			seo: { title: "Short SEO title", description: "d".repeat(130) },
		};
		const settings = { ...SETTINGS, titleSuffix: TITLE_SUFFIX };
		expect(runChecks(content, settings).map((finding) => finding.id)).not.toContain("title");
	});

	it("accepts a title that fits", () => {
		expect(findingIds(goodData())).not.toContain("title");
	});

	it("is skipped when disabled", () => {
		const settings = { ...SETTINGS, checkTitle: false };
		expect(findingIds({ title: "   " }, settings)).not.toContain("title");
	});
});

describe("check: meta-description", () => {
	it("rejects a missing meta description", () => {
		const findings = run({ title: "T" });
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "meta-description",
				severity: "error",
				en: "meta description is missing",
			}),
		);
	});

	it("rejects a too-short meta description", () => {
		const data = goodData({ excerpt: "too short" });
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "meta-description",
				en: "meta description is 9 chars (min 120)",
			}),
		);
	});

	it("rejects a too-long meta description", () => {
		const data = goodData({ excerpt: "x".repeat(156) });
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "meta-description",
				en: "meta description is 156 chars (max 155)",
			}),
		);
	});

	it("falls back to the excerpt when the SEO panel has no description", () => {
		expect(findingIds(goodData())).not.toContain("meta-description");
	});

	it("prefers the SEO panel description", () => {
		const content = {
			data: goodData({ excerpt: "x".repeat(300) }),
			seo: { description: "d".repeat(140) },
		};
		expect(runChecks(content, SETTINGS).map((finding) => finding.id)).not.toContain("meta-description");
	});
});

describe("check: no-h1", () => {
	it("rejects one H1 block in the body", () => {
		const data = goodData({ content: [paragraph("Big", "h1"), paragraph("Text")] });
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "no-h1",
				severity: "error",
				en: "1 H1 block in the body (the title is the H1)",
			}),
		);
	});

	it("counts multiple H1 blocks in one message", () => {
		const data = goodData({
			content: [paragraph("A", "h1"), paragraph("B", "h1")],
		});
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "no-h1",
				en: "2 H1 blocks in the body (the title is the H1)",
			}),
		);
	});

	it("accepts h2 and h3 without h1", () => {
		const data = goodData({
			content: [paragraph("Section", "h2"), paragraph("Sub", "h3")],
		});
		expect(findingIds(data)).not.toContain("no-h1");
	});
});

describe("check: image-alt", () => {
	it("rejects a Portable Text image block without alt", () => {
		const data = goodData({ content: [imageBlock(), paragraph("Text")] });
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "image-alt",
				severity: "error",
				en: "1 image without alt text",
				nl: "1 afbeelding zonder alt-tekst",
			}),
		);
	});

	it("rejects an image field ($media) without alt", () => {
		const data = goodData({
			featured_image: { $media: { url: "https://x/y.jpg", filename: "y.jpg" } },
		});
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({ id: "image-alt", en: "1 image without alt text" }),
		);
	});

	it("accepts whitespace-only alt", () => {
		const data = goodData({ content: [imageBlock("   ")] });
		expect(findingIds(data)).toContain("image-alt");
	});

	it("accepts images with alt text in body and fields", () => {
		const data = goodData({
			content: [imageBlock("A monitor"), paragraph("Text")],
			featured_image: {
				$media: { url: "https://x/y.jpg", alt: "A keyboard", filename: "y.jpg" },
			},
		});
		expect(findingIds(data)).not.toContain("image-alt");
	});
});

describe("check: heading-order", () => {
	it("warns when the first heading is an h3", () => {
		const data = goodData({
			content: [paragraph("Deep", "h3"), paragraph("Text")],
		});
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "heading-order",
				severity: "warning",
				en: "heading levels jump: H3 appears before the first H2",
				nl: "kopniveaus springen: H3 vóór de eerste H2",
			}),
		);
	});

	it("warns once when an h3 follows an h1 before any h2", () => {
		const data = goodData({
			content: [paragraph("Big", "h1"), paragraph("Deep", "h3"), paragraph("Deep again", "h4")],
		});
		const findings = run(data);
		expect(findings.filter((finding) => finding.id === "heading-order")).toHaveLength(1);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "heading-order",
				en: "heading levels jump: H3 appears before the first H2",
			}),
		);
	});

	it("does not warn when an h2 comes first", () => {
		const data = goodData({
			content: [paragraph("Section", "h2"), paragraph("Sub", "h3")],
		});
		expect(findingIds(data)).not.toContain("heading-order");
	});

	it("does not warn on a lone h1 before the first h2", () => {
		const data = goodData({
			content: [paragraph("Big", "h1"), paragraph("Section", "h2")],
		});
		expect(findingIds(data)).not.toContain("heading-order");
	});

	it("ignores non-heading blocks before the first heading", () => {
		const data = goodData({
			content: [paragraph("Intro"), paragraph("Section", "h2"), paragraph("Sub", "h4")],
		});
		expect(findingIds(data)).not.toContain("heading-order");
	});
});

describe("check: internal-links", () => {
	it("errors when there is no internal link", () => {
		const data = goodData({
			content: [paragraphWithLink("External", "https://example.com/page")],
		});
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "internal-links",
				severity: "error",
				en: "0 internal links (min 1)",
				nl: "0 interne links (minimaal 1)",
			}),
		);
	});

	it("counts a relative href as internal", () => {
		const data = goodData({
			content: [paragraphWithLink("Other post", "/posts/other")],
		});
		expect(findingIds(data)).not.toContain("internal-links");
	});

	it("counts an absolute href on the siteUrl host as internal", () => {
		const settings = { ...SETTINGS, siteUrl: "https://example.com" };
		const data = goodData({
			content: [paragraphWithLink("Other post", "https://example.com/posts/other")],
		});
		expect(findingIds(data, settings)).not.toContain("internal-links");
	});

	it("does not count a different host", () => {
		const settings = { ...SETTINGS, siteUrl: "https://example.com" };
		const data = goodData({
			content: [paragraphWithLink("Other site", "https://other.com/posts/other")],
		});
		expect(findingIds(data, settings)).toContain("internal-links");
	});
});

describe("check: link-quality", () => {
	it("warns about a link without href", () => {
		const data = goodData({
			content: [paragraphWithLink("Broken", undefined), paragraphWithLink("Internal", "/posts/x")],
		});
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "link-quality",
				severity: "warning",
				en: "1 link without URL",
			}),
		);
	});

	it("warns about a link without link text", () => {
		const data = goodData({
			content: [paragraphWithLink("real", "/posts/x", { linkText: "" })],
		});
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "link-quality",
				severity: "warning",
				en: "1 link without link text",
			}),
		);
	});

	it("warns about http:// links but not https://", () => {
		const data = goodData({
			content: [
				paragraphWithLink("Insecure", "http://example.com/page"),
				paragraphWithLink("Internal", "/posts/x"),
			],
		});
		const findings = run(data);
		expect(findings).toContainEqual(
			expect.objectContaining({
				id: "link-quality",
				severity: "warning",
				en: "1 insecure http:// link",
				nl: "1 onveilige http://-link",
			}),
		);
	});

	it("stays quiet on clean https and internal links", () => {
		const data = goodData({
			content: [
				paragraphWithLink("Secure", "https://example.com/page"),
				paragraphWithLink("Internal", "/posts/x"),
			],
		});
		expect(findingIds(data)).not.toContain("link-quality");
	});
});

describe("isInternalHref + siteHostFromUrl", () => {
	it("treats root-relative hrefs as internal without a siteUrl", () => {
		expect(isInternalHref("/posts/x", undefined)).toBe(true);
		expect(isInternalHref("https://example.com/x", undefined)).toBe(false);
	});

	it("matches the host of a valid siteUrl", () => {
		expect(siteHostFromUrl("https://example.com:8443/x")).toBe("example.com:8443");
		expect(siteHostFromUrl("not a url")).toBeUndefined();
	});
});

describe("buildReason", () => {
	it("lists only errors, joined with ·", () => {
		const data = goodData({
			title: "G".repeat(61),
			content: [imageBlock(), paragraphWithLink("Internal", "/posts/x")],
		});
		const reason = buildReason(run(data), "en");
		expect(reason).toBe(
			"Publish Check: title is 61 chars incl. suffix (max 60) · 1 image without alt text",
		);
	});

	it("uses the Dutch messages in nl mode", () => {
		const data = goodData({
			title: "   ",
			content: [paragraphWithLink("Intern", "/posts/x")],
		});
		const reason = buildReason(run(data), "nl");
		expect(reason).toBe("Publish Check: titel ontbreekt");
	});

	it("truncates to 500 characters", () => {
		const findings = Array.from({ length: 40 }, (_, index) => ({
			id: "synthetic",
			severity: "error" as const,
			en: `error ${index} ${"x".repeat(30)}`,
			nl: `fout ${index}`,
		}));
		const reason = buildReason(findings, "en");
		expect(reason.length).toBeLessThanOrEqual(500);
		expect(reason.startsWith("Publish Check: ")).toBe(true);
		expect(reason.endsWith("…")).toBe(true);
	});
});
