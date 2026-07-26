import type { PublicPageProps } from '../types/public-content.types';

export function PublicPage({
  definition,
  copy,
  applicationPath,
  learnMorePath,
  ui,
  contactForm,
}: PublicPageProps) {
  return (
    <main id="public-main" className="public-main">
      <section className="public-hero">
        <div className="public-hero__content">
          <p className="public-eyebrow">{copy.eyebrow}</p>
          <h1>{copy.heading}</h1>
          <p className="public-hero__introduction">{copy.introduction}</p>
          <div className="public-hero__actions">
            <a className="public-button" href={applicationPath}>
              {ui.openApplicationLabel}
            </a>
            {definition.id !== 'how-it-works' && (
              <a className="public-button public-button--secondary" href={learnMorePath}>
                {ui.learnMoreLabel}
              </a>
            )}
          </div>
        </div>
        <div className="public-hero__visual" aria-hidden="true">
          <span className="public-order-card public-order-card--one" />
          <span className="public-order-card public-order-card--two" />
          <span className="public-order-card public-order-card--three" />
        </div>
      </section>

      {copy.sections.length > 0 && (
        <div className="public-section-grid">
          {copy.sections.map((section) => (
            <section key={section.heading} className="public-content-card">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {copy.faq && (
        <section className="public-faq" aria-labelledby="public-faq-heading">
          <h2 id="public-faq-heading">{copy.navigationLabel}</h2>
          <dl>
            {copy.faq.map((item) => (
              <div key={item.question} className="public-faq__item">
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {definition.id === 'contact' && (
        <section className="public-contact" aria-labelledby="public-contact-heading">
          <h2 id="public-contact-heading">{contactForm.heading}</h2>
          <form className="public-contact__form" action="/api/contact" method="post">
            <label>
              {contactForm.name}
              <input name="name" autoComplete="name" maxLength={120} required />
            </label>
            <label>
              {contactForm.email}
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={200}
                required
              />
            </label>
            <label>
              {contactForm.message}
              <textarea name="message" maxLength={5000} rows={7} required />
            </label>
            <label className="public-contact__honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <p>{contactForm.privacy}</p>
            <button className="public-button" type="submit">
              {contactForm.submit}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
