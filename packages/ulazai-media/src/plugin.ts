import type { PluginContext, SandboxedPlugin } from 'emdash/plugin';
import type { Block, BlockResponse } from '@emdash-cms/blocks';
import { z } from 'zod';
import { api, catalogSchema, idSchema, imageType, parseGeneration, publicImageUrl, type Generation, type Model } from './service';

const PAGE='/images';
const inputSchema=z.object({type:z.enum(['page_load','form_submit','block_action']),action_id:z.string().optional(),value:z.unknown().optional(),values:z.record(z.unknown()).optional()});
const prepareSchema=z.object({prompt:z.string().trim().min(5).max(5000),model:z.string().min(1).max(100),size:z.string().max(20),quality:z.string().max(30)});
type Intent={prompt:string;model:string;size:string;quality:string;expires:number;state:'ready'|'submitting'|'submitted'|'unknown';job?:string};
const link=(label:string,url:string)=>({type:'link' as const,label,target:{kind:'external' as const,url}});
async function render(ctx:PluginContext,extra:Block[]=[],toast?:BlockResponse['toast']):Promise<BlockResponse>{
 const models=await ctx.kv.get<Model[]>('catalog')??[];
 const latest=await ctx.kv.get<Generation>('latest');
 const preferred=models.find(m=>m.slug==='gpt_image_25_flare')??models.find(m=>m.slug==='gpt_image_2')??models[0];
 const blocks:Block[]=[{type:'header',text:'UlazAI Media'},{type:'section',text:'Make an article image, check its progress, then save it in your media library. New generations use your UlazAI credits.'},{type:'actions',elements:[link('API keys and account','https://ulazai.com/dashboard/'),link('UlazAI pricing','https://ulazai.com/pricing/'),{type:'link',label:'Plugin settings',target:{kind:'plugin-settings'}},{type:'button',action_id:'catalog',label:'Load available models'}]}];
 if(models.length&&preferred){
  blocks.push({type:'form',block_id:'prepare',fields:[{type:'text_input',action_id:'prompt',label:'Describe your article image',multiline:true},{type:'select',action_id:'model',label:'Model',options:models.map(m=>({label:m.label,value:m.slug})),initial_value:preferred.slug},{type:'text_input',action_id:'size',label:'Aspect ratio',initial_value:'16:9'},{type:'text_input',action_id:'quality',label:'Quality (must match the chosen model)',initial_value:preferred.qualities[0]??'standard'}],submit:{label:'Check settings and prepare',action_id:'prepare'}});
  blocks.push({type:'table',columns:[{key:'model',label:'Model'},{key:'sizes',label:'Aspect ratios'},{key:'qualities',label:'Qualities'},{key:'cost',label:'Estimated credits'}],rows:models.map(m=>({model:m.label,sizes:m.aspect_ratios.join(', '),qualities:m.qualities.join(', ')||'standard',cost:JSON.stringify(m.credits_estimate)})),page_action_id:'catalog-page'});
 }
 if(latest){
  blocks.push({type:'fields',fields:[{label:'Last generation',value:latest.id},{label:'Status',value:latest.status},{label:'Credits charged',value:latest.credits===undefined?'Not reported':String(latest.credits)}]});
  blocks.push({type:'actions',elements:[{type:'button',action_id:'status',label:'Refresh status',value:latest.id},...(latest.status==='completed'?[{type:'button' as const,action_id:'import',label:'Save in media library',value:latest.id}]:[])]});
  if(latest.url)blocks.push({type:'image',url:latest.url,alt:'Generated image preview. Add descriptive alt text in the media library.'});
 }
 blocks.push(...extra,{type:'form',block_id:'existing',fields:[{type:'text_input',action_id:'id',label:'Existing UlazAI generation ID'}],submit:{label:'Look up existing image',action_id:'existing'}},{type:'context',text:'Your API key stays in encrypted EmDash plugin settings. Prompts go to UlazAI only after confirmation. No background generation or automatic paid retries. Imported images stay in this site’s media library; add alt text there.'});
 return{blocks,...(toast?{toast}:{})};
}
async function importImage(ctx:PluginContext,id:string,requestUrl:string):Promise<Block[]>{
 const done=await ctx.kv.get<{mediaId:string;url:string}>(`import:${id}`);
 if(done)return[{type:'section',text:`Already saved as media ${done.mediaId}.`},{type:'actions',elements:[link('Open saved image',done.url)]}];
 const generation=parseGeneration(await api(ctx,`generate/${id}/`));
 if(generation.status!=='completed'||!generation.url)throw new Error('The image is not completed yet. Refresh its status first.');
 if(!ctx.http||!ctx.media?.upload)throw new Error('Media or network permission is unavailable.');
 const claim=await ctx.kv.compareAndSet(`import-lock:${id}`,null,{started:new Date().toISOString()});
 if(!claim.applied)throw new Error('An import has already started. Check the media library before importing again.');
 try{
  const response=await ctx.http.fetch(publicImageUrl(generation.url),{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`Image download returned HTTP ${response.status}.`);
  const raw=await response.arrayBuffer();
  if(raw.byteLength>4*1024*1024||raw.byteLength<12)throw new Error('Import supports images between 12 bytes and 4 MiB.');
  const type=imageType(new Uint8Array(raw));
  const media=await ctx.media.upload(`ulazai-${id}.${type.ext}`,type.mime,raw);
  const saved={...media,url:new URL(media.url,requestUrl).href};
  await ctx.kv.set(`import:${id}`,saved);
  await ctx.kv.set('latest',generation);
  return[{type:'section',text:`Saved in the media library as ${media.mediaId}. Select it in your article and add descriptive alt text.`},{type:'actions',elements:[link('Open saved image',saved.url)]}];
 }catch(error){
  // Keep the claim: a lost upload reply is not proof that no media was created.
  throw new Error(error instanceof Error?error.message:'Import outcome unknown. Check the media library.');
 }
}
const plugin:SandboxedPlugin={routes:{admin:{permission:'plugins:manage',handler:async(routeCtx,ctx)=>{
 try{
  const input=inputSchema.parse(routeCtx.input);
  if(input.type==='page_load')return render(ctx);
  if(input.action_id==='catalog'){
   const catalog=catalogSchema.parse(await api(ctx,'models/image/')).data.models;
   await ctx.kv.set('catalog',catalog);
   return render(ctx,[],{type:'success',message:'Available models loaded. No generation started.'});
  }
  if(input.action_id==='prepare'&&input.type==='form_submit'){
   const values=prepareSchema.parse(input.values);
   const models=await ctx.kv.get<Model[]>('catalog');
   const model=models?.find(m=>m.slug===values.model);
   if(!model||!model.aspect_ratios.includes(values.size)||(model.qualities.length&&!model.qualities.includes(values.quality)))throw new Error('Choose an aspect ratio and quality listed for this model.');
   const token=crypto.randomUUID();
   await ctx.kv.set(`intent:${token}`,{...values,expires:Date.now()+600000,state:'ready'} satisfies Intent);
   const estimate=model.credits_estimate[values.quality]??model.credits_estimate.base;
   return render(ctx,[{type:'section',text:`Model: ${model.label}. Aspect ratio: ${values.size}. Quality: ${values.quality}. Estimated charge: ${estimate??'not supplied'} credits. The service calculates the final charge. Prompt: ${values.prompt}`},{type:'actions',elements:[{type:'button',action_id:'generate',label:'Generate using UlazAI credits',value:token,style:'primary',confirm:{title:'Start paid generation?',text:'This submits one image generation to your UlazAI account and uses its credits. No automatic retry.',confirm:'Generate image',deny:'Cancel'}}]}]);
  }
  if(input.action_id==='generate'&&input.type==='block_action'){
   const token=idSchema.parse(input.value);
   const current=await ctx.kv.getVersioned<Intent>(`intent:${token}`);
   if(!current||current.value.state!=='ready'||current.value.expires<Date.now())throw new Error('This confirmation has expired or was already used. Check your last generation first.');
   const claim=await ctx.kv.compareAndSet(`intent:${token}`,current.revision,{...current.value,state:'submitting'});
   if(!claim.applied)throw new Error('This generation is already being submitted.');
   try{
    const {prompt,model,size,quality}=current.value;
    const result=parseGeneration(await api(ctx,'generate/',{prompt,model,size,quality}));
    await ctx.kv.set(`intent:${token}`,{...current.value,state:'submitted',job:result.id});
    await ctx.kv.set('latest',result);
    return render(ctx,[],{type:'success',message:'Generation submitted. Refresh status to check progress.'});
   }catch(error){await ctx.kv.set(`intent:${token}`,{...current.value,state:'unknown'});throw error;}
  }
  if(input.action_id==='status'||input.action_id==='existing'){
   const id=idSchema.parse(input.type==='form_submit'?input.values?.id:input.value);
   await ctx.kv.set('latest',parseGeneration(await api(ctx,`generate/${id}/`)));
   return render(ctx);
  }
  if(input.action_id==='import')return render(ctx,await importImage(ctx,idSchema.parse(input.value),routeCtx.request.url));
  return render(ctx);
 }catch(error){
  const message=error instanceof z.ZodError?'Check the fields: a valid prompt, model settings or generation ID is required.':error instanceof Error?error.message:'The request could not be completed.';
  return render(ctx,[],{type:'error',message});
 }
}}}};
export default plugin;
