/**
 * PBKDF2-SHA-256 credential hashing for the device-local auth mode. Local
 * mode has no server, so the only safe way to keep a verifiable credential
 * on the device is a salted one-way hash — never the clear text password.
 */
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BITS = 256;

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array((hex.match(/.{2}/gu) ?? []).map((pair) => Number.parseInt(pair, 16)));

export const createPasswordSalt = (): string =>
  toHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));

export const hashPassword = async (
  password: string,
  saltHex: string,
): Promise<string> => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: fromHex(saltHex),
      iterations: PBKDF2_ITERATIONS,
    },
    baseKey,
    DERIVED_KEY_BITS,
  );
  return toHex(new Uint8Array(derivedBits));
};
