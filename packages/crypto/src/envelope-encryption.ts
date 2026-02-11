import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { EncryptedPayload } from "./types";
import { bytesToHex, hexToBytes, validateEncryptedData } from "./validation";

const ALGORITHM = "aes-256-gcm";
const DEK_SIZE = 32;
const NONCE_SIZE = 12;
const TAG_SIZE = 16;

function encryptWithKey(
  plaintext: Buffer,
  key: Buffer
): { ciphertext: Buffer; nonce: Buffer; tag: Buffer } {
  const nonce = randomBytes(NONCE_SIZE);
  const cipher = createCipheriv(ALGORITHM, key, nonce);

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const tag = cipher.getAuthTag();

  return { ciphertext, nonce, tag };
}

function decryptWithKey(
  ciphertext: Buffer,
  key: Buffer,
  nonce: Buffer,
  tag: Buffer
): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext;
}

export function envelopeEncrypt(
  payload: object,
  masterKey: string
): EncryptedPayload {
  const masterKeyBuffer = hexToBytes(masterKey);

  if (masterKeyBuffer.length !== 32) {
    throw new Error("Master key must be 32 bytes (64 hex characters)");
  }

  const dek = randomBytes(DEK_SIZE);

  const payloadJson = JSON.stringify(payload);
  const payloadBuffer = Buffer.from(payloadJson, "utf-8");

  const {
    ciphertext: payload_ct_buffer,
    nonce: payload_nonce_buffer,
    tag: payload_tag_buffer,
  } = encryptWithKey(payloadBuffer, dek);

  const {
    ciphertext: dek_wrapped_buffer,
    nonce: dek_wrap_nonce_buffer,
    tag: dek_wrap_tag_buffer,
  } = encryptWithKey(dek, masterKeyBuffer);

  return {
    payload_nonce: bytesToHex(payload_nonce_buffer),
    payload_ct: bytesToHex(payload_ct_buffer),
    payload_tag: bytesToHex(payload_tag_buffer),
    dek_wrap_nonce: bytesToHex(dek_wrap_nonce_buffer),
    dek_wrapped: bytesToHex(dek_wrapped_buffer),
    dek_wrap_tag: bytesToHex(dek_wrap_tag_buffer),
    alg: "AES-256-GCM",
    mk_version: 1,
  };
}

export function envelopeDecrypt(
  encryptedData: EncryptedPayload,
  masterKey: string
): object {
  const payloadErrors = validateEncryptedData({
    nonce: encryptedData.payload_nonce,
    ct: encryptedData.payload_ct,
    tag: encryptedData.payload_tag,
  });

  const dekErrors = validateEncryptedData({
    nonce: encryptedData.dek_wrap_nonce,
    ct: encryptedData.dek_wrapped,
    tag: encryptedData.dek_wrap_tag,
  });

  const allErrors = [...payloadErrors, ...dekErrors];
  if (allErrors.length > 0) {
    throw new Error(
      `Validation failed: ${allErrors.map((e) => `${e.field}: ${e.error}`).join(", ")}`
    );
  }

  const masterKeyBuffer = hexToBytes(masterKey);

  if (masterKeyBuffer.length !== 32) {
    throw new Error("Master key must be 32 bytes (64 hex characters)");
  }

  try {
    const dek = decryptWithKey(
      hexToBytes(encryptedData.dek_wrapped),
      masterKeyBuffer,
      hexToBytes(encryptedData.dek_wrap_nonce),
      hexToBytes(encryptedData.dek_wrap_tag)
    );

    const payloadBuffer = decryptWithKey(
      hexToBytes(encryptedData.payload_ct),
      dek,
      hexToBytes(encryptedData.payload_nonce),
      hexToBytes(encryptedData.payload_tag)
    );

    const payloadJson = payloadBuffer.toString("utf-8");
    return JSON.parse(payloadJson);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("Unsupported state") ||
        error.message.includes("auth")
      ) {
        throw new Error("Decryption failed: data has been tampered with");
      }
    }
    throw error;
  }
}
