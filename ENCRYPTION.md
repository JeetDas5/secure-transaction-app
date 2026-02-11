# Encryption Documentation

## Overview

This application implements **Envelope Encryption** (also known as key wrapping) to secure transaction data. Envelope encryption is a two-layer encryption strategy that provides both security and key management flexibility.

---

## Encryption Algorithm

### AES-256-GCM
- **Algorithm**: AES (Advanced Encryption Standard)
- **Key Size**: 256 bits
- **Mode**: GCM (Galois/Counter Mode) - provides both confidentiality and authenticity
- **Authentication Tag Size**: 128 bits (16 bytes)
- **Nonce Size**: 96 bits (12 bytes)

GCM mode is preferred because it:
- Encrypts data while maintaining authenticity
- Detects tampering automatically
- Provides resistance against timing attacks
- Is highly efficient in hardware and software

---

## Envelope Encryption Flow

### How It Works

Envelope encryption uses **two layers of encryption**:

```
┌─────────────────────────────────────────────┐
│         Transaction Payload (JSON)           │
│    (amount, from, to, timestamp, etc.)      │
└──────────────┬──────────────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │  Generate DEK    │
        │  (32-byte key)   │
        └────────┬─────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    ┌─────────┐      ┌─────────────────────┐
    │ Encrypt │      │  Wrap DEK with MK   │
    │Payload  │      │  (Encrypt DEK)      │
    │ with    │      │                     │
    │  DEK    │      └────────┬────────────┘
    └────┬────┘               │
         │          ┌────────────────────┐
         │          │  Encrypted DEK +   │
         │          │  Wrap Metadata     │
         │          └────────────────────┘
         │                   │
         └───────┬───────────┘
                 │
                 ▼
     ┌──────────────────────────────┐
     │   Encrypted Payload Bundle   │
     │  (stored in database/disk)   │
     └──────────────────────────────┘
```

### Step-by-Step Process

#### Encryption (envelopeEncrypt)

1. **Master Key Input**
   - Accept a 32-byte (256-bit) master key in hexadecimal format
   - Validate key length and format

2. **Generate Data Encryption Key (DEK)**
   - Generate a random 32-byte key for this encryption operation
   - Used to encrypt the actual payload

3. **Encrypt Payload**
   - Convert payload object to JSON string
   - Encrypt JSON with DEK using AES-256-GCM
   - Generate random 12-byte nonce for payload encryption
   - Extract 16-byte authentication tag
   - Result: `payload_ct`, `payload_nonce`, `payload_tag`

4. **Wrap DEK**
   - Encrypt the DEK using the master key (MK) with AES-256-GCM
   - Generate random 12-byte nonce for DEK wrapping
   - Extract 16-byte authentication tag
   - Result: `dek_wrapped`, `dek_wrap_nonce`, `dek_wrap_tag`

5. **Output EncryptedPayload**
   ```typescript
   {
     payload_nonce: string,      // 12 bytes as hex (24 chars)
     payload_ct: string,         // encrypted payload as hex
     payload_tag: string,        // 16 bytes as hex (32 chars)
     dek_wrap_nonce: string,     // 12 bytes as hex (24 chars)
     dek_wrapped: string,        // encrypted DEK as hex
     dek_wrap_tag: string,       // 16 bytes as hex (32 chars)
     alg: "AES-256-GCM",         // algorithm identifier
     mk_version: 1               // master key version
   }
   ```

#### Decryption (envelopeDecrypt)

1. **Validate Input**
   - Verify all encrypted components are valid hex strings
   - Verify nonce sizes are exactly 12 bytes
   - Verify authentication tags are exactly 16 bytes
   - Verify ciphertexts are not empty

2. **Unwrap DEK**
   - Decrypt the wrapped DEK using the master key
   - Validate authentication tag to ensure DEK wasn't tampered with
   - Result: original 32-byte DEK

3. **Decrypt Payload**
   - Use unwrapped DEK to decrypt the payload ciphertext
   - Validate authentication tag to ensure payload wasn't tampered with
   - Result: JSON string

4. **Parse and Return**
   - Parse JSON string back to JavaScript object
   - Return decrypted transaction payload

---

## Key Components

### Master Key (MK)
- **Size**: 32 bytes (256 bits)
- **Format**: Hexadecimal string (64 characters)
- **Lifecycle**: Long-lived, stored securely in key management system
- **Usage**: Wraps the DEK, never directly encrypts payload
- **Version**: Tracked via `mk_version` field for key rotation support

### Data Encryption Key (DEK)
- **Size**: 32 bytes (256 bits)
- **Generation**: Random, generated fresh for each encryption operation
- **Lifecycle**: Single-use (one per payload)
- **Storage**: Wrapped/encrypted with master key
- **Benefit**: If compromised, only affects that specific payload

### Nonce (Number used once)
- **Size**: 12 bytes (96 bits) per encryption
- **Generation**: Cryptographically random
- **Usage**: Prevents pattern attacks in GCM mode
- **Two instances**: One for payload encryption, one for DEK wrapping

