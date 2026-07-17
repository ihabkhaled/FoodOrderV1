// Regenerate every app-icon / splash source asset from a single master logo.
//
//   Input : resources/source-logo.png  (the brand mark on its dark field)
//   Output: resources/{icon-only,icon-foreground,icon-background,splash,splash-dark}.png
//           public/icon.svg, public/apple-touch-icon.png
//
// The mark sits on a near-black green field (#020d0b) sampled from the master.
// Icons keep that dark field ("visible and clear" = mark enlarged, dark kept).
// Native fan-out (Android mipmaps + iOS AppIcon) is done afterwards by
// @capacitor/assets, which consumes the resources/ files this script writes.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'resources/source-logo.png';
const BG = { r: 2, g: 13, b: 11 }; // #020d0b — sampled from the master's field
const BG_HEX = '#020d0b';
const OPAQUE = { ...BG, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// Tight crop of just the mark (drops the dark border of the master).
const trimmed = await sharp(SRC).trim({ threshold: 30 }).png().toBuffer({ resolveWithObject: true });
console.log(`trimmed mark: ${trimmed.info.width}x${trimmed.info.height}`);

/** Mark scaled to fit `box`, centered on a `size` canvas over `bg`. */
async function markOn(size, box, bg, out) {
  const fg = await sharp(trimmed.data).resize(box, box, { fit: 'inside' }).png().toBuffer();
  const buf = await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: fg, gravity: 'center' }])
    .png()
    .toBuffer();
  if (out) await sharp(buf).toFile(out);
  return buf;
}

// --- resources/ (consumed by @capacitor/assets) ---
// iOS + legacy flat icon: full master contained on the dark field, opaque.
await sharp(SRC).resize(1024, 1024, { fit: 'contain', background: OPAQUE }).flatten({ background: OPAQUE })
  .png().toFile('resources/icon-only.png');
// Android adaptive background: solid dark field.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: OPAQUE } })
  .png().toFile('resources/icon-background.png');
// Android adaptive foreground: mark in the ~64% safe zone, transparent margins.
await markOn(1024, 655, CLEAR, 'resources/icon-foreground.png');
// Splash (light + dark both use the dark field for brand consistency).
await markOn(2732, 760, OPAQUE, 'resources/splash.png');
await markOn(2732, 760, OPAQUE, 'resources/splash-dark.png');

// --- public/ (PWA) ---
// Maskable-safe: full-bleed dark, mark in center ~66%.
const pwa512 = await markOn(512, 338, OPAQUE, null);
const b64 = pwa512.toString('base64');
await writeFile(
  'public/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${BG_HEX}"/><image href="data:image/png;base64,${b64}" width="512" height="512"/></svg>\n`,
);
await markOn(180, 119, OPAQUE, 'public/apple-touch-icon.png');

console.log('done: resources/{icon-only,icon-foreground,icon-background,splash,splash-dark}.png, public/{icon.svg,apple-touch-icon.png}');
