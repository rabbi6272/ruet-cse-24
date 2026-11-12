"use server";

import type { SessionPayload } from "@/modules/auth/auth.types";
import { getRollForClaimedEmail } from "@/modules/profile/profile.services";
import { countUnclaimed } from "@/modules/profile/profile.repo";
import { clearSessionCookie, serverApi, setSessionCookie } from "@/shared/api/serverApi";
import { revalidateAll } from "@/shared/revalidate";
import type { ClaimLinkResult } from "./claim.types";

// Claiming an old-directory profile: start (email link) → open (link) → complete
// (set password). All steps run on cse-archive-server (/api/v1/claim).

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const UNAVAILABLE = "The server is unavailable right now. Please try again.";

export async function startClaimAction(email: string): Promise<Result<{ message: string }>> {
  const res = await serverApi<{ message?: string }>("/claim/start", {
    method: "POST",
    body: { email },
  });

  if (res.ok) {
    return { ok: true, message: res.data?.message ?? "Check your email for the claim link." };
  }
  return { ok: false, error: res.status >= 500 ? UNAVAILABLE : (res.error ?? "Could not start the claim.") };
}

/** Completes the emailed sign-in link and establishes the claim session. */
export async function openClaimLinkAction(oobCode: string, email: string): Promise<ClaimLinkResult> {
  const res = await serverApi<{
    mode?: "activate" | "claim";
    needsSection?: boolean;
    session?: SessionPayload;
  }>("/claim/open", {
    method: "POST",
    body: { oobCode, email },
  });

  if (res.ok && res.data?.session) {
    await setSessionCookie(res.data.session);
    return { ok: true, mode: res.data.mode ?? "claim", needsSection: res.data.needsSection ?? false };
  }
  return { ok: false, error: res.status >= 500 ? UNAVAILABLE : (res.error ?? "Invalid or expired claim link.") };
}

export async function completeClaimAction(password: string, sec?: string): Promise<Result<{ uid: string }>> {
  const res = await serverApi<{ session?: SessionPayload | null; viewer?: { uid: string } }>("/claim/complete", {
    method: "POST",
    body: { password, ...(sec ? { sec } : {}) },
  });

  if (!res.ok) {
    return { ok: false, error: res.status >= 500 ? UNAVAILABLE : (res.error ?? "Could not complete the claim.") };
  }

  // Old tokens were revoked server-side; store the fresh session (or sign out if none).
  if (res.data?.session) await setSessionCookie(res.data.session);
  else await clearSessionCookie();

  revalidateAll();
  return { ok: true, uid: res.data?.viewer?.uid ?? "" };
}

/** Drives the migration banner without exposing who is unclaimed. */
export async function getUnclaimedCountAction(): Promise<number> {
  const res = await serverApi<{ count: number }>("/claim/count", { method: "GET", revalidate: 300 });
  if (res.ok && typeof res.data?.count === "number") return res.data.count;
  return countUnclaimed();
}

/** Backs the "did I already claim?" checker. */
export async function getRollForEmailAction(email: string): Promise<string | null> {
  return getRollForClaimedEmail(email);
}
