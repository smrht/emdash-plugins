import {afterEach, describe, expect, it} from "vitest";
import {createPluginRuntimeTestHost, type PluginRuntimeTestHost} from "@emdash-cms/plugin-test";
import {SETTINGS_DEFAULTS} from "../src/settings";
let host: PluginRuntimeTestHost | undefined;
afterEach(async()=>{await host?.dispose();host=undefined;});
async function draft(html:string) {
	host=await createPluginRuntimeTestHost();
	await host.fixtures.collection({slug:"posts",label:"Posts",fields:[{slug:"title",label:"Title",type:"text"},{slug:"excerpt",label:"Excerpt",type:"text"},{slug:"content",label:"Content",type:"portableText"}]});
	const created=await host.actions.content.create("posts", {slug:"proof",data:{title:"Een echte runtimecontrole",excerpt:"x".repeat(145),content:[{_type:"htmlBlock",_key:"html",html,isolated:false}]}});
	expect(created.success,JSON.stringify(created)).toBe(true);
	return (created as any).data.item.id as string;
}
describe("real publication and scheduling boundaries",()=>{
	it("blocks a broken HTML image at real publish",async()=>{
		const id=await draft('<img src=x><a href=/blog>Blog</a>');
		const result=await host!.actions.content.publish('posts',id);
		expect(result.success).toBe(false);
		expect(JSON.stringify(result)).toContain('alt');
		const saved=await host!.inspect.content.get('posts',id);
		expect(saved?.status).not.toBe('published');
	});
	it("publishes valid static HTML",async()=>{
		const id=await draft('<h2>Uitleg</h2><img src=x alt="Voorbeeld"><a href=/blog>Blog</a>');
		const result=await host!.actions.content.publish('posts',id);
		expect(result.success).toBe(true);
		expect((await host!.inspect.content.get('posts',id))?.status).toBe('published');
	});
	it("rejects an insecure embed at real schedule",async()=>{
		const id=await draft('<iframe src="http://example.com" title="Demo"></iframe><a href=/blog>Blog</a>');
		const result=await host!.actions.content.schedule('posts',id,'2099-10-02T10:00:00Z');
		expect(result.success).toBe(false);
		expect(JSON.stringify(result)).toContain('HTTPS');
	});
	it("schedules valid HTML in block mode and persists scheduled state",async()=>{
		const id=await draft('<h2>Uitleg</h2><a href=/blog>Blog</a><iframe src="https://example.org/embed" title="Voorbeeld"></iframe>');
		const result=await host!.actions.content.schedule('posts',id,'2099-10-02T10:00:00Z');
		expect(result.success,JSON.stringify(result)).toBe(true);
		expect((await host!.inspect.content.get('posts',id))?.status).toBe('scheduled');
	});
	it("schedules valid content and allows errors in warn mode",async()=>{
		const id=await draft('<img src=x><a href=/blog>Blog</a>');
		await host!.admin.submit('/settings','save',{...SETTINGS_DEFAULTS,mode:'warn'});
		expect((await host!.actions.content.schedule('posts',id,'2099-10-02T10:00:00Z')).success).toBe(true);
	});
});
