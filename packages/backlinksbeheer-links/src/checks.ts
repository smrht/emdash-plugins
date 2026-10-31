import {parseDocument} from './vendor/html-parser.mjs';
export function classifyStatus(status:number):string{
 if(status>=200&&status<300)return'ok';
 if(status>=300&&status<400)return'redirect';
 if(status===404||status===410)return'missing';
 return'unknown';
}
export function outboundUrl(value:unknown,site:string):string|null{
 if(typeof value!=='string'||value.length>2048||!/^https?:\/\//i.test(value))return null;
 try{
  const u=new URL(value);const own=new URL(site);const h=u.hostname.toLowerCase();
  if(u.username||u.password||u.port||h===own.hostname||h===`www.${own.hostname}`||`www.${h}`===own.hostname||!h.includes('.')||/^[\d.]+$/.test(h)||h.includes(':')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(h))return null;
  u.hash='';return u.href;
 }catch{return null;}
}
export function extractLinks(value:unknown,site:string):{urls:string[];limited:boolean}{
 const urls=new Set<string>();const pending:unknown[]=[value];let seen=0,limited=false;
 const add=(raw:unknown)=>{const url=outboundUrl(raw,site);if(url){if(urls.size>=200){limited=true;}else urls.add(url);}};
 while(pending.length){
  if(++seen>20000){limited=true;break;}
  const item=pending.pop();
  if(Array.isArray(item)){pending.push(...item.slice(0,10000).reverse());if(item.length>10000)limited=true;continue;}
  if(!item||typeof item!=='object')continue;
  const obj=item as Record<string,unknown>;
  if(typeof obj.href==='string')add(obj.href);
  if(typeof obj.html==='string'){
   if(obj.html.length>200000){limited=true;continue;}
   const root=parseDocument(obj.html,{decodeEntities:true,lowerCaseAttributeNames:true,lowerCaseTags:true});
   const nodes=[...root.children].reverse();let htmlNodes=0;
   while(nodes.length){
    if(++htmlNodes>20000){limited=true;break;}
    const node=nodes.pop()!;
    if(!('attribs' in node)||['script','style','template'].includes(node.name))continue;
    if(node.name==='a')add(node.attribs.href);
    nodes.push(...node.children.slice().reverse());
   }
  }
  pending.push(...Object.values(obj).filter(v=>typeof v==='object'&&v!==null).reverse());
 }
 return{urls:[...urls],limited};
}
