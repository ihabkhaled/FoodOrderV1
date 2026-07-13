import { describe, expect, it } from 'vitest';

import { calculateLineTotal, calculateOrderTotal, canTransitionOrder, createOrder, transitionOrder } from '@/lib/order';
const draft={bucketId:'b1',bucketTitle:'Breakfast',currency:'EGP' as const,notes:'',lines:[{id:'l1',bucketItemId:'i1',name:'Foul',quantity:2,unitPrice:12.5}]};
describe('order domain',()=>{
 it('calculates totals',()=>{expect(calculateLineTotal(3,10.335)).toBe(31.01);expect(calculateOrderTotal([{quantity:2,unitPrice:12.5},{quantity:1,unitPrice:5}])).toBe(30);});
 it('requires selected items',()=>{ expect(()=>createOrder('u',{...draft,lines:draft.lines.map(l=>({...l,quantity:0}))})).toThrow(/at least one/); });
 it('enforces lifecycle',()=>{expect(canTransitionOrder('draft','placed')).toBe(true);const done=transitionOrder(createOrder('u',draft),'completed');expect(done.status).toBe('completed');expect(()=>transitionOrder(done,'cancelled')).toThrow(/cannot move/);});
});
