import { describe, expect, it } from "vitest";
import { runChecks, isInternalHref } from "../src/checks";
import { inspectHtml, MAX_HTML_CHARS } from "../src/html";
import { SETTINGS_DEFAULTS } from "../src/settings";

const run = (html: string, isolated = false) => runChecks({data: {title: "Een goede titel", excerpt: "x".repeat(145), content: [{_type: "htmlBlock", html, isolated}]}}, SETTINGS_DEFAULTS);
describe("static HTML and EmDash 1.1 embeds", () => {
	it("reads entities, unquoted attributes and image link labels", () => {
		expect(run('<h2>Verder lezen</h2><a href=/blog><img src=x alt="Blog &amp; uitleg"></a>')).toEqual([]);
	});
	it("ignores comments, scripts, style and template content", () => {
		const r = inspectHtml('<!-- <img> --><script>throw new Error("executed"); "<img>"</script><style>a{}</style><template><img></template><a href=/blog>Blog</a>');
		expect(r.alts).toEqual([]); expect(r.links).toHaveLength(1);
	});
	it("reports HTML images and page-level H1", () => {
		expect(run('<h1>Twee titels</h1><img src=x><a href=/blog>Blog</a>').map(f => f.id)).toEqual(['no-h1','image-alt']);
	});
	it("keeps isolated headings and links separate from the host page", () => {
		expect(run('<h1>Widget</h1><a href=/blog>Blog</a>', true).map(f => f.id)).toEqual(['internal-links']);
	});
	it("allows decorative images only when explicitly marked", () => {
		expect(inspectHtml('<img src=x alt="" role=presentation><img src=y aria-hidden=true>').alts).toEqual([]);
	});
	it("requires HTTPS iframe sources and warns about missing titles", () => {
		expect(run('<iframe src="javascript:alert(1)"></iframe><a href=/blog>Blog</a>').map(f => [f.id,f.severity])).toEqual([['embed-source','error'],['embed-title','warning']]);
		expect(run('<iframe src="https://example.com/embed" title="Voorbeeld"></iframe><a href=/blog>Blog</a>')).toEqual([]);
	});
	it("does not accept credentials or a protocol-relative external link", () => {
		expect(run('<iframe src="https://user:pass@example.com" title="Voorbeeld"></iframe>').map(f => f.id)).toContain('embed-source');
		expect(isInternalHref('//other.example/x','example.com')).toBe(false);
		expect(isInternalHref('/\\other.example/x','example.com')).toBe(false);
	});
	it("rejects oversized markup before parsing and handles deep nesting", () => {
		expect(inspectHtml('x'.repeat(MAX_HTML_CHARS+1)).oversized).toBe(true);
		expect(inspectHtml('<div>'.repeat(1000)+'<a href=/blog>Blog</a>'+'</div>'.repeat(1000)).links[0].text).toBe('Blog');
	});
	it("checks a native iframe block and respects the embed toggle", () => {
		const c={data:{title:'Titel',excerpt:'x'.repeat(145),content:[{_type:'iframe',src:'http://example.com',title:'Demo'}]}};
		expect(runChecks(c,SETTINGS_DEFAULTS).map(f=>f.id)).toContain('embed-source');
		expect(runChecks(c,{...SETTINGS_DEFAULTS,checkEmbeds:false}).map(f=>f.id)).not.toContain('embed-source');
	});
	it("blocks srcdoc even if a valid src is also present",()=>{
		expect(run('<iframe src="https://example.com" srcdoc="&lt;h1&gt;Override&lt;/h1&gt;" title="Test"></iframe><a href=/blog>Blog</a>').map(f=>f.id)).toContain('embed-srcdoc');
	});
	it("bounds the combined HTML budget and the number of blocks",()=>{
		const make=(content:unknown[])=>runChecks({data:{title:'Titel',excerpt:'x'.repeat(145),content}},SETTINGS_DEFAULTS);
		expect(make([{_type:'htmlBlock',html:'x'.repeat(17000)},{_type:'htmlBlock',html:'x'.repeat(17000)}]).map(f=>f.id)).toContain('html-size');
		expect(make(Array.from({length:1001},()=>({_type:'htmlBlock',html:''}))).map(f=>f.id)).toEqual(['inspection-limit']);
	});
	it("handles mismatched deep nesting without recursion and decodes URLs",()=>{
		expect(inspectHtml('<x>'.repeat(4000)+'<a href="https&#58;//example.com">Link &amp; naam</a>'+'</y>'.repeat(4000)).links[0]).toMatchObject({href:'https://example.com',text:'Link & naam'});
	});
});
