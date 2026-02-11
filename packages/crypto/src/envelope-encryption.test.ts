import { describe, it, expect, beforeEach } from "vitest";
import { envelopeEncrypt, envelopeDecrypt } from "./envelope-encryption.js";
import type { EncryptedPayload } from "./types.js";

describe("Envelope Encryption", () => {
  let masterKey: string;
  let testPayload: object;

  beforeEach(() => {
    // Generate a valid 256-bit master key (32 bytes = 64 hex characters)
    masterKey = "a".repeat(64);

    testPayload = {
      from: "alice",
      to: "bob",
      amount: 100,
      timestamp: "2026-02-12T10:00:00Z",
    };
  });

  describe("Valid encryption and decryption", () => {
    it("should encrypt and decrypt payload successfully", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      expect(encrypted).toBeDefined();
      expect(encrypted.alg).toBe("AES-256-GCM");
      expect(encrypted.mk_version).toBe(1);

      const decrypted = envelopeDecrypt(encrypted, masterKey);

      expect(decrypted).toEqual(testPayload);
    });

    it("should encrypt and decrypt complex nested objects", () => {
      const complexPayload = {
        transaction: {
          id: "tx_123",
          parties: ["alice", "bob"],
          amount: 99.99,
          metadata: {
            region: "US",
            timestamp: 1234567890,
          },
        },
        status: "pending",
      };

      const encrypted = envelopeEncrypt(complexPayload, masterKey);
      const decrypted = envelopeDecrypt(encrypted, masterKey);

      expect(decrypted).toEqual(complexPayload);
    });

    it("should generate unique encryption outputs for same payload", () => {
      const encrypted1 = envelopeEncrypt(testPayload, masterKey);
      const encrypted2 = envelopeEncrypt(testPayload, masterKey);

      // Different nonces should produce different ciphertexts
      expect(encrypted1.payload_ct).not.toBe(encrypted2.payload_ct);
      expect(encrypted1.payload_nonce).not.toBe(encrypted2.payload_nonce);

      // But both should decrypt to same payload
      expect(envelopeDecrypt(encrypted1, masterKey)).toEqual(testPayload);
      expect(envelopeDecrypt(encrypted2, masterKey)).toEqual(testPayload);
    });
  });

  describe("Tampering detection - Ciphertext", () => {
    it("should fail when payload ciphertext is tampered", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Flip a bit in the ciphertext
      const tamperedCiphertext = encrypted.payload_ct
        .slice(0, -2)
        .concat(
          (parseInt(encrypted.payload_ct.slice(-2), 16) ^ 0xff)
            .toString(16)
            .padStart(2, "0")
        );

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_ct: tamperedCiphertext,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        "Decryption failed: data has been tampered with"
      );
    });

    it("should fail when DEK ciphertext is tampered", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Flip a bit in the DEK wrapped ciphertext
      const tamperedDekWrapped = encrypted.dek_wrapped
        .slice(0, -2)
        .concat(
          (parseInt(encrypted.dek_wrapped.slice(-2), 16) ^ 0xff)
            .toString(16)
            .padStart(2, "0")
        );

      const tampered: EncryptedPayload = {
        ...encrypted,
        dek_wrapped: tamperedDekWrapped,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        "Decryption failed: data has been tampered with"
      );
    });
  });

  describe("Tampering detection - Authentication Tag", () => {
    it("should fail when payload tag is tampered", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Flip a bit in the authentication tag
      const tamperedTag = encrypted.payload_tag
        .slice(0, -2)
        .concat(
          (parseInt(encrypted.payload_tag.slice(-2), 16) ^ 0xff)
            .toString(16)
            .padStart(2, "0")
        );

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_tag: tamperedTag,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        "Decryption failed: data has been tampered with"
      );
    });

    it("should fail when DEK wrap tag is tampered", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Flip a bit in the DEK wrap authentication tag
      const tamperedWrapTag = encrypted.dek_wrap_tag
        .slice(0, -2)
        .concat(
          (parseInt(encrypted.dek_wrap_tag.slice(-2), 16) ^ 0xff)
            .toString(16)
            .padStart(2, "0")
        );

      const tampered: EncryptedPayload = {
        ...encrypted,
        dek_wrap_tag: tamperedWrapTag,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        "Decryption failed: data has been tampered with"
      );
    });
  });

  describe("Validation - Nonce length", () => {
    it("should fail when payload nonce is too short", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Nonce should be 12 bytes (24 hex chars), make it 10 bytes (20 hex chars)
      const shortNonce = encrypted.payload_nonce.slice(0, 20);

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_nonce: shortNonce,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Nonce must be exactly 12 bytes/
      );
    });

    it("should fail when payload nonce is too long", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Make nonce too long (14 bytes = 28 hex chars)
      const longNonce = encrypted.payload_nonce + "0000";

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_nonce: longNonce,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Nonce must be exactly 12 bytes/
      );
    });

    it("should fail when DEK wrap nonce is wrong length", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // DEK wrap nonce too short
      const shortNonce = encrypted.dek_wrap_nonce.slice(0, 16);

      const tampered: EncryptedPayload = {
        ...encrypted,
        dek_wrap_nonce: shortNonce,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Nonce must be exactly 12 bytes/
      );
    });
  });

  describe("Validation - Authentication Tag length", () => {
    it("should fail when payload tag is too short", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Tag should be 16 bytes (32 hex chars), make it 14 bytes (28 hex chars)
      const shortTag = encrypted.payload_tag.slice(0, 28);

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_tag: shortTag,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Tag must be exactly 16 bytes/
      );
    });

    it("should fail when payload tag is too long", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Tag too long (18 bytes = 36 hex chars)
      const longTag = encrypted.payload_tag + "0000";

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_tag: longTag,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Tag must be exactly 16 bytes/
      );
    });

    it("should fail when DEK wrap tag is wrong length", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // DEK wrap tag too short
      const shortTag = encrypted.dek_wrap_tag.slice(0, 20);

      const tampered: EncryptedPayload = {
        ...encrypted,
        dek_wrap_tag: shortTag,
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Tag must be exactly 16 bytes/
      );
    });
  });

  describe("Validation - Hex format", () => {
    it("should fail when ciphertext is not valid hex", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_ct: "NOT_HEX_STRING_XYZ",
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Invalid hex format/
      );
    });

    it("should fail when nonce is not valid hex", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_nonce: "GGGGGGGGGGGGGGGGGGGGGGGG", // G is not a hex char
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Invalid hex format/
      );
    });

    it("should fail when tag is not valid hex", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      const tampered: EncryptedPayload = {
        ...encrypted,
        payload_tag: "ZZZZZZZZZZZZZZZZZZZZZZZZ", // Z is not valid hex
      };

      expect(() => envelopeDecrypt(tampered, masterKey)).toThrow(
        /Invalid hex format/
      );
    });
  });

  describe("Validation - Master Key", () => {
    it("should fail when master key is wrong length", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Master key too short (should be 64 hex chars for 32 bytes)
      const wrongKey = "a".repeat(32);

      expect(() => envelopeDecrypt(encrypted, wrongKey)).toThrow(
        "Master key must be 32 bytes"
      );
    });

    it("should fail when master key is invalid format", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      expect(() => envelopeDecrypt(encrypted, "INVALID_KEY")).toThrow();
    });

    it("should fail when using different master key for decryption", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      // Different master key (32 bytes = 64 hex chars)
      const differentKey = "b".repeat(64);

      expect(() => envelopeDecrypt(encrypted, differentKey)).toThrow(
        "Decryption failed: data has been tampered with"
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string payload", () => {
      const emptyPayload = {};
      const encrypted = envelopeEncrypt(emptyPayload, masterKey);
      const decrypted = envelopeDecrypt(encrypted, masterKey);

      expect(decrypted).toEqual(emptyPayload);
    });

    it("should handle payload with special characters", () => {
      const specialPayload = {
        message: "Hello 世界 🌍 émojis!",
        symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
      };

      const encrypted = envelopeEncrypt(specialPayload, masterKey);
      const decrypted = envelopeDecrypt(encrypted, masterKey);

      expect(decrypted).toEqual(specialPayload);
    });

    it("should handle large payloads", () => {
      const largePayload = {
        data: "x".repeat(10000), // 10KB of data
        count: 10000,
      };

      const encrypted = envelopeEncrypt(largePayload, masterKey);
      const decrypted = envelopeDecrypt(encrypted, masterKey);

      expect(decrypted).toEqual(largePayload);
    });
  });

  describe("Encrypted payload structure", () => {
    it("should have all required fields in encrypted output", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      expect(encrypted).toHaveProperty("payload_nonce");
      expect(encrypted).toHaveProperty("payload_ct");
      expect(encrypted).toHaveProperty("payload_tag");
      expect(encrypted).toHaveProperty("dek_wrap_nonce");
      expect(encrypted).toHaveProperty("dek_wrapped");
      expect(encrypted).toHaveProperty("dek_wrap_tag");
      expect(encrypted).toHaveProperty("alg");
      expect(encrypted).toHaveProperty("mk_version");
    });

    it("should have correct algorithm and version", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);

      expect(encrypted.alg).toBe("AES-256-GCM");
      expect(encrypted.mk_version).toBe(1);
    });

    it("should have valid hex strings for all cryptographic components", () => {
      const encrypted = envelopeEncrypt(testPayload, masterKey);
      const hexRegex = /^[0-9a-f]+$/i;

      expect(encrypted.payload_nonce).toMatch(hexRegex);
      expect(encrypted.payload_ct).toMatch(hexRegex);
      expect(encrypted.payload_tag).toMatch(hexRegex);
      expect(encrypted.dek_wrap_nonce).toMatch(hexRegex);
      expect(encrypted.dek_wrapped).toMatch(hexRegex);
      expect(encrypted.dek_wrap_tag).toMatch(hexRegex);
    });
  });
});
