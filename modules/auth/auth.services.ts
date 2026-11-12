import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { adminAuth } from "@/config/firebase.admin";
import { serverApi, setSessionCookie } from "@/shared/api/serverApi";
import type { SessionPayload, SessionUser } from "./auth.types";

// Server-only auth helpers. Credentials, sign-up and sessions are owned by
// cse-archive-server; this file only (1) verifies the `__session` cookie locally
// for server components and (2) wraps the server's Google OAuth endpoints.

const SESSION_COOKIE = "__session";

// ─── Session ─────────────────────────────────────────────────

/**
 * Verifies the `__session` cookie with the Admin SDK (no network hop to the
 * auth server). `cache` dedupes it per request.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    // `checkRevoked: true`: a password change or revocation invalidates the cookie.
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      emailVerified: decoded.email_verified ?? false,
      // Compared against `true` so an absent/null/string claim never reads as "done".
      mustRotate: (decoded as { mustRotate?: unknown }).mustRotate === true,
      needsSection: (decoded as { needsSection?: unknown }).needsSection === true,
    };
  } catch {
    // Expired, tampered with, or revoked. Treat as signed out.
    return null;
  }
});

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

// ─── Google OAuth (PKCE) ─────────────────────────────────────
// The OAuth work runs in cse-archive-server. This keeps state + verifier in a
// short-lived cookie on this domain and stores the resulting session.
//
//   /api/auth/google/start     → server /auth/google/start    → Google consent
//   /api/auth/google/callback  → server /auth/google/exchange → __session

const STATE_COOKIE = "__g_oauth";
const STATE_MAX_AGE_S = 10 * 60;

export const GOOGLE_ERROR_PATH = "/profiles/update?authError=google";

/** The callback must return to the origin that started the flow (where the state cookie lives). */
function redirectUriFor(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/api/auth/google/callback`;
}

/** Only same-site paths; never `//host` or `/\host`, which browsers treat as external. */
function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next.slice(0, 512);
}

/** Asks the server for the consent URL and stores state + verifier locally. */
export async function startGoogleSignIn(next: string | null, origin: string): Promise<string> {
  const redirectUri = redirectUriFor(origin);
  const res = await serverApi<{ url?: string; state?: string; verifier?: string }>("/auth/google/start", {
    method: "POST",
    body: { redirectUri },
  });
  if (!res.ok || !res.data?.url || !res.data.state || !res.data.verifier) {
    throw new Error(`google start failed: ${res.code ?? res.status}`);
  }

  (await cookies()).set(
    STATE_COOKIE,
    JSON.stringify({ state: res.data.state, verifier: res.data.verifier, next: safeNext(next), redirectUri }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Lax is required: the cookie must ride along on Google's top-level redirect back.
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: STATE_MAX_AGE_S,
    },
  );

  return res.data.url;
}

function fail(reason: string): string {
  console.error(`[auth] google -> ${reason}`);
  return GOOGLE_ERROR_PATH;
}

/** Handles the callback and returns the path to redirect to. */
export async function completeGoogleSignIn(params: URLSearchParams): Promise<string> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.set(STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });

  let saved: { state?: string; verifier?: string; next?: string | null; redirectUri?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    saved = {};
  }

  if (params.get("error")) return fail(`consent-${params.get("error")}`);

  const code = params.get("code");
  if (!code || !saved.state || !saved.verifier || !saved.redirectUri || params.get("state") !== saved.state) {
    return fail("state-mismatch");
  }

  const res = await serverApi<{ session?: SessionPayload; viewer?: { hasProfile?: boolean } }>(
    "/auth/google/exchange",
    { method: "POST", body: { code, verifier: saved.verifier, redirectUri: saved.redirectUri } },
  );

  if (!res.ok || !res.data?.session) {
    if (res.code === "claim") return "/profiles/claim?from=google";
    return fail(`exchange ${res.code ?? res.status}`);
  }

  await setSessionCookie(res.data.session);

  if (!res.data.viewer?.hasProfile) return "/profiles/create";
  return saved.next ?? "/profiles/update";
}
