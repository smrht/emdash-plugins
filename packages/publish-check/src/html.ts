import { parseDocument } from "./vendor/html-parser.mjs";
import type { PtLink } from "./pt";

export const MAX_HTML_CHARS = 32_768;
export interface HtmlInspection {
	links: Array<PtLink & { isolated: boolean }>;
	alts: Array<string | undefined>;
	headings: string[];
	embeds: Array<{ src?: string; title?: string; srcdoc?: string }>;
	oversized: boolean;
}
type Node = ReturnType<typeof parseDocument>["children"][number];

/** Parse bounded static HTML, never execute JavaScript or fetch a resource. */
export function inspectHtml(html: string, isolated = false): HtmlInspection {
	const result: HtmlInspection = { links: [], alts: [], headings: [], embeds: [], oversized: html.length > MAX_HTML_CHARS };
	if (result.oversized) return result;
	const root = parseDocument(html, {decodeEntities:true, lowerCaseAttributeNames:true, lowerCaseTags:true});
	function text(node: Node): string {
		const queue: Node[] = [node];
		let value = "";
		while (queue.length) {
			const item = queue.pop()!;
			if (item.type === "text") value += item.data;
			else if ("attribs" in item && !["script", "style", "template"].includes(item.name)) {
				if (item.name === "img") value += item.attribs.alt ?? "";
				else queue.push(...item.children.slice().reverse());
			}
		}
		return value;
	}
	// Iterative traversal avoids call-stack overflow on deeply nested markup.
	const pending: Node[] = [...root.children].reverse();
	while (pending.length) {
		const node = pending.pop()!;
		if (!("attribs" in node)) continue;
		const attrs = node.attribs;
		if (["script", "style", "template"].includes(node.name)) continue;
		if (node.name === "a") result.links.push({ href: attrs.href, text: attrs["aria-label"] || text(node), isolated });
		if (node.name === "img" && attrs["aria-hidden"] !== "true" && attrs.role !== "presentation") result.alts.push(attrs.alt);
		if (/^h[1-6]$/.test(node.name) && !isolated) result.headings.push(node.name);
		if (node.name === "iframe") {result.embeds.push({ src: attrs.src, title: attrs.title, srcdoc: attrs.srcdoc });continue;}
		pending.push(...node.children.slice().reverse());
	}
	return result;
}
