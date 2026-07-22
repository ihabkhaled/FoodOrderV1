// Regenerate every app-icon / splash source asset from a single master logo.
//
//   Input : resources/source-logo.png  (the brand mark on its dark field)
//   Output: resources/{icon-only,icon-foreground,icon-background,splash,splash-dark}.png
//           public/{icon.svg,favicon.ico,favicon-16.png,favicon-32.png,
//                   apple-touch-icon.png,pwa-icon-192.png,pwa-icon-512.png,
//                   maskable-icon-512.png,social-preview.png}
//
// The mark sits on a near-black green field (#020d0b) sampled from the master.
// Icons keep that dark field ("visible and clear" = mark enlarged, dark kept).
// Native fan-out (Android mipmaps + iOS AppIcon) is done afterwards by
// @capacitor/assets, which consumes the resources/ files this script writes.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'resources/source-logo.png';
const SOCIAL_BACKGROUND = 'resources/social-preview-background-v1.7.1.png';
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

/** Write a single-image ICO whose payload is a standards-compatible PNG. */
async function writePngIco(png, out) {
  const directory = Buffer.alloc(22);
  directory.writeUInt16LE(0, 0); // reserved
  directory.writeUInt16LE(1, 2); // ICO
  directory.writeUInt16LE(1, 4); // one image
  directory[6] = 32;
  directory[7] = 32;
  directory[8] = 0; // true colour
  directory[9] = 0;
  directory.writeUInt16LE(1, 10);
  directory.writeUInt16LE(32, 12);
  directory.writeUInt32LE(png.length, 14);
  directory.writeUInt32LE(directory.length, 18);
  await writeFile(out, Buffer.concat([directory, png]));
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

await markOn(16, 14, OPAQUE, 'public/favicon-16.png');
const favicon32 = await markOn(32, 28, OPAQUE, 'public/favicon-32.png');
await writePngIco(favicon32, 'public/favicon.ico');
await markOn(192, 150, OPAQUE, 'public/pwa-icon-192.png');
await markOn(512, 410, OPAQUE, 'public/pwa-icon-512.png');
await markOn(512, 338, OPAQUE, 'public/maskable-icon-512.png');

// The generated background has no text or logos. Overlay the canonical mark and
// product identity here so the final social preview stays deterministic.
const socialLogo = await sharp(SRC)
  .resize({ width: 180, height: 155, fit: 'contain', background: CLEAR })
  .png()
  .toBuffer();
const socialSvg = [
  '<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">',
  '<defs><linearGradient id="s"><stop stop-color="#020d0b" stop-opacity=".98"/>',
  '<stop offset="1" stop-color="#020d0b" stop-opacity="0"/></linearGradient></defs>',
  '<rect width="790" height="630" fill="url(#s)"/>',
  '<g font-family="Arial, sans-serif" font-weight="600">',
  '<text x="78" y="292" fill="white" font-size="76" font-weight="700">FoodOrder</text>',
  '<text x="82" y="356" fill="#b5f56a" font-size="38">Gama3 Orderak</text>',
  '<text x="82" y="410" fill="white" font-size="34">جمع أوردرَك</text>',
  '<text x="82" y="484" fill="#d7e7df" font-size="26">Plan together. Order clearly.</text>',
  '</g></svg>',
].join('');
const socialText = Buffer.from(socialSvg);
await sharp(SOCIAL_BACKGROUND)
  .resize(1200, 630, { fit: 'cover' })
  .composite([
    { input: socialText, left: 0, top: 0 },
    { input: socialLogo, left: 78, top: 66 },
  ])
  .png({ compressionLevel: 9, palette: true, quality: 92 })
  .toFile('public/social-preview.png');

console.log(
  'done: native sources plus public favicon, PWA, Apple touch, maskable, and social-preview assets',
);
