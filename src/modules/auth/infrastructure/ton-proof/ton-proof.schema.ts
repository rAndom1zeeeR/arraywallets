import { z } from "zod";

export const tonProofDomainSchema = z.object({
  lengthBytes: z.number().int().positive(),
  value: z.string().min(1),
});

export const tonProofSignatureSchema = z.object({
  timestamp: z.number().int().positive(),
  domain: tonProofDomainSchema,
  payload: z.string().min(1),
  signature: z.string().min(1),
});

export const tonConnectProofRequestSchema = z.object({
  address: z.string().min(1),
  network: z.string().min(1),
  publicKey: z.string().min(1),
  walletStateInit: z.string().min(1),
  proof: tonProofSignatureSchema,
});

export type TonProofSignature = z.infer<typeof tonProofSignatureSchema>;
export type TonConnectProofRequest = z.infer<typeof tonConnectProofRequestSchema>;
