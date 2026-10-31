import type { PluginContext } from 'emdash/plugin';
import { z } from 'zod';
export const API = 'https://ulazai.com/api/v1/';
export const idSchema = z.string().uuid();
export function publicImageUrl(value: unknown): string {
 if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid image URL');
 const u = new URL(value);
 const h = u.hostname.toLowerCase();
 if (u.protocol !== 'https:' || u.username || u.password || u.port || !h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(h)) throw new Error('Image URL must be public HTTPS');
 return u.href;
}
export type Generation = {id:string;status:'pending'|'queued'|'processing'|'completed'|'failed';url?:string;credits?:number};
const resultSchema=z.object({success:z.literal(true),data:z.object({generation_id:idSchema,status:z.enum(['pending','queued','processing','completed','failed']),image_url:z.string().nullish(),credits_used:z.number().nonnegative().optional()})});
export function parseGeneration(value: unknown): Generation {
 const {data}=resultSchema.parse(value);
 const result:Generation={id:data.generation_id,status:data.status,credits:data.credits_used};
 if(data.status==='completed')result.url=publicImageUrl(data.image_url);
 return result;
}
export async function api(ctx:PluginContext,path:string,body?:unknown):Promise<unknown>{
 const key=await ctx.settings.get<string>('apiKey');
 if(!key)throw new Error('Add your UlazAI API key in plugin settings.');
 if(!ctx.http)throw new Error('Network permission is unavailable.');
 let response:Response;
 try { response=await ctx.http.fetch(API+path,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(12000)}); }
 catch {throw new Error(body===undefined?'UlazAI could not be reached. Try reading the status again.':'Submission outcome unknown. Check UlazAI history before starting another generation.');}
 if(!response.ok)throw new Error(response.status===401||response.status===403?'UlazAI rejected the key or account access.':response.status===402?'UlazAI requires an eligible paid account and enough credits.':`UlazAI returned HTTP ${response.status}. No automatic retry was made.`);
 const result=await response.json();
 if(!result || typeof result!=='object' || result.success!==true)throw new Error('UlazAI returned an invalid response.');
 return result;
}
export const catalogSchema=z.object({success:z.literal(true),data:z.object({models:z.array(z.object({slug:z.string().min(1).max(100),label:z.string().min(1).max(100),aspect_ratios:z.array(z.string()),qualities:z.array(z.string()),credits_estimate:z.record(z.union([z.number(),z.string()])).default({})})).max(100)})});
export type Model=z.infer<typeof catalogSchema>['data']['models'][number];
export function imageType(bytes:Uint8Array):{mime:string;ext:string}{
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return{mime:'image/png',ext:'png'};
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return{mime:'image/jpeg',ext:'jpg'};
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return{mime:'image/webp',ext:'webp'};
 throw new Error('The result is not a PNG, JPEG or WebP image.');
}
