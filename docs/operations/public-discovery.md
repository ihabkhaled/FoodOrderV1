# Public discovery and contact operations

FoodOrderV1 publishes ten reviewed marketing/policy pages in thirteen complete locales.
`npm run build:web` creates 130 static localized documents, a sitemap index with one
bounded child sitemap per locale, localized RSS feeds at `/{locale}/feed.xml` and
`/{locale}/feeds/topics.xml`, environment-aware `robots.txt`, and noindex system pages.
English uses the explicit `/en` segment just like every other locale. Legacy unprefixed
English public URLs permanently redirect to their `/en/...` canonical equivalents.

Only the canonical production origin is indexable. Preview and local builds emit a global
robots disallow and noindex metadata. Private application, auth, invitation, bucket,
session, order, social, and settings routes never enter sitemaps or feeds.

Every reviewed public page has a distinct locale URL and appears in the locale child
sitemaps (130 URLs total). Production `robots.txt` allows every crawler to fetch public
content and advertises `/sitemap.xml`. Authenticated and shared-user routes stay excluded
because they can contain private account, order, invitation, and collaboration data.
The localized Contact Us page is present in both desktop and mobile public navigation.
Application navigation also preserves the language in the URL (`/en/app`,
`/ar/auth/forgot`, and so on), but those private/transactional routes remain noindex and
never enter public discovery artifacts.

The enhanced contact form submits in place (no navigation to `/api/contact`), includes a
required subject, and reports exactly one localized success or error state. Email delivery is disabled unless
`CONTACT_EMAIL_ENABLED=true` and all SMTP sender/recipient credentials are configured as
sensitive Vercel variables. The endpoint limits body size and field lengths, validates
email syntax, uses a honeypot, rate-limits best-effort per warm instance, and never logs
message content. Platform-level rate limiting should protect production because
serverless in-memory limits are not globally authoritative.

Vite development exposes the same `/api/contact` validation path. It uses configured SMTP
credentials when present; otherwise it falls back to an ephemeral Ethereal account.
Successful Ethereal sends log only the message ID and preview URL, never message content.
Production never enables the fallback transport and requires the sensitive variables
listed in `.env.example`.

Password-reset requests use Firebase Admin only to mint the one-time action code. The
application delivers the localized reset message through the same `CONTACT_SMTP_*`
transport, so Firebase does not send the email. Configure
`FIREBASE_SERVICE_ACCOUNT_JSON` as a Sensitive server environment variable in Vercel; it
must never be exposed through a `VITE_*` variable or committed. The compatibility name
`FIREBASE_SERVICE_ACCOUNT` and standard Application Default Credentials are also accepted
server-side. Email subject/body/action copy and the Firebase action-link `lang` parameter
use the language selected on the requesting page. Known and unknown addresses receive the
same API response to prevent account enumeration.

If private data is accidentally published, disable production indexing, remove the
artifact, redeploy, request removal in the relevant search console, and record an
incident without copying the exposed content into logs or tickets.
