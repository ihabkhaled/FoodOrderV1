# Public content module

Owns the reviewed multilingual marketing and policy registry, public route matching,
localized metadata, hook-free presentation, contact form, sitemap/RSS generation inputs,
and advertising eligibility. The Vite application renders the same catalog during local
development; `npm run public:generate` prerenders crawler-readable production documents.

The supported locale set is the product's existing twelve-locale contract. Every locale,
including English, has an explicit canonical segment (`/en`, `/ar`, `/pt-br`, and so on).
Legacy unprefixed English public paths redirect to `/en/...`. Do not copy another
project's locale inventory or create a second SEO/content registry.

Public discovery is static and bounded: the sitemap index links to one child sitemap per
locale, each RSS feed contains at most the reviewed registry pages, and no private app
record is queried or exposed. Contact submissions go only to the server-side
`/api/contact` boundary and the form warns against sending private order or credential
data.
