import {afterEach,it,expect} from 'vitest';
// @ts-expect-error virtual module provided by the Cloudflare test pool
import {env} from 'cloudflare:test';
import {createPluginRuntimeTestHost,type PluginRuntimeTestHost} from '@emdash-cms/plugin-test';
let host:PluginRuntimeTestHost|undefined;
afterEach(async()=>{await host?.dispose();host=undefined;});
const id='3ae36160-d13e-4a58-a135-e835fc7cf0a6';
const endpoint=`https://ulazai.com/api/v1/generate/${id}/`;
it('renders the actual admin page and rejects a missing key without a request',async()=>{
 host=await createPluginRuntimeTestHost();
 const page=await host.admin.loadPage('/images');expect(JSON.stringify(page)).toContain('UlazAI Media');
 const result=await host.admin.act('/images','catalog');
 expect(result.toast?.type).toBe('error');expect(JSON.stringify(result)).toContain('API key');expect(host.http.requests()).toHaveLength(0);
});
it('stores the key encrypted and never reflects it into the admin response',async()=>{
 host=await createPluginRuntimeTestHost();
 expect(await host.actions.plugin.updateSettings({apiKey:'fixture-secret-never-render'})).toMatchObject({success:true});
 expect(JSON.stringify(await host.inspect.settings.raw('apiKey'))).not.toContain('fixture-secret-never-render');
 const page=await host.admin.loadPage('/images');expect(JSON.stringify(page)).not.toContain('fixture-secret-never-render');
});
it('imports bytes once even when the site URL has not been configured',async()=>{
 host=await createPluginRuntimeTestHost({site:{url:''}});
 expect(await host.actions.plugin.updateSettings({apiKey:'fixture-secret'})).toMatchObject({success:true});
 const url='https://cdn.ulazai.com/existing.png';
 await host.http.respond(endpoint,Response.json({success:true,data:{generation_id:id,status:'completed',image_url:url,credits_used:7}}));
 const existing=await host.admin.submit('/images','existing',{id});expect(existing.toast?.type,JSON.stringify(existing.toast)).not.toBe('error');
 await host.http.respond(endpoint,Response.json({success:true,data:{generation_id:id,status:'completed',image_url:url,credits_used:7}}));
 // Valid 1x1 PNG, not merely a declared image MIME type.
 const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
 await host.http.respond(url,new Response(png,{headers:{'Content-Type':'image/png'}}));
 const imported=await host.admin.act('/images','import',{value:id});expect(imported.toast?.type).not.toBe('error');
 const saved=await host.inspect.kv.get<{mediaId:string;storageKey:string}>(`import:${id}`);expect(saved?.mediaId).toBeTruthy();
 // The sandbox bridge writes R2; the host's mediaBytes inspector uses its separate in-memory adapter.
 const stored=await env.MEDIA.get(saved!.storageKey);expect(stored).toBeTruthy();
 expect(Array.from(new Uint8Array(await stored.arrayBuffer()))).toEqual(Array.from(png));
 const count=host.http.requests().length;
 const again=await host.admin.act('/images','import',{value:id});expect(JSON.stringify(again)).toContain('Already saved');expect(host.http.requests()).toHaveLength(count);
});
it('cannot charge twice with the same confirmation',async()=>{
 host=await createPluginRuntimeTestHost();expect(await host.actions.plugin.updateSettings({apiKey:'fixture-secret'})).toMatchObject({success:true});
 await host.fixtures.plugin.kv('catalog',[{slug:'gpt_image_25_flare',label:'GPT Image 2.5 Flare',aspect_ratios:['16:9'],qualities:['1K'],credits_estimate:{'1K':7}}]);
 const prepared=await host.admin.submit('/images','prepare',{prompt:'An editorial photograph of a bicycle',model:'gpt_image_25_flare',size:'16:9',quality:'1K'});
 expect(prepared.toast?.type).not.toBe('error');
 const token=(prepared.blocks.find(b=>b.type==='actions'&&b.elements.some(e=>e.type==='button'&&e.action_id==='generate')) as any).elements[0].value;
 await host.http.respond('https://ulazai.com/api/v1/generate/',Response.json({success:true,data:{generation_id:id,status:'processing',credits_used:7}},{status:201}));
 const result=await host.admin.act('/images','generate',{value:token});expect(result.toast?.type,JSON.stringify(result.toast)).not.toBe('error');
 const count=host.http.requests().length;
 const again=await host.admin.act('/images','generate',{value:token});expect(again.toast?.type).toBe('error');expect(host.http.requests()).toHaveLength(count);
 expect(host.http.requests().filter(r=>r.method==='POST')).toHaveLength(1);
});
