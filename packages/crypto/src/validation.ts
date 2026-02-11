import type { ValidationError } from "./types";

export function isValidHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
}

export function hexToBytes(hex: string): Buffer {
  if (!isValidHex(hex)) {
    throw new Error("Invalid hex string");
  }
  return Buffer.from(hex, "hex");
}

export function bytesToHex(bytes: Buffer): string {
  return bytes.toString("hex");
}

export function validateNonce(nonce: string): ValidationError | null {
  if (!isValidHex(nonce)) {
    return { field: "nonce", error: "Invalid hex format" };
  }
  const bytes = hexToBytes(nonce);
  if (bytes.length !== 12) {
    return { field: "nonce", error: "Nonce must be exactly 12 bytes" };
  }
  return null;
}

export function validateTag(tag: string): ValidationError | null {
  if (!isValidHex(tag)) {
    return { field: "tag", error: "Invalid hex format" };
  }
  const bytes = hexToBytes(tag);
  if (bytes.length !== 16) {
    return { field: "tag", error: "Tag must be exactly 16 bytes" };
  }
  return null;
}

export function validateCiphertext(ct: string): ValidationError | null {
  if (!isValidHex(ct)) {
    return { field: "ciphertext", error: "Invalid hex format" };
  }
  if (ct.length === 0) {
    return { field: "ciphertext", error: "Ciphertext cannot be empty" };
  }
  return null;
}

export function validateEncryptedData(data: {
  nonce: string;
  ct: string;
  tag: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  const nonceError = validateNonce(data.nonce);
  if (nonceError) errors.push(nonceError);

  const tagError = validateTag(data.tag);
  if (tagError) errors.push(tagError);

  const ctError = validateCiphertext(data.ct);
  if (ctError) errors.push(ctError);

  return errors;
}
