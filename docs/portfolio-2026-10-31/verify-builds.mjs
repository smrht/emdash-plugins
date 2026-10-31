import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const summary=JSON.parse(readFileSync(resolve(root,'docs/portfolio-2026-10-31/mac-build-summary.json')));
assert.equal(summary.results.length,2);
for(const [slug,author] of [['ulazai-media','https://ulazai.com'],['backlinksbeheer-links','https://backlinksbeheer.nl']]){
 const result=summary.results.find(r=>r.slug===slug);assert.equal(result?.passed,true);assert.equal(result.steps.length,5);assert(result.steps.every(s=>s.exit===0));
 const folder=resolve(root,'packages',slug,'dist');const manifest=JSON.parse(readFileSync(resolve(folder,'manifest.json')));
 assert.equal(manifest.version,'0.1.0');
 const source=JSON.parse(readFileSync(resolve(root,'packages',slug,'emdash-plugin.jsonc')));assert.equal(source.author.url,author);
 assert(statSync(resolve(folder,'plugin.mjs')).size<=128*1024);
 const tar=gunzipSync(readFileSync(resolve(folder,`${slug}-0.1.0.tar.gz`)));let pos=0,count=0,total=0;
 while(pos+512<=tar.length&&tar[pos]){const header=tar.subarray(pos,pos+512);const size=parseInt(header.subarray(124,136).toString().replace(/\0/g,'').trim()||'0',8);assert(Number.isSafeInteger(size));count++;total+=size;assert(size<=128*1024);pos+=512+Math.ceil(size/512)*512;}
 assert(count<=20&&total<=256*1024);console.log(slug,'bundle file count',count,'total bytes',total);
}
console.log('BUILD_ARTIFACTS_VERIFIED');
