import { beforeEach, describe, expect, it } from 'vitest';

import type { ProfileDefaults } from '@/modules/data-access';
import { LocalAuthService, LocalDataService } from '@/modules/data-access';

const defaults: ProfileDefaults = { locale: 'en', theme: 'system', defaultCurrency: 'EGP' };

describe('local integration', () => {
  beforeEach(() => { localStorage.clear(); });
  it('supports the order lifecycle', async () => {
    const auth = new LocalAuthService();
    const data = new LocalDataService();
    const user = await auth.register('Ihab Khaled', 'ihab@example.com', 'Password1', defaults);
    const bucket = await data.createBucket(user, { title: 'Lunch', description: '', currency: 'EGP', items: [{ id: '', name: 'Koshary', description: '', category: 'Meals', unitPrice: 45, active: true }] });
    const [firstItem] = bucket.items;
    if (!firstItem) throw new Error('expected an item');
    const order = await data.createOrder(user.id, { bucketId: bucket.id, bucketTitle: bucket.title, currency: bucket.currency, notes: '', lines: [{ id: 'l', bucketItemId: firstItem.id, name: 'Koshary', quantity: 2, unitPrice: 45 }] });
    const completed = await data.updateOrderStatus(user.id, order.id, 'completed');
    expect(completed.status).toBe('completed');
    const dashboard = await data.getDashboard(user);
    expect(dashboard.orderCount).toBe(1);
    expect(dashboard.sharedBucketCount).toBe(0);
  });
  it('seeds new profiles from device defaults', async () => {
    const auth = new LocalAuthService();
    const data = new LocalDataService();
    const user = await auth.register('Sara', 'sara@example.com', 'Password1', { locale: 'ar', theme: 'dark', defaultCurrency: 'SAR' });
    const profile = await data.getProfile(user, defaults);
    expect(profile.locale).toBe('ar');
    expect(profile.theme).toBe('dark');
    expect(profile.defaultCurrency).toBe('SAR');
  });
});
