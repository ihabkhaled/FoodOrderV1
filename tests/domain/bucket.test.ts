import { describe, expect, it } from 'vitest';
import { createBucket, MAX_BUCKET_ITEMS, normalizeBucketItems, updateBucket } from '@/lib/bucket';
describe('bucket domain', () => {
  it('normalizes a valid bucket', () => { const b=createBucket('u',{title:' Breakfast ',description:' Friday ',currency:'EGP',items:[{id:'',name:' Foul ',description:'',category:'Egyptian',unitPrice:12.345,active:true}]}); expect(b.title).toBe('Breakfast'); expect(b.items[0]?.unitPrice).toBe(12.35); });
  it('rejects invalid item collections', () => { expect(()=>normalizeBucketItems([])).toThrow(/at least one/); expect(()=>normalizeBucketItems([{id:'x',name:' ',description:'',category:'',unitPrice:0,active:true}])).toThrow(/name/); expect(()=>normalizeBucketItems(Array.from({length:MAX_BUCKET_ITEMS+1},(_,i)=>({id:`${i}`,name:`Item ${i}`,description:'',category:'',unitPrice:1,active:true})))).toThrow(/supports up to/); });
  it('preserves identity on update', () => { const b=createBucket('u',{title:'Old',description:'',currency:'EGP',items:[{id:'i',name:'Tea',description:'',category:'',unitPrice:10,active:true}]}); expect(updateBucket(b,{title:'New',description:'',currency:'USD',items:b.items}).id).toBe(b.id); });
});
