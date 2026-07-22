/** Structural locale union kept inside the packages layer. */
export type FirebaseErrorLocale =
  | 'en'
  | 'ar'
  | 'it'
  | 'fa'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt-BR'
  | 'hi'
  | 'th'
  | 'zh-CN'
  | 'ja';

export type FirebaseErrorFamily =
  | 'auth'
  | 'firestore'
  | 'functions'
  | 'storage';

export type FirebaseErrorMessageKey =
  | 'invalidCredentials'
  | 'emailAlreadyInUse'
  | 'signInAgain'
  | 'permissionDeniedData'
  | 'permissionDeniedAction'
  | 'notFound'
  | 'conflict'
  | 'invalidRequest'
  | 'serviceUnavailable'
  | 'fileFailure'
  | 'authGeneric'
  | 'firestoreGeneric'
  | 'functionsGeneric'
  | 'storageGeneric';

export type FirebaseErrorMessagesByLocale = Readonly<
  Record<
    FirebaseErrorLocale,
    Readonly<Record<FirebaseErrorMessageKey, string>>
  >
>;
