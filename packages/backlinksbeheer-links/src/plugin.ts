import type {PluginContext,SandboxedPlugin} from 'emdash/plugin';
import type {Block,BlockResponse} from '@emdash-cms/blocks';
import {z} from 'zod';
import {classifyStatus,extractLinks,outboundUrl} from './checks';

type Row={url:string;status:string;http:number|null;checkedAt:string;location?:string};
type Scan={collection:string;id:string;title:string;urls:string[];rows:Row[];limited:boolean;started:string};
const inputSchema=z.object({type:z.enum(['page_load','form_submit','block_action']),action_id:z.string().optional(),value:z.unknown().optional(),values:z.record(z.unknown()).optional()});
const slug=z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
async function render(ctx:PluginContext,extra:Block[]=[],toast?:BlockResponse['toast']):Promise<BlockResponse>{
 const cached=await ctx.kv.get<Array<{slug:string;label:string}>>('collections');
 const scan=await ctx.kv.get<Scan>('scan');
 const blocks:Block[]=[{type:'header',text:'Backlinksbeheer Link Check'},{type:'section',text:'Check outbound links in a saved entry. Each result shows the HTTP response and time. A blocked or unavailable website is reported as unknown.'},{type:'actions',elements:[{type:'button',action_id:'collections',label:'Load content collections'},{type:'link',label:'Backlinksbeheer monitoring',target:{kind:'external',url:'https://backlinksbeheer.nl'}}]}];
 if(cached?.length)blocks.push({type:'form',block_id:'collection',fields:[{type:'select',action_id:'collection',label:'Content collection',options:cached.map(c=>({label:c.label,value:c.slug})),initial_value:cached[0].slug}],submit:{label:'Choose an entry',action_id:'entries'}});
 blocks.push(...extra);
 if(scan){
  blocks.push({type:'fields',fields:[{label:'Entry',value:scan.title},{label:'Links checked',value:`${scan.rows.length} of ${scan.urls.length}`},{label:'Saved entry',value:scan.collection}]});
  if(scan.limited)blocks.push({type:'banner',variant:'alert',title:'This entry exceeded the inspection limit. Results cover at most 200 distinct outbound links and bounded static content.'});
  if(scan.rows.length)blocks.push({type:'table',columns:[{key:'url',label:'Link'},{key:'status',label:'Observation'},{key:'http',label:'HTTP'},{key:'location',label:'Redirect target'},{key:'checkedAt',label:'Checked at'}],rows:scan.rows.map(r=>({...r,http:r.http??'—'})),page_action_id:'results'});
  if(scan.rows.length<scan.urls.length)blocks.push({type:'actions',elements:[{type:'button',action_id:'next',label:'Check next two links',value:scan.started,style:'primary'}]});
  else blocks.push({type:'section',text:scan.urls.length?'Check finished. Missing means HTTP 404 or 410 was observed, not that a link is permanently broken.':'No supported public outbound links were found in this saved entry.'});
 }
 blocks.push({type:'context',text:'Only saved Portable Text links and static HTML anchors are inspected. No JavaScript execution, whole-site crawl, link edits, account sync or background checks. Requests go directly to linked websites through the EmDash network bridge. Results stay in this site’s plugin storage. Up to two different hosts per step, with a one-minute pause before contacting the same host again.'});
 return{blocks,...(toast?{toast}:{})};
}
const plugin:SandboxedPlugin={routes:{admin:{permission:'plugins:manage',handler:async(routeCtx,ctx)=>{
 let siteUrl:string;try{siteUrl=new URL(ctx.site.url).href;}catch{siteUrl=new URL(routeCtx.request.url).origin;}
 try{
  const input=inputSchema.parse(routeCtx.input);
  if(input.type==='page_load')return render(ctx);
  if(input.action_id==='collections'){
   if(!ctx.schema)throw new Error('Content schema permission is unavailable.');
   const collections=(await ctx.schema.listCollections()).filter(c=>!c.hidden).map(c=>({slug:c.slug,label:c.label}));
   await ctx.kv.set('collections',collections);return render(ctx);
  }
  if(input.action_id==='entries'){
   const collection=slug.parse(input.values?.collection);
   if(!ctx.content)throw new Error('Content permission is unavailable.');
   const result=await ctx.content.list(collection,{limit:50,...(input.type==='block_action'&&typeof input.value==='string'?{cursor:input.value}:{})});
   const options=result.items.map(item=>({label:String(item.data.title??item.slug??item.id).slice(0,100),value:`${collection}:${item.id}`}));
   if(!options.length)return render(ctx,[{type:'empty',title:'No saved entries',description:'Save an entry in this collection first.'}]);
   await ctx.kv.set('selected-collection',collection);
   const extra:Block[]=[{type:'form',block_id:'entry',fields:[{type:'select',action_id:'id',label:'Saved entry',options,initial_value:options[0].value}],submit:{label:'Inspect saved links',action_id:'inspect'}}];
   // Expose a cursor only when a collection has more entries; no silent truncation.
   if(result.hasMore&&result.cursor)extra.push({type:'actions',elements:[{type:'button',action_id:'more-entries',label:'Next entries',value:{collection,cursor:result.cursor}}]});
   return render(ctx,extra);
  }
  if(input.action_id==='more-entries'){
   const value=z.object({collection:slug,cursor:z.string().max(2000)}).parse(input.value);
   const result=await ctx.content!.list(value.collection,{limit:50,cursor:value.cursor});
   await ctx.kv.set('selected-collection',value.collection);
   const options=result.items.map(item=>({label:String(item.data.title??item.slug??item.id).slice(0,100),value:`${value.collection}:${item.id}`}));
   const extra:Block[]=options.length?[{type:'form',block_id:'entry',fields:[{type:'select',action_id:'id',label:'Saved entry',options,initial_value:options[0].value}],submit:{label:'Inspect saved links',action_id:'inspect'}}]:[];
   if(result.hasMore&&result.cursor)extra.push({type:'actions',elements:[{type:'button',action_id:'more-entries',label:'Next entries',value:{collection:value.collection,cursor:result.cursor}}]});
   return render(ctx,extra);
  }
  if(input.action_id==='inspect'){
   const choice=z.string().regex(/^[a-zA-Z0-9_-]{1,80}:[a-zA-Z0-9_-]{1,150}$/).parse(input.values?.id);
   const [collection,id]=choice.split(':');
   if(!ctx.content)throw new Error('Content permission is unavailable.');
   const entry=await ctx.content.get(collection,id);
   if(!entry)throw new Error('This saved entry no longer exists.');
   const links=extractLinks(entry.data,siteUrl);
   await ctx.kv.set('scan',{collection,id,title:String(entry.data.title??entry.slug??entry.id),...links,rows:[],started:crypto.randomUUID()} satisfies Scan);
   return render(ctx);
  }
  if(input.action_id==='next'){
   if(!ctx.http)throw new Error('Network permission is unavailable.');
   const version=await ctx.kv.getVersioned<Scan>('scan');
   if(!version||version.value.started!==input.value)throw new Error('This check is stale. Reload the page.');
   const lock=await ctx.kv.compareAndSet(`batch:${version.value.started}:${version.value.rows.length}`,null,{at:Date.now()});
   if(!lock.applied)throw new Error('This batch already started. Reload before checking again.');
   const scan=version.value;
   const hosts=await ctx.kv.get<Record<string,number>>('hosts')??{};
   let checked=0;
   for(const url of scan.urls.slice(scan.rows.length,scan.rows.length+2)){
    const target=outboundUrl(url,siteUrl);if(!target)throw new Error('A stored link is no longer eligible. Start a new inspection.');
    const host=new URL(target).hostname;
    if(Date.now()-(hosts[host]??0)<60000)break;
    hosts[host]=Date.now();await ctx.kv.set('hosts',Object.fromEntries(Object.entries(hosts).filter(([,t])=>Date.now()-t<60000)));
    let status='unknown',http:number|null=null,location:string|undefined;
    try{
     let response=await ctx.http.fetch(target,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(4500),headers:{'User-Agent':'Backlinksbeheer-EmDash-LinkCheck/0.1 (+https://backlinksbeheer.nl)'}});
     if(response.status===405||response.status===501)response=await ctx.http.fetch(target,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(4500)});
     http=response.status;status=classifyStatus(http);
     const raw=response.headers.get('location');
     if(raw){try{const next=new URL(raw,target);if(outboundUrl(next.href,siteUrl))location=next.href;}catch{/* An invalid redirect remains an observed redirect. */}}
    }catch{/* Network refusal, timeout or bridge rejection is not evidence of a dead page. */}
    scan.rows.push({url:target,status,http,checkedAt:new Date().toISOString(),...(location?{location}:{})});checked++;
   }
   const saved=await ctx.kv.compareAndSet('scan',version.revision,scan);
   if(!saved.applied)throw new Error('Another inspection replaced this one. Reload to see the current results.');
   if(!checked)await ctx.kv.compareAndDelete(`batch:${version.value.started}:${version.value.rows.length}`,lock.revision);
   return render(ctx,[],checked?undefined:{type:'info',message:'Wait one minute before checking another link on this host.'});
  }
  return render(ctx);
 }catch(error){return render(ctx,[],{type:'error',message:error instanceof z.ZodError?'Choose a valid collection or saved entry.':error instanceof Error?error.message:'The check could not be completed.'});}
}}}};
export default plugin;
