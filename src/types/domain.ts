export type Locale = 'en' | 'ar';
export type Theme = 'system' | 'light' | 'dark';
export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED';
export type OrderStatus = 'draft' | 'placed' | 'completed' | 'cancelled';

export interface SessionUser { id: string; email: string; displayName: string; isDemo: boolean; }
export interface UserProfile { id: string; fullName: string; email: string; locale: Locale; theme: Theme; defaultCurrency: CurrencyCode; createdAt: string; updatedAt: string; }
export interface BucketItem { id: string; name: string; description: string; category: string; unitPrice: number; active: boolean; sortOrder: number; }
export interface Bucket { id: string; userId: string; title: string; description: string; currency: CurrencyCode; items: BucketItem[]; createdAt: string; updatedAt: string; }
export interface OrderLine { id: string; bucketItemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number; }
export interface Order { id: string; userId: string; bucketId: string; bucketTitle: string; status: OrderStatus; currency: CurrencyCode; lines: OrderLine[]; notes: string; subtotal: number; total: number; createdAt: string; updatedAt: string; placedAt: string | null; completedAt: string | null; cancelledAt: string | null; }
export interface BucketDraft { title: string; description: string; currency: CurrencyCode; items: Array<Omit<BucketItem, 'sortOrder'> & { sortOrder?: number }>; }
export interface OrderDraft { bucketId: string; bucketTitle: string; currency: CurrencyCode; lines: Array<Omit<OrderLine, 'lineTotal'>>; notes: string; status?: OrderStatus; }
export interface DashboardSummary { bucketCount: number; activeItemCount: number; orderCount: number; placedOrderCount: number; completedOrderCount: number; recentOrders: Order[]; }
