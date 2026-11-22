import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return { salt, passwordHash: hash.toString("hex") };
}

export async function verifyPassword(password, salt, passwordHash) {
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(passwordHash, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
