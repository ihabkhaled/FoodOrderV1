# Public discovery and contact operations

FoodOrderV1 publishes ten reviewed marketing/policy pages in twelve complete locales.
`npm run build:web` creates 120 static localized documents, a sitemap index with one
bounded child sitemap per locale, localized RSS feeds at `/{locale}/feed.xml` and
`/{locale}/feeds/topics.xml`, environment-aware `robots.txt`, and noindex system pages.
English uses `/feed.xml`; other feeds use their existing locale segment.

Only the canonical production origin is indexable. Preview and local builds emit a global
robots disallow and noindex metadata. Private application, auth, invitation, bucket,
session, order, social, and settings routes never enter sitemaps or feeds.

The contact page posts to `/api/contact`. Email delivery is disabled unless
`CONTACT_EMAIL_ENABLED=true` and all SMTP sender/recipient credentials are configured as
sensitive Vercel variables. The endpoint limits body size and field lengths, validates
email syntax, uses a honeypot, rate-limits best-effort per warm instance, and never logs
message content. Platform-level rate limiting should protect production because
serverless in-memory limits are not globally authoritative.

If private data is accidentally published, disable production indexing, remove the
artifact, redeploy, request removal in the relevant search console, and record an
incident without copying the exposed content into logs or tickets.
