// WebCrypto randomUUID is guaranteed on the supported platform baseline
// (Chromium ≥ 92 WebView / evergreen browsers / Node ≥ 19 test runtime).
export const createId = (prefix = 'id'): string => `${prefix}_${crypto.randomUUID()}`;
