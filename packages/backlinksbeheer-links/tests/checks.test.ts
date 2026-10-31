import { describe,it,expect } from 'vitest';
import {extractLinks,classifyStatus} from '../src/checks';
describe('saved-content outbound link inspection',()=>{
 it('reads Portable Text marks and static HTML and deduplicates fragments',()=>{
  const result=extractLinks({body:[{_type:'block',markDefs:[{_type:'link',href:'https://example.org/guide#one'},{_type:'link',href:'https://example.org/guide#two'}]},{_type:'html',html:'<a href="https://other.org/?x=1&amp;y=2">Guide</a><script>"https://bad.org"</script>'}]},'https://mysite.org');
  expect(result.urls).toEqual(['https://example.org/guide','https://other.org/?x=1&y=2']);
 });
 it('skips own-site, private, credential-bearing and non-HTTP links',()=>{
  const value={body:[{href:'/contact'},{href:'https://mysite.org/contact'},{href:'mailto:a@example.org'},{href:'https://localhost/a'},{href:'https://192.168.1.1/a'},{href:'https://name:pass@example.org'}]};
  expect(extractLinks(value,'https://mysite.org').urls).toEqual([]);
 });
 it.each([401,403,408,429,500,503])('reports HTTP %s as unknown', s=>expect(classifyStatus(s)).toBe('unknown'));
 it.each([404,410])('reports HTTP %s as a missing page observation',s=>expect(classifyStatus(s)).toBe('missing'));
 it('distinguishes reachable and redirected',()=>{expect(classifyStatus(200)).toBe('ok');expect(classifyStatus(301)).toBe('redirect');});
});
