# Password reset operations

## In-app reset handler

The web app ships its own Firebase email-action handler at the internal route
`/auth/action` (`RESET_PASSWORD_PATH`,
`src/modules/auth/containers/reset-password.container.tsx`). On the web, the active
locale basename makes the external URL `/:locale/auth/action`. When it is opened as
`/ar/auth/action?mode=resetPassword&oobCode=<code>` (for example), it:

1. verifies the one-time `oobCode` with `verifyPasswordResetCode` (verification does
   **not** consume the code),
2. shows the account email plus a new-password + confirmation form, and
3. consumes the code with `confirmPasswordReset` only when the user submits,
   then redirects to the login page.

An invalid, expired, or already-used link renders a localized explanation and a
link back to `/auth/forgot` to request a fresh email.

## Custom SMTP delivery

`POST /api/password-reset` is a serverless boundary. Firebase Admin mints the secure,
single-use reset action link; Nodemailer sends the localized subject/body through the
same `CONTACT_SMTP_*` transport used by contact delivery. Firebase does not send this
custom message.

Required server-only variables:

- `CONTACT_EMAIL_FROM`, `CONTACT_SMTP_HOST`, `CONTACT_SMTP_PORT`,
  `CONTACT_SMTP_SECURE`, `CONTACT_SMTP_USER`, and `CONTACT_SMTP_PASS`.
- `FIREBASE_SERVICE_ACCOUNT_JSON`, containing the complete one-line JSON from a Firebase
  Admin service-account key. `FIREBASE_SERVICE_ACCOUNT` is accepted as a compatibility
  alias; `GOOGLE_APPLICATION_CREDENTIALS`/Application Default Credentials are supported
  for trusted server environments.

Never use a `VITE_*` prefix, commit a service-account file, or log/paste its private key.
Store production/preview values as Vercel Sensitive variables. If a key is exposed,
revoke it immediately and replace every environment/secret that used it.

The requesting document locale selects copy from `api/password-reset.locales.json` and
is added to the Firebase link as `lang`. SMTP acceptance logs contain only the locale and
transport message ID. Account-not-found responses remain indistinguishable from accepted
requests.

## REQUIRED Firebase console step

Until this step is done, emailed reset links keep opening Firebase's **hosted**
action page — not the in-app handler above.

1. Open the Firebase console → **Authentication** → **Templates** →
   **Password reset**.
2. Click the pencil (edit), then **Customize action URL**.
3. Set the Action URL to:

   ```text
   https://<deployed-web-domain>/auth/action
   ```

   Replace `<deployed-web-domain>` with the production web domain (the Vercel
   deployment domain for this project). The unprefixed compatibility route reads the
   action link's `lang` value, normalizes to `/:locale/auth/action`, and preserves the
   one-time query parameters. The domain must also be listed under
   **Authentication → Settings → Authorized domains**.
4. Save. All auth email templates of the project share this action URL.

## Troubleshooting: "This link has expired or has already been used"

Two known causes for that error on the hosted page:

1. **Mail-scanner prefetch.** Corporate/webmail link scanners (Outlook Safe
   Links, some antivirus proxies) fetch the emailed URL before the user clicks
   it. The Firebase-hosted page can consume the one-time `oobCode` during that
   prefetch, so the real click arrives at an already-used code. The in-app SPA
   handler is immune: page load only *verifies* the code; it is consumed only
   when the user submits the form.
2. **API-key HTTP-referrer restrictions.** If the browser API key is
   restricted to specific HTTP referrers in Google Cloud console and the
   Firebase-hosted domain (`<project>.firebaseapp.com`) is not allowed, the
   hosted page fails its verification calls and reports the link as
   expired/invalid. The in-app handler runs on the deployed web domain, which
   must be included in the key's referrer allowlist.

## Alternative without email

Signed-in users can change their password from **Settings → Change password**
(current password + new password). This flow works in both Firebase and
local-device modes and involves no email round-trip at all.
