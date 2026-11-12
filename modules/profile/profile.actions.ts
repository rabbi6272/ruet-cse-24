"use server";

import { cookies } from "next/headers";
import { serverApi } from "../../api/serverApi";
import { getSession } from "../../auth/session";
import { revalidateAll } from "../../revalidate";
import {
  changePassword,
  deleteAccount,
  requestPasswordReset,
  signIn,
  signOut,
  type SignInResult,
} from "../../auth/auth.service";
import {
  completeClaim,
  openClaimLink,
  startClaim,
  type ClaimLinkResult,
} from "../../auth/claim.server";
import { signUpWithPassword, type SignUpResult } from "../../auth/join.server";
import { freshEmailVerified, resendVerification } from "../../auth/verification.server";
import { countUnclaimed } from "./students.admin.repo";
import {
  createProfileFor,
  getContact,
  getProfile,
  getRollForClaimedEmail,
  updateContactFor,
  updateProfileFor,
} from "./students.service";
import { profileDraftSchema, updateProfileSchema, updateContactSchema } from "./students.schema";
import type { UpdateProfileInput } from "./students.schema";

import type { PrivateContact, Profile } from "../../../types/Student";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
type PlainResult = { ok: true } | { ok: false; error: string };

function revalidateProfiles(): void {
  revalidateAll();
}

/**
 * Bridges client-side Firebase Auth ID token to server-side __session cookie.
 * Mints an HttpOnly session cookie via the server API or Firebase Admin SDK.
 */
export async function establishSessionAction(idToken: string): Promise<PlainResult> {
  const cookieStore = await cookies();
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{
      session?: { value: string; maxAge: number };
    }>("/auth/session", {
      method: "POST",
      body: { idToken },
    });

    if (res.ok && res.data?.session) {
      cookieStore.set("__session", res.data.session.value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: res.data.session.maxAge,
      });
      revalidateProfiles();
      return { ok: true };
    }
    if (res.error) {
      return { ok: false, error: res.error };
    }
  }

  // Fallback to local createSessionCookie
  try {
    const { createSessionCookie } = await import("../../auth/session");
    await createSessionCookie(idToken);
    revalidateProfiles();
    return { ok: true };
  } catch (err: any) {
    console.error("[students.server] establishSessionAction failed:", err);
    return { ok: false, error: "Failed to establish session." };
  }
}

export async function signInAction(
  email: string,
  password: string,
): Promise<SignInResult> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{
      email: string;
      emailVerified: boolean;
      session?: { value: string; maxAge: number };
    }>("/auth/signin", {
      method: "POST",
      body: { email, password },
    });

    if (res.ok && res.data) {
      if (res.data.session) {
        const cookieStore = await cookies();
        cookieStore.set("__session", res.data.session.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: res.data.session.maxAge,
        });
      }
      return { ok: true, email: res.data.email, emailVerified: res.data.emailVerified };
    }

    if (res.code === "claim") {
      return { ok: false, error: res.error ?? "Please claim your profile.", code: "claim" };
    }

    return { ok: false, error: res.error ?? "Incorrect email or password." };
  }

  return signIn(email, password);
}

export async function signOutAction(): Promise<PlainResult> {
  if (process.env.API_ORIGIN) {
    await serverApi("/auth/signout", { method: "POST" });
  }

  const cookieStore = await cookies();
  cookieStore.delete("__session");
  revalidateProfiles();
  return { ok: true };
}

export async function requestPasswordResetAction(email: string): Promise<PlainResult> {
  if (process.env.API_ORIGIN) {
    await serverApi("/auth/forgot", {
      method: "POST",
      body: { email },
    });
    return { ok: true };
  }

  return requestPasswordReset(email);
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<PlainResult> {
  return changePassword(currentPassword, newPassword);
}

export async function deleteAccountAction(
  password: string,
): Promise<PlainResult> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi("/me/account", {
      method: "DELETE",
      body: { password },
    });

    if (res.ok) {
      const cookieStore = await cookies();
      cookieStore.delete("__session");
      revalidateProfiles();
      return { ok: true };
    }

    return { ok: false, error: res.error ?? "Failed to delete account." };
  }

  const result = await deleteAccount(password);
  if (result.ok) revalidateProfiles();
  return result;
}

export async function startClaimAction(
  email: string,
): Promise<Result<{ message: string }>> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ message?: string }>("/claim/start", {
      method: "POST",
      body: { email },
    });

    if (res.ok) {
      return {
        ok: true,
        message: res.data?.message ?? "Check your email for the claim link.",
      };
    }

    return { ok: false, error: res.error ?? "Failed to start claim process." };
  }

  return startClaim(email);
}

/** Completes the emailed sign-in link and establishes the claim session. */
export async function openClaimLinkAction(
  oobCode: string,
  email: string,
): Promise<ClaimLinkResult> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{
      mode?: "activate" | "claim";
      needsSection?: boolean;
    }>("/claim/open", {
      method: "POST",
      body: { oobCode, email },
    });

    if (res.ok && res.data) {
      return {
        ok: true,
        mode: res.data.mode ?? "claim",
        needsSection: res.data.needsSection ?? false,
      };
    }

    return { ok: false, error: res.error ?? "Invalid or expired link." };
  }

  return openClaimLink(oobCode, email);
}

