import { useContactForm } from '../hooks/use-contact-form.hook';
import type { PublicContactFormProps } from '../types/public-content.types';

export function PublicContactFormContainer({ copy }: PublicContactFormProps) {
  const view = useContactForm();
  return (
    <section className="public-contact" aria-labelledby="public-contact-heading">
      <h2 id="public-contact-heading">{copy.heading}</h2>
      <form className="public-contact__form" onSubmit={(event) => void view.submit(event)}>
        <label>{copy.name}<input name="name" autoComplete="name" maxLength={120} required /></label>
        <label>{copy.email}<input name="email" type="email" autoComplete="email" maxLength={200} required /></label>
        <label>{copy.subject}<input name="subject" maxLength={200} required /></label>
        <label>{copy.message}<textarea name="message" maxLength={5000} rows={7} required /></label>
        <label className="public-contact__honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <p>{copy.privacy}</p>
        {view.sent ? <p className="public-contact__success" role="status">{copy.success}</p> : null}
        {view.failed ? <p className="public-contact__error" role="alert">{copy.error}</p> : null}
        <button className="public-button" type="submit" disabled={view.busy}>{copy.submit}</button>
      </form>
    </section>
  );
}
