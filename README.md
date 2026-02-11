# Secure Transaction App

A TurboRepo monorepo demonstrating **AES-256-GCM Envelope Encryption** for secure transaction storage.

## Project Structure

```
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── crypto/       # Shared encryption utilities
│   ├── db/           # Prisma database schema
│   ├── typescript-config/
│   ├── eslint-config/
│   └── ui/
```

## Features

- **Envelope Encryption**: Each payload encrypted with unique DEK, DEK wrapped with Master Key
- **Algorithm**: AES-256-GCM with authentication tags
- **Validation**: Strict validation for nonce (12 bytes), tag (16 bytes), and hex formats
- **Tamper Detection**: Failed authentication on tampered ciphertext or tags
- **Storage**: PostgreSQL with Prisma ORM
- **UI**: Clean shadcn/ui interface

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Database

Update `packages/db/.env` with your PostgreSQL connection string (already configured).

Run migrations:

```bash
cd packages/db
pnpm db:migrate
pnpm db:generate
```

### 3. Configure Master Key

Update `apps/api/.env` with a 64-character hex master key (already set with example key).

### 4. Start Development Servers

```bash
pnpm dev
```

This starts:

- API: http://localhost:3001
- Web: http://localhost:3000

## API Endpoints

### POST /tx/encrypt

Encrypt and store a transaction.

**Request:**

```json
{
  "partyId": "party_123",
  "payload": { "amount": 100, "currency": "AED" }
}
```

**Response:**

```json
{
  "id": "clxxxx...",
  "partyId": "party_123",
  "createdAt": "2026-02-11T..."
}
```

### GET /tx/:id

Fetch encrypted record (no decryption).

**Response:**

```json
{
  "id": "clxxxx...",
  "partyId": "party_123",
  "payload_nonce": "...",
  "payload_ct": "...",
  "payload_tag": "...",
  "dek_wrap_nonce": "...",
  "dek_wrapped": "...",
  "dek_wrap_tag": "...",
  "alg": "AES-256-GCM",
  "mk_version": 1
}
```

### POST /tx/:id/decrypt

Decrypt and return original payload.

**Response:**

```json
{
  "id": "clxxxx...",
  "partyId": "party_123",
  "payload": { "amount": 100, "currency": "AED" }
}
```

## How Envelope Encryption Works

1. Generate random 32-byte DEK (Data Encryption Key)
2. Encrypt payload with DEK using AES-256-GCM → `{ct, nonce, tag}`
3. Wrap DEK with Master Key using AES-256-GCM → `{wrapped_dek, nonce, tag}`
4. Store all components as hex strings
5. To decrypt: Unwrap DEK with Master Key, then decrypt payload with DEK

## Security Notes

- Master key stored as environment variable (use KMS in production)
- All encrypted values stored as hex strings
- Authentication tags prevent tampering
- Validation enforces correct nonce/tag sizes

## Tech Stack

- **Monorepo**: TurboRepo with pnpm workspaces
- **Backend**: Fastify, Prisma, Zod
- **Frontend**: Next.js 16, React 19, shadcn/ui, Tailwind CSS
- **Encryption**: Node.js crypto module (AES-256-GCM)
- **Database**: PostgreSQL

## License

MIT