export async function completeClaimAction(
  password: string,
  sec?: string,
): Promise<Result<{ uid: string }>> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ uid?: string }>("/claim/complete", {
      method: "POST",
      body: { password, ...(sec ? { sec } : {}) },
    });

    if (res.ok) {
      revalidateProfiles();
      return { ok: true, uid: res.data?.uid ?? "" };
    }

    return { ok: false, error: res.error ?? "Failed to complete claim." };
  }

  const result = await completeClaim({
    password,
    ...(sec ? { sec: sec as "a" | "b" | "c" } : {}),
  });

  if (result.ok) revalidateProfiles();
  return result;
}

/** Email + password sign-up for an open series; signs the new account in. */
export async function signUpAction(
  seriesId: string,
  email: string,
  password: string,
): Promise<SignUpResult> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi("/auth/signup", {
      method: "POST",
      body: { series: seriesId, email, password },
    });

    if (res.ok) {
      revalidateProfiles();
      return { ok: true };
    }

    if (res.code === "claim") {
      return {
        ok: false,
        code: "claim",
        error: res.error ?? "This email has a profile from the old directory.",
      };
    }

    return { ok: false, error: res.error ?? "Failed to create account." };
  }

  const result = await signUpWithPassword(seriesId, email, password);
  if (result.ok) revalidateProfiles();
  return result;
}

/** Re-issues the VERIFY_EMAIL link for the current session. */
export async function resendVerificationAction(): Promise<PlainResult> {
  return resendVerification();
}

/** Drives the migration banner without exposing who is unclaimed. */
export async function getUnclaimedCountAction(): Promise<number> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ count: number }>("/claim/count", {
      method: "GET",
      revalidate: 300,
    });

    if (res.ok && typeof res.data?.count === "number") {
      return res.data.count;
    }
  }

  return countUnclaimed();
}

/** Backs the "did I already claim?" checker. */
export async function getRollForEmailAction(email: string): Promise<string | null> {
  return getRollForClaimedEmail(email);
}

/**
 * Who is signed in, independent of whether they have a profile yet.
 */
export async function getViewerSessionAction(): Promise<{
  email: string;
  emailVerified: boolean;
} | null> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{
      email?: string;
      emailVerified?: boolean;
    }>("/me", { method: "GET" });

    if (res.ok && res.data?.email) {
      return {
        email: res.data.email,
        emailVerified: Boolean(res.data.emailVerified),
      };
    }
  }

  const session = await getSession();
  if (!session) return null;

  const emailVerified = session.emailVerified || (await freshEmailVerified(session.uid));
  return { email: session.email, emailVerified };
}

export async function getMyProfileAction(): Promise<Profile | null> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ profile: Profile }>("/me/profile", { method: "GET" });
    if (res.ok && res.data?.profile) {
      return res.data.profile;
    }
    if (res.status === 404) return null;
  }

  const session = await getSession();
  return session ? getProfile(session.uid) : null;
}

export async function getMyContactAction(): Promise<PrivateContact | null> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ contact: PrivateContact }>("/me/contact", { method: "GET" });
    if (res.ok && res.data?.contact) {
      return res.data.contact;
    }
    if (res.status === 404) return null;
  }

  const session = await getSession();
  return session ? getContact(session.uid) : null;
}

export async function createProfileAction(
  draft: unknown,
  mobileNumber: string,
): Promise<Result<{ profile: Profile }>> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ profile: Profile }>("/profiles", {
      method: "POST",
      body: {
        profile: draft,
        contact: { mobileNumber },
      },
    });

    if (res.ok && res.data?.profile) {
      revalidateProfiles();
      return { ok: true, profile: res.data.profile };
    }

    if (res.error) {
      return { ok: false, error: res.error };
    }
  }

  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sign in to create a profile." };
  }

  if (!(await freshEmailVerified(session.uid))) {
    return {
      ok: false,
      error: "Verify your email first. Open the verification link we sent you, then try again.",
    };
  }

  const parsed = profileDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const contact = updateContactSchema.safeParse({ mobileNumber });
  const result = await createProfileFor(
    session.uid,
    session.email,
    parsed.data,
    contact.success ? contact.data : undefined,
  );

  if (result.ok) revalidateProfiles();
  return result;
}

export async function updateProfileAction(
  patch: unknown,
): Promise<Result<{ profile: Profile }>> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ profile: Profile }>("/me/profile", {
      method: "PATCH",
      body: patch,
    });

    if (res.ok && res.data?.profile) {
      revalidateProfiles();
      return { ok: true, profile: res.data.profile };
    }

    if (res.error) {
      return { ok: false, error: res.error };
    }
  }

  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sign in again to continue." };
  }

  const parsed = updateProfileSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const result = await updateProfileFor(session.uid, parsed.data as UpdateProfileInput);
  if (result.ok) revalidateProfiles();
  return result;
}

export async function updateContactAction(
  mobileNumber: string,
): Promise<Result<{ contact: PrivateContact }>> {
  if (process.env.API_ORIGIN) {
    const res = await serverApi<{ contact: PrivateContact }>("/me/contact", {
      method: "PATCH",
      body: { mobileNumber },
    });

    if (res.ok && res.data?.contact) {
      return { ok: true, contact: res.data.contact };
    }

    if (res.error) {
      return { ok: false, error: res.error };
    }
  }

  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sign in again to continue." };
  }

  return updateContactFor(session.uid, { mobileNumber });
}
