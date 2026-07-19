export const SETTINGS_MESSAGES = {
  en: {
    analyticsPrivacy: 'Analytics and privacy',
    analyticsPrivacyDescription:
      'Choose which anonymous diagnostics and product usage events FoodOrder may record. Emails, names, notes, payment proofs, and other private content are never analytics properties.',
    analyticsConsent: 'Analytics consent',
    analyticsDenied: 'Do not record analytics',
    analyticsOperationalOnly: 'Operational diagnostics only',
    analyticsProduct: 'Operational and product analytics',
    analyticsProductAndMarketing:
      'Operational, product, and upgrade analytics',
    analyticsDeniedDescription:
      'No optional analytics events are recorded. Ordering continues normally.',
    analyticsOperationalDescription:
      'Records privacy-safe reliability failures and performance diagnostics.',
    analyticsProductDescription:
      'Also records privacy-safe acquisition, activation, and feature usage events.',
    analyticsMarketingDescription:
      'Also records privacy-safe upgrade prompts and subscription funnel events.',
    analyticsConsentSaved: 'Analytics preference saved.',
  },
  ar: {
    analyticsPrivacy: 'التحليلات والخصوصية',
    analyticsPrivacyDescription:
      'اختر بيانات التشخيص والاستخدام المجهولة التي يمكن لفود أوردر تسجيلها. لا تُرسل عناوين البريد أو الأسماء أو الملاحظات أو إثباتات الدفع أو أي محتوى خاص ضمن التحليلات.',
    analyticsConsent: 'موافقة التحليلات',
    analyticsDenied: 'عدم تسجيل التحليلات',
    analyticsOperationalOnly: 'تشخيصات التشغيل فقط',
    analyticsProduct: 'تشخيصات التشغيل وتحليلات استخدام المنتج',
    analyticsProductAndMarketing:
      'تشخيصات التشغيل وتحليلات المنتج والترقية',
    analyticsDeniedDescription:
      'لن تُسجل أي تحليلات اختيارية، وسيستمر استخدام الطلبات بصورة طبيعية.',
    analyticsOperationalDescription:
      'يسجل أعطال الاعتمادية وقياسات الأداء بصورة آمنة للخصوصية.',
    analyticsProductDescription:
      'يسجل أيضًا بيانات آمنة عن الانضمام والتفعيل واستخدام الخصائص.',
    analyticsMarketingDescription:
      'يسجل أيضًا عرض خيارات الترقية ومسار الاشتراك بصورة آمنة للخصوصية.',
    analyticsConsentSaved: 'تم حفظ تفضيل التحليلات.',
  },
} as const;

export type SettingsMessageKey = keyof typeof SETTINGS_MESSAGES.en;
