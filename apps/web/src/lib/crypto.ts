import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";
const ivLength = 16;
const saltLength = 64;
const tagLength = 16;

/**
 * Get encryption key from environment
 */
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Key should be 32 bytes (64 hex chars)
  return Buffer.from(key, "hex");
}

/**
 * Encrypt sensitive data (OAuth tokens)
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(ivLength);
  const salt = randomBytes(saltLength);

  const cipher = createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  const tag = cipher.getAuthTag();

  // Combine salt + iv + tag + encrypted
  const combined = Buffer.concat([salt, iv, tag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  const key = getKey();
  const combined = Buffer.from(encryptedData, "base64");

  // Extract components
  const salt = combined.subarray(0, saltLength);
  const iv = combined.subarray(saltLength, saltLength + ivLength);
  const tag = combined.subarray(saltLength + ivLength, saltLength + ivLength + tagLength);
  const encrypted = combined.subarray(saltLength + ivLength + tagLength);

  const decipher = createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
