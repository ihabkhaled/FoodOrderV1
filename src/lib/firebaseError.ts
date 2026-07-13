import type { Locale } from '@/types/domain';

interface LocalizedMessage {
  en: string;
  ar: string;
}

interface FirebaseErrorLike {
  code?: unknown;
  message?: unknown;
}

const message = (en: string, ar: string): LocalizedMessage => ({ en, ar });

const FIREBASE_ERROR_MESSAGES: Readonly<Record<string, LocalizedMessage>> = {
  // Authentication
  'auth/invalid-credential': message(
    'The email or password is incorrect.',
    'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  ),
  'auth/wrong-password': message(
    'The email or password is incorrect.',
    'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  ),
  'auth/user-not-found': message(
    'The email or password is incorrect.',
    'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  ),
  'auth/email-already-in-use': message(
    'An account already exists for this email address. Log in or reset your password.',
    'يوجد حساب مسجّل بهذا البريد الإلكتروني. سجّل الدخول أو أعد تعيين كلمة المرور.',
  ),
  'auth/invalid-email': message(
    'Enter a valid email address.',
    'أدخل بريدًا إلكترونيًا صحيحًا.',
  ),
  'auth/weak-password': message(
    'Choose a stronger password with at least 8 characters, including a letter and a number.',
    'اختر كلمة مرور أقوى من 8 أحرف على الأقل وتحتوي على حرف ورقم.',
  ),
  'auth/user-disabled': message(
    'This account has been disabled. Contact support for help.',
    'تم إيقاف هذا الحساب. تواصل مع الدعم للحصول على المساعدة.',
  ),
  'auth/too-many-requests': message(
    'Too many attempts were made. Wait a few minutes and try again.',
    'تم إجراء محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى.',
  ),
  'auth/network-request-failed': message(
    'The authentication service could not be reached. Check your connection and try again.',
    'تعذّر الاتصال بخدمة تسجيل الدخول. تحقق من اتصالك وحاول مرة أخرى.',
  ),
  'auth/operation-not-allowed': message(
    'This sign-in method is not enabled for this application.',
    'طريقة تسجيل الدخول هذه غير مفعّلة لهذا التطبيق.',
  ),
  'auth/requires-recent-login': message(
    'For security, log in again before completing this action.',
    'لأسباب أمنية، سجّل الدخول مرة أخرى قبل إكمال هذا الإجراء.',
  ),
  'auth/user-token-expired': message(
    'Your session has expired. Log in again.',
    'انتهت صلاحية جلستك. سجّل الدخول مرة أخرى.',
  ),
  'auth/invalid-user-token': message(
    'Your session is no longer valid. Log in again.',
    'لم تعد جلستك صالحة. سجّل الدخول مرة أخرى.',
  ),
  'auth/user-mismatch': message(
    'These credentials belong to a different account.',
    'بيانات الدخول هذه تخص حسابًا مختلفًا.',
  ),
  'auth/credential-already-in-use': message(
    'These credentials are already linked to another account.',
    'بيانات الدخول هذه مرتبطة بالفعل بحساب آخر.',
  ),
  'auth/account-exists-with-different-credential': message(
    'An account already exists with a different sign-in method.',
    'يوجد حساب بالفعل باستخدام طريقة تسجيل دخول مختلفة.',
  ),
  'auth/provider-already-linked': message(
    'This sign-in provider is already linked to your account.',
    'مزود تسجيل الدخول هذا مرتبط بحسابك بالفعل.',
  ),
  'auth/no-such-provider': message(
    'This sign-in provider is not linked to your account.',
    'مزود تسجيل الدخول هذا غير مرتبط بحسابك.',
  ),
  'auth/invalid-api-key': message(
    'Authentication is not configured correctly. Contact support.',
    'إعدادات تسجيل الدخول غير صحيحة. تواصل مع الدعم.',
  ),
  'auth/app-not-authorized': message(
    'This application is not authorized to use Firebase Authentication.',
    'هذا التطبيق غير مصرح له باستخدام Firebase Authentication.',
  ),
  'auth/auth-domain-config-required': message(
    'The authentication domain is not configured.',
    'نطاق تسجيل الدخول غير مُعدّ.',
  ),
  'auth/unauthorized-domain': message(
    'This website domain is not authorized for authentication.',
    'نطاق الموقع هذا غير مصرح له بتسجيل الدخول.',
  ),
  'auth/unauthorized-continue-uri': message(
    'The password-reset return address is not authorized.',
    'عنوان الرجوع بعد إعادة تعيين كلمة المرور غير مصرح به.',
  ),
  'auth/invalid-continue-uri': message(
    'The password-reset return address is invalid.',
    'عنوان الرجوع بعد إعادة تعيين كلمة المرور غير صالح.',
  ),
  'auth/missing-continue-uri': message(
    'The password-reset return address is missing.',
    'عنوان الرجوع بعد إعادة تعيين كلمة المرور غير موجود.',
  ),
  'auth/expired-action-code': message(
    'This email action link has expired. Request a new one.',
    'انتهت صلاحية رابط البريد الإلكتروني. اطلب رابطًا جديدًا.',
  ),
  'auth/invalid-action-code': message(
    'This email action link is invalid or has already been used.',
    'رابط البريد الإلكتروني غير صالح أو تم استخدامه بالفعل.',
  ),
  'auth/code-expired': message(
    'The verification code has expired. Request a new code.',
    'انتهت صلاحية رمز التحقق. اطلب رمزًا جديدًا.',
  ),
  'auth/invalid-verification-code': message(
    'The verification code is not valid.',
    'رمز التحقق غير صالح.',
  ),
  'auth/invalid-verification-id': message(
    'The verification session is not valid. Start again.',
    'جلسة التحقق غير صالحة. ابدأ من جديد.',
  ),
  'auth/missing-verification-code': message(
    'Enter the verification code.',
    'أدخل رمز التحقق.',
  ),
  'auth/missing-verification-id': message(
    'The verification session is missing. Start again.',
    'جلسة التحقق غير موجودة. ابدأ من جديد.',
  ),
  'auth/invalid-phone-number': message(
    'Enter a valid phone number including the country code.',
    'أدخل رقم هاتف صحيحًا مع كود الدولة.',
  ),
  'auth/missing-phone-number': message(
    'Enter a phone number.',
    'أدخل رقم الهاتف.',
  ),
  'auth/quota-exceeded': message(
    'The authentication service quota has been reached. Try again later.',
    'تم الوصول إلى الحد المسموح لخدمة تسجيل الدخول. حاول لاحقًا.',
  ),
  'auth/popup-blocked': message(
    'Your browser blocked the sign-in window. Allow pop-ups and try again.',
    'حظر المتصفح نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة وحاول مرة أخرى.',
  ),
  'auth/popup-closed-by-user': message(
    'The sign-in window was closed before completion.',
    'تم إغلاق نافذة تسجيل الدخول قبل اكتمال العملية.',
  ),
  'auth/cancelled-popup-request': message(
    'Another sign-in attempt replaced this one.',
    'تم استبدال محاولة تسجيل الدخول هذه بمحاولة أخرى.',
  ),
  'auth/timeout': message(
    'The authentication request timed out. Try again.',
    'انتهت مهلة طلب تسجيل الدخول. حاول مرة أخرى.',
  ),
  'auth/internal-error': message(
    'The authentication service encountered an error. Try again shortly.',
    'حدث خطأ في خدمة تسجيل الدخول. حاول مرة أخرى بعد قليل.',
  ),
  'auth/web-storage-unsupported': message(
    'This browser does not allow the secure storage required for sign-in.',
    'هذا المتصفح لا يسمح بالتخزين الآمن المطلوب لتسجيل الدخول.',
  ),
  'auth/operation-not-supported-in-this-environment': message(
    'This authentication action is not supported in the current environment.',
    'إجراء تسجيل الدخول هذا غير مدعوم في البيئة الحالية.',
  ),
  'auth/multi-factor-auth-required': message(
    'Complete the additional verification step to continue.',
    'أكمل خطوة التحقق الإضافية للمتابعة.',
  ),
  'auth/invalid-multi-factor-session': message(
    'The additional verification session is invalid. Start again.',
    'جلسة التحقق الإضافي غير صالحة. ابدأ من جديد.',
  ),
  'auth/missing-multi-factor-session': message(
    'The additional verification session is missing. Start again.',
    'جلسة التحقق الإضافي غير موجودة. ابدأ من جديد.',
  ),
  'auth/second-factor-already-in-use': message(
    'This second factor is already registered on the account.',
    'وسيلة التحقق الإضافية هذه مسجلة بالفعل على الحساب.',
  ),
  'auth/maximum-second-factor-count-exceeded': message(
    'The maximum number of additional verification methods has been reached.',
    'تم الوصول إلى الحد الأقصى لوسائل التحقق الإضافية.',
  ),
  'auth/captcha-check-failed': message(
    'The security check failed. Refresh the page and try again.',
    'فشل فحص الأمان. حدّث الصفحة وحاول مرة أخرى.',
  ),
  'auth/missing-recaptcha-token': message(
    'The security check is incomplete. Try again.',
    'فحص الأمان غير مكتمل. حاول مرة أخرى.',
  ),
  'auth/invalid-recaptcha-token': message(
    'The security check is no longer valid. Try again.',
    'لم يعد فحص الأمان صالحًا. حاول مرة أخرى.',
  ),
  'auth/recaptcha-not-enabled': message(
    'The security verification service is not enabled.',
    'خدمة التحقق الأمني غير مفعّلة.',
  ),

  // Cloud Firestore and shared Firebase service codes
  'firestore/permission-denied': message(
    'You do not have permission to access or change this data.',
    'لا تملك صلاحية الوصول إلى هذه البيانات أو تعديلها.',
  ),
  'firestore/unauthenticated': message(
    'Log in before accessing this data.',
    'سجّل الدخول قبل الوصول إلى هذه البيانات.',
  ),
  'firestore/not-found': message(
    'The requested data was not found.',
    'لم يتم العثور على البيانات المطلوبة.',
  ),
  'firestore/already-exists': message(
    'This record already exists.',
    'هذا السجل موجود بالفعل.',
  ),
  'firestore/failed-precondition': message(
    'This action cannot be completed in the current state. Refresh and try again.',
    'لا يمكن إكمال هذا الإجراء في الحالة الحالية. حدّث البيانات وحاول مرة أخرى.',
  ),
  'firestore/aborted': message(
    'The data changed during the operation. Refresh and try again.',
    'تغيرت البيانات أثناء العملية. حدّث البيانات وحاول مرة أخرى.',
  ),
  'firestore/unavailable': message(
    'The cloud database is temporarily unavailable. Try again shortly.',
    'قاعدة البيانات السحابية غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.',
  ),
  'firestore/deadline-exceeded': message(
    'The cloud request took too long. Check your connection and try again.',
    'استغرق الطلب السحابي وقتًا طويلًا. تحقق من اتصالك وحاول مرة أخرى.',
  ),
  'firestore/resource-exhausted': message(
    'The cloud service is busy or its quota was reached. Try again later.',
    'الخدمة السحابية مشغولة أو تم الوصول إلى حد الاستخدام. حاول لاحقًا.',
  ),
  'firestore/invalid-argument': message(
    'Some submitted data is invalid. Review it and try again.',
    'بعض البيانات المُرسلة غير صالحة. راجعها وحاول مرة أخرى.',
  ),
  'firestore/out-of-range': message(
    'A submitted value is outside the allowed range.',
    'إحدى القيم المُرسلة خارج النطاق المسموح.',
  ),
  'firestore/cancelled': message(
    'The cloud operation was cancelled.',
    'تم إلغاء العملية السحابية.',
  ),
  'firestore/internal': message(
    'The cloud database encountered an error. Try again shortly.',
    'حدث خطأ في قاعدة البيانات السحابية. حاول مرة أخرى بعد قليل.',
  ),
  'firestore/data-loss': message(
    'The cloud service reported a data integrity error. Contact support.',
    'أبلغت الخدمة السحابية عن خطأ في سلامة البيانات. تواصل مع الدعم.',
  ),
  'firestore/unimplemented': message(
    'This cloud operation is not supported.',
    'هذه العملية السحابية غير مدعومة.',
  ),
  'firestore/unknown': message(
    'An unexpected cloud database error occurred.',
    'حدث خطأ غير متوقع في قاعدة البيانات السحابية.',
  ),

  // Callable Cloud Functions
  'functions/permission-denied': message(
    'You do not have permission to perform this action.',
    'لا تملك صلاحية تنفيذ هذا الإجراء.',
  ),
  'functions/unauthenticated': message(
    'Log in before performing this action.',
    'سجّل الدخول قبل تنفيذ هذا الإجراء.',
  ),
  'functions/not-found': message(
    'The requested cloud operation or record was not found.',
    'لم يتم العثور على العملية السحابية أو السجل المطلوب.',
  ),
  'functions/already-exists': message(
    'The requested record already exists.',
    'السجل المطلوب موجود بالفعل.',
  ),
  'functions/failed-precondition': message(
    'This action cannot be completed in the current state. Refresh and try again.',
    'لا يمكن إكمال هذا الإجراء في الحالة الحالية. حدّث البيانات وحاول مرة أخرى.',
  ),
  'functions/aborted': message(
    'The action conflicted with a newer change. Refresh and try again.',
    'تعارض الإجراء مع تغيير أحدث. حدّث البيانات وحاول مرة أخرى.',
  ),
  'functions/unavailable': message(
    'The cloud service is temporarily unavailable. Try again shortly.',
    'الخدمة السحابية غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.',
  ),
  'functions/deadline-exceeded': message(
    'The cloud action took too long. Try again.',
    'استغرق الإجراء السحابي وقتًا طويلًا. حاول مرة أخرى.',
  ),
  'functions/resource-exhausted': message(
    'The service is busy or its quota was reached. Try again later.',
    'الخدمة مشغولة أو تم الوصول إلى حد الاستخدام. حاول لاحقًا.',
  ),
  'functions/invalid-argument': message(
    'Some submitted data is invalid. Review it and try again.',
    'بعض البيانات المُرسلة غير صالحة. راجعها وحاول مرة أخرى.',
  ),
  'functions/internal': message(
    'The cloud service encountered an error. Try again shortly.',
    'حدث خطأ في الخدمة السحابية. حاول مرة أخرى بعد قليل.',
  ),
  'functions/unknown': message(
    'An unexpected cloud service error occurred.',
    'حدث خطأ غير متوقع في الخدمة السحابية.',
  ),

  // Cloud Storage
  'storage/unauthenticated': message(
    'Log in before accessing this file.',
    'سجّل الدخول قبل الوصول إلى هذا الملف.',
  ),
  'storage/unauthorized': message(
    'You do not have permission to access this file.',
    'لا تملك صلاحية الوصول إلى هذا الملف.',
  ),
  'storage/object-not-found': message(
    'The requested file was not found.',
    'لم يتم العثور على الملف المطلوب.',
  ),
  'storage/bucket-not-found': message(
    'Cloud file storage is not configured correctly.',
    'تخزين الملفات السحابي غير مُعدّ بشكل صحيح.',
  ),
  'storage/project-not-found': message(
    'The Firebase project could not be found.',
    'تعذّر العثور على مشروع Firebase.',
  ),
  'storage/quota-exceeded': message(
    'The file-storage quota has been reached. Try again later.',
    'تم الوصول إلى الحد المسموح لتخزين الملفات. حاول لاحقًا.',
  ),
  'storage/retry-limit-exceeded': message(
    'The file operation could not finish. Check your connection and try again.',
    'تعذّر إكمال عملية الملف. تحقق من اتصالك وحاول مرة أخرى.',
  ),
  'storage/invalid-checksum': message(
    'The uploaded file was corrupted during transfer. Upload it again.',
    'تلف الملف أثناء النقل. ارفعه مرة أخرى.',
  ),
  'storage/canceled': message(
    'The file operation was cancelled.',
    'تم إلغاء عملية الملف.',
  ),
  'storage/invalid-url': message(
    'The file address is invalid.',
    'عنوان الملف غير صالح.',
  ),
  'storage/invalid-argument': message(
    'The file request contains invalid data.',
    'طلب الملف يحتوي على بيانات غير صالحة.',
  ),
  'storage/server-file-wrong-size': message(
    'The uploaded file size could not be verified. Upload it again.',
    'تعذّر التحقق من حجم الملف المرفوع. ارفعه مرة أخرى.',
  ),
};

const GENERIC_MESSAGES: Readonly<Record<'auth' | 'firestore' | 'functions' | 'storage', LocalizedMessage>> = {
  auth: message(
    'Authentication could not be completed. Try again.',
    'تعذّر إكمال تسجيل الدخول. حاول مرة أخرى.',
  ),
  firestore: message(
    'The cloud database request failed. Try again.',
    'فشل طلب قاعدة البيانات السحابية. حاول مرة أخرى.',
  ),
  functions: message(
    'The cloud action failed. Try again.',
    'فشل الإجراء السحابي. حاول مرة أخرى.',
  ),
  storage: message(
    'The cloud file operation failed. Try again.',
    'فشلت عملية الملف السحابي. حاول مرة أخرى.',
  ),
};

let activeLocale: Locale = 'en';

export const setFirebaseErrorLocale = (locale: Locale): void => {
  activeLocale = locale;
};

const firebaseCode = (error: unknown): string | null => {
  if (typeof error === 'object' && error !== null) {
    const code = (error as FirebaseErrorLike).code;
    if (typeof code === 'string' && code.includes('/')) return code;

    const rawMessage = (error as FirebaseErrorLike).message;
    if (typeof rawMessage === 'string') {
      const match = /\(((?:auth|firestore|functions|storage)\/[^)]+)\)/u.exec(rawMessage);
      if (match?.[1]) return match[1];
      if (rawMessage.includes('Missing or insufficient permissions')) {
        return 'firestore/permission-denied';
      }
    }
  }
  return null;
};

export const firebaseErrorMessage = (
  error: unknown,
  locale: Locale = activeLocale,
): string | null => {
  const code = firebaseCode(error);
  if (!code) return null;
  const exact = FIREBASE_ERROR_MESSAGES[code];
  if (exact) return exact[locale];
  const family = code.split('/')[0];
  if (family === 'auth' || family === 'firestore' || family === 'functions' || family === 'storage') {
    return GENERIC_MESSAGES[family][locale];
  }
  return null;
};

export const userFacingErrorMessage = (
  error: unknown,
  locale: Locale,
  fallback: string,
): string => {
  const translated = firebaseErrorMessage(error, locale);
  if (translated) return translated;
  return error instanceof Error && error.message.trim() ? error.message : fallback;
};

const normalizeFirebaseError = (error: unknown): unknown => {
  const translated = firebaseErrorMessage(error);
  return translated ? new Error(translated, { cause: error }) : error;
};

export const withFirebaseErrorTranslation = <Service extends object>(service: Service): Service =>
  new Proxy(service, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== 'function') return value;
      const method = value as (...arguments_: unknown[]) => unknown;
      return (...arguments_: unknown[]) => {
        try {
          const result = Reflect.apply(method, target, arguments_);
          if (result instanceof Promise) {
            return result.catch((error: unknown) => {
              throw normalizeFirebaseError(error);
            });
          }
          return result;
        } catch (error) {
          throw normalizeFirebaseError(error);
        }
      };
    },
  });
