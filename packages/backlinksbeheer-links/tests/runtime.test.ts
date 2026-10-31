import {afterEach,it,expect} from 'vitest';
import {createPluginRuntimeTestHost,type PluginRuntimeTestHost} from '@emdash-cms/plugin-test';
let host:PluginRuntimeTestHost|undefined;
afterEach(async()=>{await host?.dispose();host=undefined;});
it('checks saved outbound links even before the site URL is configured',async()=>{
 host=await createPluginRuntimeTestHost({site:{url:''}});
 await host.fixtures.collection({slug:'posts',label:'Posts',fields:[{slug:'title',type:'text',label:'Title'},{slug:'body',type:'json',label:'Body'}]});
 const entry=await host.fixtures.content('posts',{slug:'fixture',data:{title:'A real saved fixture',body:[{_type:'block',markDefs:[{_type:'link',href:'https://example.org/ok'},{_type:'link',href:'https://other.org/missing'},{_type:'link',href:'https://blocked.org/blocked'}]}]}});
 await host.admin.loadPage('/links');
 const collections=await host.admin.act('/links','collections');expect(collections.toast?.type).not.toBe('error');
 const entries=await host.admin.submit('/links','entries',{collection:'posts'});expect(JSON.stringify(entries)).toContain('A real saved fixture');
 const inspected=await host.admin.submit('/links','inspect',{id:`posts:${entry.id}`});expect(inspected.toast?.type).not.toBe('error');expect(host.http.requests()).toHaveLength(0);
 await host.http.respond('https://example.org/ok',new Response(null,{status:200}));
 await host.http.respond('https://other.org/missing',new Response(null,{status:404}));
 const scan=(await host.inspect.kv.get<any>('scan'))!;
 const checked=await host.admin.act('/links','next',{value:scan.started});expect(checked.toast?.type).not.toBe('error');
 const saved=(await host.inspect.kv.get<any>('scan'))!;expect(saved.rows.map((r:any)=>r.status)).toEqual(['ok','missing']);expect(saved.rows.every((r:any)=>!Number.isNaN(Date.parse(r.checkedAt)))).toBe(true);
 await host.http.respond('https://blocked.org/blocked',new Response(null,{status:403}));
 await host.admin.act('/links','next',{value:scan.started});
 expect((await host.inspect.kv.get<any>('scan')).rows[2].status).toBe('unknown');
});
it('requires an admin account on the actual private route',async()=>{
 host=await createPluginRuntimeTestHost();
 const anonymous=await host.actions.routes.request('admin',{method:'POST',body:{type:'page_load',page:'/links'}});
 expect([401,403]).toContain(anonymous.status);
 const author=await host.fixtures.user({email:'author@example.org',role:'author'});
 const denied=await host.actions.routes.request('admin',{method:'POST',body:{type:'page_load',page:'/links'},user:author});expect(denied.status).toBe(403);
});

it('a polite same-host pause can be resumed instead of permanently locking the batch',async()=>{
 host=await createPluginRuntimeTestHost({site:{url:'https://mysite.org'}});
 await host.fixtures.plugin.kv('scan',{collection:'posts',id:'fixture',title:'Fixture',urls:['https://example.org/two'],rows:[],limited:false,started:'pause-fixture'});
 await host.fixtures.plugin.kv('hosts',{'example.org':Date.now()});
 const pause=await host.admin.act('/links','next',{value:'pause-fixture'});expect(pause.toast?.type).toBe('info');expect(host.http.requests()).toHaveLength(0);
 await host.fixtures.plugin.kv('hosts',{});
 await host.http.respond('https://example.org/two',new Response(null,{status:200}));
 await host.admin.act('/links','next',{value:'pause-fixture'});
 expect((await host.inspect.kv.get<any>('scan')).rows).toHaveLength(1);
});

it('renders a real host-validated warning when inspection is limited',async()=>{
 host=await createPluginRuntimeTestHost({site:{url:'https://mysite.org'}});
 await host.fixtures.collection({slug:'posts',label:'Posts',fields:[{slug:'title',type:'text',label:'Title'},{slug:'body',type:'json',label:'Body'}]});
 const entry=await host.fixtures.content('posts',{slug:'large-fixture',data:{title:'Large fixture',body:Array.from({length:201},(_,i)=>({href:`https://example.org/page/${i}`}))}});
 const result=await host.admin.submit('/links','inspect',{id:`posts:${entry.id}`});expect(result.toast?.type).not.toBe('error');expect(result.blocks.some(b=>b.type==='banner')).toBe(true);
 expect((await host.inspect.kv.get<any>('scan')).urls).toHaveLength(200);
});
