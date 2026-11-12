import { z } from "zod";

import { emailSchema, seriesSchema } from "@/modules/profile/profile.types";

// ─── Types ───────────────────────────────────────────────────

export type Role = "student" | "admin" | "super_admin";

/** The verified `__session` cookie, decoded server-side. */
export interface SessionUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  /**
   * True while the account still holds its seeded bootstrap credential. The
   * session is valid, but the only action permitted is claiming the profile.
   */
  mustRotate: boolean;
  /** True when the section was derived from the roll and is worth confirming. */
  needsSection: boolean;
}

export type SessionPayload = { value: string; maxAge: number };

/** `code: "claim"` → the account is an unclaimed old-directory profile. */
export type SignInResult =
  | { ok: true; email: string; emailVerified: boolean; hasProfile: boolean; next: string }
  | { ok: false; error: string; code?: "claim" | "rate_limited" | "unavailable" };

export type SignUpResult =
  | { ok: true }
  | { ok: false; error: string; code?: "claim" | "exists" | "unavailable" };

export type PlainResult = { ok: true } | { ok: false; error: string };

export type ViewerSession = {
  email: string;
  emailVerified: boolean;
  role: Role;
};

// ─── Schemas ─────────────────────────────────────────────────

/**
 * Firebase Auth enforces a 6-character floor; we require 8. Length beats
 * composition rules (NIST SP 800-63B).
 */
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

export const loginSchema = z
  .object({ email: emailSchema, password: z.string().min(1, "Enter your password") })
  .strict();

export const signUpSchema = z
  .object({ series: seriesSchema, email: emailSchema, password: passwordSchema })
  .strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
