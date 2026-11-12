import { z } from "zod";

import { passwordSchema } from "@/modules/auth/auth.types";
import { emailSchema, sectionSchema } from "@/modules/profile/profile.types";

export type ClaimLinkResult =
  | { ok: true; mode: "claim" | "activate"; needsSection: boolean }
  | { ok: false; error: string };

export const claimStartSchema = z.object({ email: emailSchema }).strict();

export const claimCompleteSchema = z
  .object({ password: passwordSchema, sec: sectionSchema.optional() })
  .strict();

export type ClaimCompleteInput = z.infer<typeof claimCompleteSchema>;