### Authentication Tag
- **Size**: 16 bytes (128 bits) per encryption
- **Purpose**: Verify integrity and authenticity
- **Benefit**: Detects tampering, provides authenticated encryption
- **Two instances**: One for payload, one for DEK

---

## Why Envelope Encryption?

### Security Benefits

1. **Master Key Separation**
   - Master key never directly touches payload
   - Reduces exposure in case of memory dump
   - Can be stored in hardware security module (HSM)

2. **Per-Payload Uniqueness**
   - Fresh random DEK for each encryption
   - Different nonces prevent pattern recognition
   - Tampering detection via authentication tags

3. **Scalability**
   - DEK can be cached temporarily for performance
   - No performance penalty for large payloads
   - Master key operations minimal

4. **Key Rotation**
   - Wrap new DEK with new master key
   - No need to re-decrypt original payload
   - Version tracking enables gradual migration

### Operational Benefits

1. **Audit Trail**
   - Each encrypted record includes algorithm and key version
   - Enables key rotation policies
   - Supports compliance requirements

2. **Key Management**
   - Master key can live in external KMS (Key Management Service)
   - DEK is application-managed
   - Clean separation of concerns

3. **Recovery**
   - If DEK wrapping fails, only that payload is affected
   - Master key compromise requires key rotation, not re-encryption
   - Metadata allows identifying affected records

---

## Implementation Details

### File Structure

```
packages/crypto/src/
├── envelope-encryption.ts    # Main encryption/decryption logic
├── types.ts                  # TypeScript interfaces
├── validation.ts             # Input validation utilities
└── index.ts                  # Public API exports
```

### Validation Rules

- **Hex String**: Must contain only characters [0-9a-fA-F], even length
- **Master Key**: Exactly 32 bytes (64 hex characters)
- **Nonce**: Exactly 12 bytes (24 hex characters)
- **Auth Tag**: Exactly 16 bytes (32 hex characters)
- **Ciphertext**: Non-empty hex string

### Error Handling

Decryption validates all components before attempting decryption:
- Returns detailed validation errors
- Fails early if any component is invalid
- Prevents attempting decryption with corrupted data

---

## Usage Example

### Encryption

```typescript
import { envelopeEncrypt } from "@repo/crypto";

const masterKey = "a".repeat(64); // 64 hex chars = 32 bytes

const transactionData = {
  from: "alice",
  to: "bob",
  amount: 100,
  timestamp: new Date().toISOString()
};

const encrypted = envelopeEncrypt(transactionData, masterKey);

// encrypted now contains:
// {
//   payload_nonce: "abc123...",
//   payload_ct: "def456...",
//   payload_tag: "ghi789...",
//   dek_wrap_nonce: "jkl012...",
//   dek_wrapped: "mno345...",
//   dek_wrap_tag: "pqr678...",
//   alg: "AES-256-GCM",
//   mk_version: 1
// }

// Store encrypted in database
await db.txSecureRecord.create({
  partyId: "party_1",
  ...encrypted
});
```

### Decryption

```typescript
import { envelopeDecrypt } from "@repo/crypto";

const masterKey = "a".repeat(64);

const record = await db.txSecureRecord.findUnique({
  where: { id: "tx_123" }
});

const decrypted = envelopeDecrypt(record, masterKey);

console.log(decrypted);
// {
//   from: "alice",
//   to: "bob",
//   amount: 100,
//   timestamp: "2026-02-12T..."
// }
```

---

## Security Considerations

### What It Protects Against

✅ **Eavesdropping**: All data is encrypted  
✅ **Tampering**: Authentication tags detect modifications  
✅ **Replay Attacks**: Unique nonces prevent pattern exploitation  
✅ **Key Exposure**: DEK compromise affects only single record  

### What It Doesn't Protect

❌ **Metadata**: Field names, record count, timestamps are not encrypted  
❌ **Master Key Compromise**: Requires immediate key rotation  
❌ **Side-Channel Attacks**: Depends on crypto library implementation  
❌ **Physical Security**: Requires separate protections for keys at rest  

### Best Practices

1. **Master Key Storage**
   - Use AWS KMS, Azure Key Vault, or similar
   - Never hardcode in source code
   - Use environment variables or secret management

2. **Key Rotation**
   - Implement periodic key rotation policies
   - Track `mk_version` to support multiple active keys
   - Plan decryption and re-encryption workflows

3. **Nonce Generation**
   - Uses cryptographic randomness (`crypto.randomBytes`)
   - Never reuse nonce with same key
   - Current implementation uses fresh nonce per operation ✅

4. **Access Control**
   - Restrict who can access master key
   - Audit all decryption operations
   - Monitor for unusual access patterns

---

## Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Encrypt | O(n) | O(n) |
| Decrypt | O(n) | O(n) |
| Key Generation | O(1) | O(1) |

Where **n** is the size of the payload.

**Benchmark expectations** (on modern hardware):
- Encrypting 1KB payload: < 1ms
- Encrypting 1MB payload: < 100ms
- DEK wrapping: < 1ms

---

## References

- [NIST SP 800-38D (GCM Specification)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [Envelope Encryption Pattern](https://en.wikipedia.org/wiki/Envelope_encryption)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [AWS Key Management Service](https://docs.aws.amazon.com/kms/)
