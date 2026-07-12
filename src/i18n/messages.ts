import type { Locale } from '@/types/domain';

export const messages = {
  en: {
    appName: 'FoodOrder', dashboard: 'Home', buckets: 'Buckets', orders: 'Orders', settings: 'Settings',
    login: 'Log in', register: 'Create account', logout: 'Log out', email: 'Email', password: 'Password',
    fullName: 'Full name', forgotPassword: 'Forgot password?', resetPassword: 'Reset password',
    noAccount: 'New to FoodOrder?', haveAccount: 'Already have an account?', save: 'Save', cancel: 'Cancel',
    delete: 'Delete', edit: 'Edit', back: 'Back', loading: 'Loading…', tryAgain: 'Try again',
    createBucket: 'Create bucket', editBucket: 'Edit bucket', bucketTitle: 'Bucket title', description: 'Description',
    currency: 'Currency', addItem: 'Add item', itemName: 'Item name', category: 'Category', unitPrice: 'Unit price',
    active: 'Available', orderNow: 'Order now', emptyBuckets: 'No buckets yet', emptyOrders: 'No orders yet',
    myBuckets: 'My buckets', myOrders: 'My orders', quantity: 'Quantity', notes: 'Notes', placeOrder: 'Place order',
    saveDraft: 'Save draft', total: 'Total', subtotal: 'Subtotal', status: 'Status', placed: 'Placed', draft: 'Draft',
    completed: 'Completed', cancelled: 'Cancelled', completeOrder: 'Mark completed', cancelOrder: 'Cancel order',
    repeatOrder: 'Repeat order', recentOrders: 'Recent orders', bucketCount: 'Buckets', itemCount: 'Available items',
    orderCount: 'All orders', placedCount: 'Open orders', welcome: 'Welcome back', quickStart: 'Build a reusable menu, then place an order in seconds.',
    profile: 'Profile', language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark', system: 'System',
    storageMode: 'Storage mode', localMode: 'Local device', firebaseMode: 'Firebase cloud', online: 'Online', offline: 'Offline',
    confirmDeleteBucket: 'Delete this bucket? Existing orders remain available.', confirmDeleteOrder: 'Delete this order permanently?',
    orderDetails: 'Order details', noItemsSelected: 'Choose at least one item.', created: 'Created', updated: 'Updated',
    localModeNotice: 'Firebase is not configured. Your data is stored only on this device.',
    resetSent: 'Password reset instructions were sent.', accountCreated: 'Your account is ready.', signedIn: 'Welcome back.',
  },
  ar: {
    appName: 'فود أوردر', dashboard: 'الرئيسية', buckets: 'القوائم', orders: 'الطلبات', settings: 'الإعدادات',
    login: 'تسجيل الدخول', register: 'إنشاء حساب', logout: 'تسجيل الخروج', email: 'البريد الإلكتروني', password: 'كلمة المرور',
    fullName: 'الاسم بالكامل', forgotPassword: 'نسيت كلمة المرور؟', resetPassword: 'إعادة تعيين كلمة المرور',
    noAccount: 'أول مرة تستخدم فود أوردر؟', haveAccount: 'لديك حساب بالفعل؟', save: 'حفظ', cancel: 'إلغاء',
    delete: 'حذف', edit: 'تعديل', back: 'رجوع', loading: 'جارٍ التحميل…', tryAgain: 'حاول مرة أخرى',
    createBucket: 'إنشاء قائمة', editBucket: 'تعديل القائمة', bucketTitle: 'اسم القائمة', description: 'الوصف',
    currency: 'العملة', addItem: 'إضافة صنف', itemName: 'اسم الصنف', category: 'التصنيف', unitPrice: 'سعر الوحدة',
    active: 'متاح', orderNow: 'اطلب الآن', emptyBuckets: 'لا توجد قوائم بعد', emptyOrders: 'لا توجد طلبات بعد',
    myBuckets: 'قوائمي', myOrders: 'طلباتي', quantity: 'الكمية', notes: 'ملاحظات', placeOrder: 'تأكيد الطلب',
    saveDraft: 'حفظ كمسودة', total: 'الإجمالي', subtotal: 'المجموع', status: 'الحالة', placed: 'مؤكد', draft: 'مسودة',
    completed: 'مكتمل', cancelled: 'ملغي', completeOrder: 'تحديد كمكتمل', cancelOrder: 'إلغاء الطلب',
    repeatOrder: 'تكرار الطلب', recentOrders: 'أحدث الطلبات', bucketCount: 'القوائم', itemCount: 'الأصناف المتاحة',
    orderCount: 'كل الطلبات', placedCount: 'الطلبات المفتوحة', welcome: 'أهلاً بعودتك', quickStart: 'أنشئ قائمة قابلة لإعادة الاستخدام ثم اطلب خلال ثوانٍ.',
    profile: 'الملف الشخصي', language: 'اللغة', theme: 'المظهر', light: 'فاتح', dark: 'داكن', system: 'تلقائي',
    storageMode: 'طريقة التخزين', localMode: 'على الجهاز', firebaseMode: 'سحابة Firebase', online: 'متصل', offline: 'غير متصل',
    confirmDeleteBucket: 'هل تريد حذف القائمة؟ ستظل الطلبات القديمة موجودة.', confirmDeleteOrder: 'هل تريد حذف الطلب نهائيًا؟',
    orderDetails: 'تفاصيل الطلب', noItemsSelected: 'اختر صنفًا واحدًا على الأقل.', created: 'تاريخ الإنشاء', updated: 'آخر تحديث',
    localModeNotice: 'Firebase غير مفعّل. بياناتك محفوظة على هذا الجهاز فقط.',
    resetSent: 'تم إرسال تعليمات إعادة تعيين كلمة المرور.', accountCreated: 'تم إنشاء حسابك.', signedIn: 'أهلاً بعودتك.',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
export const translate = (locale: Locale, key: MessageKey): string => messages[locale][key] ?? messages.en[key];
