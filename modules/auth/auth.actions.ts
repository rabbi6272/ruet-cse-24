"use server";

import { clearSessionCookie, serverApi, setSessionCookie } from "@/shared/api/serverApi";
import { revalidateAll } from "@/shared/revalidate";
import type {
  PlainResult,
  SessionPayload,
  SignInResult,
  SignUpResult,
  ViewerSession,
} from "./auth.types";

// Server Actions (the client-facing "controllers"). Every auth flow goes through
// cse-archive-server (/api/v1/auth). There is deliberately no local fallback: the
// server is the single source of truth for credentials, sessions and roles. The
// session is stored as an HttpOnly `__session` cookie on this site's domain.

const UNAVAILABLE = "The server is unavailable right now. Please try again.";

export async function signInAction(email: string, password: string): Promise<SignInResult> {
  const res = await serverApi<{
    email: string;
    emailVerified: boolean;
    session?: SessionPayload;
    viewer?: { hasProfile?: boolean };
  }>("/auth/signin", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });

  if (res.ok && res.data?.session) {
    await setSessionCookie(res.data.session);
    revalidateAll();
    const hasProfile = res.data.viewer?.hasProfile === true;
    return {
      ok: true,
      email: res.data.email,
      emailVerified: res.data.emailVerified,
      hasProfile,
      // "My profile" is this site's dashboard; new accounts go straight to creating one.
      next: hasProfile ? "/profiles/update" : "/profiles/create",
    };
  }

  if (res.code === "claim" || res.code === "rate_limited" || res.code === "unavailable") {
    return { ok: false, error: res.error ?? UNAVAILABLE, code: res.code };
  }
  if (res.status >= 500) return { ok: false, error: UNAVAILABLE, code: "unavailable" };
  return { ok: false, error: res.error ?? "Incorrect email or password." };
}

export async function signOutAction(): Promise<PlainResult> {
  await serverApi("/auth/signout", { method: "POST" });
  await clearSessionCookie();
  revalidateAll();
  return { ok: true };
}

/** Email + password sign-up for an open series; signs the new account in (role: student). */
export async function signUpAction(
  seriesId: string,
  email: string,
  password: string,
): Promise<SignUpResult> {
  const res = await serverApi<{ session?: SessionPayload }>("/auth/signup", {
    method: "POST",
    body: { series: seriesId, email: email.trim().toLowerCase(), password },
  });

  if (res.ok && res.data?.session) {
    await setSessionCookie(res.data.session);
    revalidateAll();
    return { ok: true };
  }

  if (res.code === "claim") {
    return { ok: false, code: "claim", error: res.error ?? "This email has a profile from the old directory." };
  }
  if (res.code === "exists") {
    return { ok: false, code: "exists", error: res.error ?? "An account already exists with this email." };
  }
  if (res.status >= 500) return { ok: false, code: "unavailable", error: UNAVAILABLE };
  return { ok: false, error: res.error ?? "Could not create the account. Try again." };
}

export async function requestPasswordResetAction(email: string): Promise<PlainResult> {
  const res = await serverApi("/auth/forgot", {
    method: "POST",
    body: { email: email.trim().toLowerCase() },
  });
  if (!res.ok && res.status >= 500) return { ok: false, error: UNAVAILABLE };
  // Uniform response whether or not the account exists (anti-enumeration).
  return { ok: true };
}

/** Re-issues the VERIFY_EMAIL link for the current session. */
export async function resendVerificationAction(): Promise<PlainResult> {
  const res = await serverApi("/auth/verify/resend", { method: "POST" });
  if (res.ok) return { ok: true };
  return { ok: false, error: res.status >= 500 ? UNAVAILABLE : (res.error ?? "Could not resend the email. Try again.") };
}

export async function deleteAccountAction(password: string): Promise<PlainResult> {
  const res = await serverApi("/me/account", {
    method: "DELETE",
    body: { password },
  });

  if (!res.ok) {
    return { ok: false, error: res.status >= 500 ? UNAVAILABLE : (res.error ?? "Could not delete the account.") };
  }

  await clearSessionCookie();
  revalidateAll();
  return { ok: true };
}

/** Who is signed in, independent of whether they have a profile yet. */
export async function getViewerSessionAction(): Promise<ViewerSession | null> {
  const res = await serverApi<{
    user: { email: string; emailVerified: boolean; role?: ViewerSession["role"] } | null;
  }>("/me", { method: "GET" });

  const user = res.ok ? res.data?.user : null;
  if (!user?.email) return null;
  return { email: user.email, emailVerified: Boolean(user.emailVerified), role: user.role ?? "student" };
}
