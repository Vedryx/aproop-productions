import { scrypt, timingSafeEqual } from "node:crypto";

const salt = "aproop-admin-password-comparison";
function derive(password: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
  });
}

export function createPasswordVerifier() {
  let cached: { password: string; key: Promise<Buffer> } | undefined;
  return async (provided: string, expected: string) => {
    if (cached?.password !== expected) {
      const entry = { password: expected, key: derive(expected) };
      cached = entry;
      entry.key.catch(() => { if (cached === entry) cached = undefined; });
    }
    const [actual, target] = await Promise.all([derive(provided), cached.key]);
    return timingSafeEqual(actual, target);
  };
}
