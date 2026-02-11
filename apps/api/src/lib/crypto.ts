import { envelopeEncrypt, envelopeDecrypt } from "@repo/crypto";
import type { EncryptedPayload } from "@repo/crypto";

const MASTER_KEY = process.env.MASTER_KEY || "";

if (!MASTER_KEY || MASTER_KEY.length !== 64) {
  console.warn(
    "WARNING: MASTER_KEY not set or invalid. Must be 64 hex characters (32 bytes)"
  );
}

export function encryptPayload(payload: object): EncryptedPayload {
  return envelopeEncrypt(payload, MASTER_KEY);
}

export function decryptPayload(encryptedData: EncryptedPayload): object {
  return envelopeDecrypt(encryptedData, MASTER_KEY);
}
