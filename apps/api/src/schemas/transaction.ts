import { z } from "zod";

export const encryptRequestSchema = z.object({
  partyId: z.string().min(1, "partyId is required"),
  payload: z
    .record(z.any())
    .refine(
      (val) => Object.keys(val).length > 0,
      "payload must be a non-empty object"
    ),
});

export type EncryptRequest = z.infer<typeof encryptRequestSchema>;
