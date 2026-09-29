import type {
	CheckFinding,
	ContentData,
	Lang,
	PublishCheckContent,
	PublishCheckSettings,
} from "./types";
import {
	allLinks,
	asString,
	bodyBlocks,
	bodyImageAlts,
	blockStyle,
	imageFieldAlts,
} from "./pt";

const HEADING_STYLES = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function nlPlural(count: number, word: string): string {
	return count === 1 ? word : `${word}s`;
}

/** Host part of the configured site URL, or undefined when unset/invalid. */
export function siteHostFromUrl(siteUrl: string): string | undefined {
	try {
		return new URL(siteUrl).host;
	} catch {
		return undefined;
	}
}

/** Internal = relative href on the site, or absolute on the site's host. */
export function isInternalHref(href: string, siteHost: string | undefined): boolean {
	const trimmed = href.trim();
	if (trimmed.startsWith("/")) return true;
	if (siteHost === undefined) return false;
	try {
		const url = new URL(trimmed);
		return (url.protocol === "https:" || url.protocol === "http:") && url.host === siteHost;
	} catch {
		return false;
	}
}

/**
 * Runs every enabled check over the effective draft data and returns the
 * findings in a stable order: errors first per check, checks in brief order.
 */
export function runChecks(
	content: PublishCheckContent,
	settings: PublishCheckSettings,
): CheckFinding[] {
	const data = (content.data ?? {}) as ContentData;
	const seoTitle = asString(content.seo?.title);
	const seoDescription = asString(content.seo?.description);
	const findings: CheckFinding[] = [];

	if (settings.checkTitle) {
		const title = asString(data.title);
		if (title === undefined || title.trim() === "") {
			findings.push({
				id: "title",
				severity: "error",
				en: "title is missing",
				nl: "titel ontbreekt",
			});
		} else {
			const effective = seoTitle ?? title;
			const total = effective.length + settings.titleSuffix.length;
			if (total > settings.maxTitle) {
				findings.push({
					id: "title",
					severity: "error",
					en: `title is ${total} chars incl. suffix (max ${settings.maxTitle})`,
					nl: `titel is ${total} tekens incl. suffix (max ${settings.maxTitle})`,
				});
			}
		}
	}

	if (settings.checkDescription) {
		const raw = seoDescription ?? asString(data.excerpt);
		const description = raw?.trim();
		if (!description) {
			findings.push({
				id: "meta-description",
				severity: "error",
				en: "meta description is missing",
				nl: "meta description ontbreekt",
			});
		} else if (description.length < settings.minDesc) {
			findings.push({
				id: "meta-description",
				severity: "error",
				en: `meta description is ${description.length} chars (min ${settings.minDesc})`,
				nl: `meta description is ${description.length} tekens (min ${settings.minDesc})`,
			});
		} else if (description.length > settings.maxDesc) {
			findings.push({
				id: "meta-description",
				severity: "error",
				en: `meta description is ${description.length} chars (max ${settings.maxDesc})`,
				nl: `meta description is ${description.length} tekens (max ${settings.maxDesc})`,
			});
		}
	}

	if (settings.checkH1) {
		const h1Count = bodyBlocks(data).filter(
			(block) => blockStyle(block) === "h1",
		).length;
		if (h1Count > 0) {
			findings.push({
				id: "no-h1",
				severity: "error",
				en:
					h1Count === 1
						? "1 H1 block in the body (the title is the H1)"
						: `${h1Count} H1 blocks in the body (the title is the H1)`,
				nl:
					h1Count === 1
						? "1 H1-blok in de body (de titel is de H1)"
						: `${h1Count} H1-blokken in de body (de titel is de H1)`,
			});
		}
	}

	if (settings.checkAlt) {
		const alts = [...bodyImageAlts(data), ...imageFieldAlts(data)];
		const missing = alts.filter((alt) => !alt || alt.trim() === "").length;
		if (missing > 0) {
			findings.push({
				id: "image-alt",
				severity: "error",
				en: `${missing} ${nlPlural(missing, "image")} without alt text`,
				nl: `${missing} ${missing === 1 ? "afbeelding" : "afbeeldingen"} zonder alt-tekst`,
			});
		}
	}

	if (settings.checkHeadingOrder) {
		let jumped: string | undefined;
		for (const block of bodyBlocks(data)) {
			const style = blockStyle(block);
			if (style === undefined || !HEADING_STYLES.has(style)) continue;
			if (style === "h2") break;
			if (style !== "h1" && jumped === undefined) jumped = style;
		}
		if (jumped !== undefined) {
			findings.push({
				id: "heading-order",
				severity: "warning",
				en: `heading levels jump: ${jumped.toUpperCase()} appears before the first H2`,
				nl: `kopniveaus springen: ${jumped.toUpperCase()} vóór de eerste H2`,
			});
		}
	}

	if (settings.checkInternalLinks) {
		const siteHost = siteHostFromUrl(settings.siteUrl);
		const internal = allLinks(data).filter(
			(link) =>
				link.href !== undefined && isInternalHref(link.href, siteHost),
		).length;
		if (internal < settings.minInternalLinks) {
			findings.push({
				id: "internal-links",
				severity: "error",
				en: `${internal} internal ${nlPlural(internal, "link")} (min ${settings.minInternalLinks})`,
				nl: `${internal} interne ${internal === 1 ? "link" : "links"} (minimaal ${settings.minInternalLinks})`,
			});
		}
	}

	if (settings.checkLinkQuality) {
		const links = allLinks(data);
		const withoutHref = links.filter(
			(link) => link.href === undefined || link.href.trim() === "",
		).length;
		const withoutText = links.filter(
			(link) =>
				link.href !== undefined &&
				link.href.trim() !== "" &&
				link.text.trim() === "",
		).length;
		const insecure = links.filter(
			(link) =>
				link.href !== undefined &&
				link.href.trim().toLowerCase().startsWith("http://"),
		).length;
		if (withoutHref > 0) {
			findings.push({
				id: "link-quality",
				severity: "warning",
				en: `${withoutHref} ${nlPlural(withoutHref, "link")} without URL`,
				nl: `${withoutHref} ${withoutHref === 1 ? "link" : "links"} zonder URL`,
			});
		}
		if (withoutText > 0) {
			findings.push({
				id: "link-quality",
				severity: "warning",
				en: `${withoutText} ${nlPlural(withoutText, "link")} without link text`,
				nl: `${withoutText} ${withoutText === 1 ? "link" : "links"} zonder linktekst`,
			});
		}
		if (insecure > 0) {
			findings.push({
				id: "link-quality",
				severity: "warning",
				en: `${insecure} insecure http://${nlPlural(insecure, " link")}`,
				nl: `${insecure} onveilige http://-${insecure === 1 ? "link" : "links"}`,
			});
		}
	}

	return findings;
}

/**
 * The rejection reason shown to the editor: short, plain text, 1-500 chars.
 * Only errors are listed; warnings never block.
 */
export function buildReason(findings: CheckFinding[], language: Lang): string {
	const messages = findings
		.filter((finding) => finding.severity === "error")
		.map((finding) => (language === "nl" ? finding.nl : finding.en));
	if (messages.length === 0) return "Publish Check";
	let reason = `Publish Check: ${messages.join(" · ")}`;
	if (reason.length > 500) {
		reason = `${reason.slice(0, 499).trimEnd()}…`;
	}
	return reason;
}
