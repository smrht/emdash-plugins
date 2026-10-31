import { describe, it, expect } from 'vitest';
import { publicImageUrl, parseGeneration } from '../src/service';
describe('UlazAI result boundary', () => {
 it('accepts a completed API result, not just a UI success flag', () => {
  expect(parseGeneration({success:true,data:{generation_id:'3ae36160-d13e-4a58-a135-e835fc7cf0a6',status:'completed',image_url:'https://cdn.ulazai.com/result.jpg',credits_used:7}})).toMatchObject({status:'completed',id:'3ae36160-d13e-4a58-a135-e835fc7cf0a6',url:'https://cdn.ulazai.com/result.jpg',credits:7});
 });
 it('does not invent an image for processing or failed generations', () => {
  expect(parseGeneration({success:true,data:{generation_id:'3ae36160-d13e-4a58-a135-e835fc7cf0a6',status:'processing'}}).url).toBeUndefined();
  expect(parseGeneration({success:true,data:{generation_id:'3ae36160-d13e-4a58-a135-e835fc7cf0a6',status:'failed'}}).status).toBe('failed');
 });
 it.each(['http://cdn.example.com/a.png','https://127.0.0.1/a.png','https://[::1]/a.png','https://user:pass@example.com/a.png','https://metadata.google.internal/a','https://localhost/a','https://10.1.1.1/a','https://169.254.169.254/a'])('rejects unsafe image target %s', u => expect(()=>publicImageUrl(u)).toThrow());
 it('accepts a public HTTPS image URL',()=>expect(publicImageUrl('https://cdn.ulazai.com/a.png')).toBe('https://cdn.ulazai.com/a.png'));
 it('rejects a completed result without an image',()=>expect(()=>parseGeneration({success:true,data:{generation_id:'3ae36160-d13e-4a58-a135-e835fc7cf0a6',status:'completed'}})).toThrow());
});
