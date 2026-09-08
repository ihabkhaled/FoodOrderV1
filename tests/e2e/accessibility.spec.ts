import { expect, type Page, test } from '@playwright/test';

import { suppressFeatureTours } from './helpers/featureTours';

const register = async (page: Page, suffix: string): Promise<void> => {
  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Access Tester');
  await page.getByLabel('Email').fill(`a11y-${suffix}-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('Password1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/app$/u);
};

/**
 * Accessibility rules checked in the browser rather than reviewed by eye.
 *
 * Written here rather than pulled from a library because only three rules
 * matter for this product's promise - text people can read, controls they can
 * hit, and fields a screen reader can name - and adding a dependency would
 * require an owned package facade under this repository's rules for a check
 * that fits in a page of code.
 */
const AUDIT = `() => {
  const parseColor = (value) => {
    // Chromium serialises the result of color-mix() as the CSS Color 4
    // color(srgb r g b) function, whose channels are 0-1, not the 0-255
    // scale that classic rgb()/rgba() use. Reading both the same way silently
    // read a light, nearly-opaque background as almost black and produced a
    // wave of contrast failures that were artifacts of this parser, not of
    // the interface - caught by cross-checking the same computed colour
    // against an independent calculation, which disagreed.
    //
    // Parsed with string splitting rather than a regex: this whole function
    // is itself embedded in an outer template literal (it is sent to the
    // browser as a string and evaluated there), and a regex escape such as
    // a regex escape survives only if it is escaped twice - once for each
    // literal it passes through. Splitting avoids that trap entirely.
    if (value.indexOf('color(srgb') === 0) {
      const inner = value.slice('color(srgb'.length, value.lastIndexOf(')')).trim();
      const [channels, alphaPart] = inner.split('/');
      const [r, g, b] = channels.trim().split(' ').filter(Boolean).map(Number);
      const a = alphaPart === undefined ? 1 : Number(alphaPart.trim());
      return { r: r * 255, g: g * 255, b: b * 255, a };
    }
    const parts = value.match(/[0-9.]+/gu);
    if (!parts) return null;
    const [r, g, b, a = '1'] = parts.map(Number);
    return { r, g, b, a };
  };

  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const luminance = ({ r, g, b }) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

  // The nearest ancestor that actually paints something, because a transparent
  // background inherits whatever is behind it.
  // Returns null when the real background cannot be determined from
  // background-color alone. A gradient (background-image) paints the
  // element but leaves background-color transparent, so a walk that only
  // reads background-color skips straight past it - to whatever solid
  // colour is behind it further up the tree, which in a themed app is often
  // the opposite theme's page background. That produced a run of contrast
  // failures for text that was never actually near-invisible: dark ink on a
  // light gradient card, measured against the dark page colour three
  // ancestors above it. Text on a gradient is out of scope for this check
  // and has to be verified separately, against the gradient's real stops.
  const backgroundOf = (element) => {
    let node = element;
    while (node) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== 'none') return null;
      const colour = parseColor(style.backgroundColor);
      if (colour && colour.a > 0) return colour;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const contrast = (fg, bg) => {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (light + 0.05) / (dark + 0.05);
  };

  // A rect list is non-empty even for a zero-area box, so a label collapsed
  // to width:0 (the desktop sidebar's icon-only state) passed this check and
  // was audited as if a person could read it - it can't, there's nothing to
  // see. The bounding rect's own size is what actually determines that.
  const visible = (element) => {
    if (element.offsetParent === null) return false;
    if (getComputedStyle(element).visibility === 'hidden') return false;
    if (element.getClientRects().length === 0) return false;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };

  const lowContrast = [];
  const smallTargets = [];
  const unnamedFields = [];
  const imagesWithoutAlt = [];

  for (const element of document.querySelectorAll('body *')) {
    if (!visible(element)) continue;
    const style = getComputedStyle(element);

    const ownText = [...element.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent.trim())
      .join('');
    if (ownText.length > 1) {
      const fg = parseColor(style.color);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const bg = fg && fg.a > 0 ? backgroundOf(element) : null;
      if (fg && bg) {
        const ratio = contrast(fg, bg);
        const required = large ? 3 : 4.5;
        if (ratio < required) {
          lowContrast.push(
            element.tagName.toLowerCase() + '.' + element.className +
            ' "' + ownText.slice(0, 24) + '" ' + ratio.toFixed(2) + ':1 < ' + required,
          );
        }
      }
    }

    const interactive =
      element.matches('a[href], button, input, select, textarea, [role="button"]') &&
      !element.matches('input[type="hidden"]');
    if (interactive) {
      const box = element.getBoundingClientRect();
      // Inline links inside a sentence are exempt: enlarging them would break
      // the paragraph they belong to.
      const inlineLink =
        element.tagName === 'A' && getComputedStyle(element).display === 'inline';
      if (!inlineLink && (box.width < 44 || box.height < 44)) {
        smallTargets.push(
          element.tagName.toLowerCase() + '.' + element.className +
          ' ' + Math.round(box.width) + 'x' + Math.round(box.height),
        );
      }
    }

    if (element.matches('input:not([type="hidden"]), select, textarea')) {
      const id = element.id;
      const named =
        (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')) ||
        element.closest('label') ||
        element.getAttribute('aria-label') ||
        element.getAttribute('aria-labelledby') ||
        element.getAttribute('title');
      if (!named) unnamedFields.push(element.tagName.toLowerCase() + '#' + (id || '(no id)'));
    }

    if (element.tagName === 'IMG' && !element.hasAttribute('alt')) {
      imagesWithoutAlt.push(element.getAttribute('src') || '(no src)');
    }
  }

  return { lowContrast, smallTargets, unnamedFields, imagesWithoutAlt };
}`;

interface AuditResult {
  lowContrast: string[];
  smallTargets: string[];
  unnamedFields: string[];
  imagesWithoutAlt: string[];
}

const SCREENS = ['/app', '/buckets', '/sessions', '/social', '/settings'];

test.describe('accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await suppressFeatureTours(page);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`text, targets and fields hold up in the ${theme} theme`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await register(page, theme);
      // Set through the real Settings control rather than mutating the DOM
      // directly. This app resolves data-theme from the signed-in profile on
      // every navigation - including the full page reload page.goto() does in
      // this SPA - so a one-off dataset write was silently discarded the
      // moment the loop moved to the next screen, and every screen after the
      // first was actually audited under the system default, not the theme
      // the test claimed. Setting it here persists it, the same as a user
      // choosing it once in Settings.
      await page.goto('/settings/preferences');
      // The label wraps the select, so its accessible name concatenates the
      // option text ("ThemeSystemLightDark"); match by role instead of an exact label.
      await page.getByRole('combobox', { name: /Theme/u }).selectOption(theme);
      // The theme select is a local draft like the rest of this form; nothing
      // is applied or persisted until Save is submitted. My first version of
      // this test changed the control and asserted the result without that
      // step, so it never actually exercised the theme it named.
      await page.getByRole('button', { name: 'Save' }).click();
      // Under the full cross-browser suite's parallel load, the default 5s
      // poll on data-theme sometimes ran out before the save round-trip
      // finished and failed on the wrong symptom (theme never changed,
      // instead of save-is-still-in-flight). The toast the form itself
      // raises on success is the real completion signal and gives the save
      // as long as it needs; asserting data-theme afterwards can only fail
      // for a genuine defect, not a race with this test's own timeout.
      await expect(page.getByText('Preferences saved.')).toBeVisible();
      // Software-rendered WebKit already gets a 30s actionTimeout in this
      // config for the same reason (frame delivery under load, not a product
      // defect) - expect() polling doesn't inherit that budget, so it kept
      // running out here specifically on webkit/mobile-safari even after the
      // toast confirmed the save itself had gone through.
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        theme === 'dark' ? 'dark' : 'light',
        { timeout: 15_000 },
      );

      for (const screen of SCREENS) {
        await page.goto(screen);
        await expect(page.locator('.bottom-nav')).toBeVisible();
        // The theme is applied by a post-render effect, not before first
        // paint, so a fresh navigation briefly paints light-theme colour
        // variables before data-theme is set and then animates to the real
        // ones over the 140ms --motion-fast transition. Evaluating right on
        // the heels of the visibility check could sample a mid-transition
        // frame and flag a colour nobody actually reads it as - a person
        // isn't judged on a 140ms animation either. Outlasting the longest
        // transition this app defines settles that before auditing. Polling
        // the nav link's own computed colour across two animation frames -
        // rather than a fixed sleep - waits on that transition itself, however
        // long it actually runs.
        // Comparing one frame to the next only proves the transition hadn't
        // started yet or had already finished by chance - it doesn't wait the
        // transition out. Playwright's own default poll cadence for
        // waitForFunction is itself one animation frame, so recording the
        // previous poll's snapshot on window and comparing against it turns
        // that repeated polling into "stable across two *separate* polls",
        // which holds regardless of when the transition happens to start.
        await page.waitForFunction(() => {
          const snapshot = [...document.querySelectorAll('.bottom-nav-link')]
            .map((link) => {
              const style = getComputedStyle(link);
              return `${style.color}|${style.backgroundColor}|${style.backgroundImage}`;
            })
            .join(';');
          const bag = window as unknown as { __a11yPrevNavSnapshot?: string };
          const stable = bag.__a11yPrevNavSnapshot === snapshot;
          bag.__a11yPrevNavSnapshot = snapshot;
          return stable;
        });
        // Evaluated as an expression, so the function has to be invoked.
        const result = await page.evaluate<AuditResult>(`(${AUDIT})()`);

        expect(result.lowContrast, `${screen} (${theme}) contrast`).toEqual([]);
        expect(result.smallTargets, `${screen} (${theme}) touch targets`).toEqual([]);
        expect(result.unnamedFields, `${screen} (${theme}) unlabelled fields`).toEqual([]);
        expect(result.imagesWithoutAlt, `${screen} (${theme}) images`).toEqual([]);
      }
    });
  }
});
