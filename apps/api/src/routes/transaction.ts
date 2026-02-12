import type { FastifyInstance } from "fastify";

import { encryptRequestSchema } from "../schemas/transaction.js";
import { encryptPayload, decryptPayload } from "../lib/crypto.js";
import type { EncryptedPayload } from "@repo/crypto";
import prisma from "db";

export default async function transactionRoutes(fastify: FastifyInstance) {
  fastify.get("/", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  fastify.post("/tx/encrypt", async (request, reply) => {
    try {
      const validatedData = encryptRequestSchema.parse(request.body);
      const { partyId, payload } = validatedData;

      const encrypted = encryptPayload(payload);

      const record = await prisma.txSecureRecord.create({
        data: {
          partyId,
          ...encrypted,
        },
      });

      return reply.code(201).send({
        id: record.id,
        partyId: record.partyId,
        createdAt: record.createdAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "Encryption failed",
          message: error.message,
        });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get<{ Params: { id: string } }>("/tx/:id", async (request, reply) => {
    try {
      const { id } = request.params;

      const record = await prisma.txSecureRecord.findUnique({
        where: { id },
      });

      if (!record) {
        return reply.code(404).send({ error: "Transaction not found" });
      }

      return reply.send({
        id: record.id,
        partyId: record.partyId,
        createdAt: record.createdAt.toISOString(),
        payload_nonce: record.payload_nonce,
        payload_ct: record.payload_ct,
        payload_tag: record.payload_tag,
        dek_wrap_nonce: record.dek_wrap_nonce,
        dek_wrapped: record.dek_wrapped,
        dek_wrap_tag: record.dek_wrap_tag,
        alg: record.alg,
        mk_version: record.mk_version,
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(400).send({
          error: "Fetch failed",
          message: error.message,
        });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.post<{ Params: { id: string } }>(
    "/tx/:id/decrypt",
    async (request, reply) => {
      try {
        const { id } = request.params;

        const record = await prisma.txSecureRecord.findUnique({
          where: { id },
        });

        if (!record) {
          return reply.code(404).send({ error: "Transaction not found" });
        }

        const encryptedData: EncryptedPayload = {
          payload_nonce: record.payload_nonce,
          payload_ct: record.payload_ct,
          payload_tag: record.payload_tag,
          dek_wrap_nonce: record.dek_wrap_nonce,
          dek_wrapped: record.dek_wrapped,
          dek_wrap_tag: record.dek_wrap_tag,
          alg: record.alg as "AES-256-GCM",
          mk_version: record.mk_version as 1,
        };

        const decrypted = decryptPayload(encryptedData);

        return reply.send({
          id: record.id,
          partyId: record.partyId,
          createdAt: record.createdAt.toISOString(),
          payload: decrypted,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("tampered")) {
            return reply.code(400).send({
              error: "Decryption failed",
              message: "Data has been tampered with or is corrupted",
            });
          }
          if (error.message.includes("Validation failed")) {
            return reply.code(400).send({
              error: "Validation failed",
              message: error.message,
            });
          }
          return reply.code(400).send({
            error: "Decryption failed",
            message: error.message,
          });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );
}
