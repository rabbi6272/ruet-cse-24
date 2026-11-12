"use server";

import { adminAuth } from "@/config/firebase.admin";
import { getSession } from "@/modules/auth/auth.services";
import { serverApi } from "@/shared/api/serverApi";
import { revalidateAll } from "@/shared/revalidate";
import {
  createProfileFor,
  getContact,
  getProfile,
  updateContactFor,
  updateProfileFor,
} from "./profile.services";
import {
  profileDraftSchema,
  updateContactSchema,
  updateProfileSchema,
  type PrivateContact,
  type Profile,
  type UpdateProfileInput,
} from "./profile.types";

// Profile Server Actions. cse-archive-server is the primary path; on a 5xx the
// read/write falls back to the local Admin SDK service so the directory keeps
// working while the server is cold or down.

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

async function freshEmailVerified(uid: string): Promise<boolean> {
  try {
    return (await adminAuth.getUser(uid)).emailVerified;
  } catch {
    return false;
  }
}

export async function getMyProfileAction(): Promise<Profile | null> {
  const res = await serverApi<{ profile: Profile }>("/me/profile", { method: "GET" });
  if (res.ok && res.data?.profile) return res.data.profile;
  if (res.status === 404) return null;

  const session = await getSession();
  return session ? getProfile(session.uid) : null;
}

export async function getMyContactAction(): Promise<PrivateContact | null> {
  const res = await serverApi<{ contact: PrivateContact }>("/me/contact", { method: "GET" });
  if (res.ok && res.data?.contact) return res.data.contact;
  if (res.status === 404) return null;

  const session = await getSession();
  return session ? getContact(session.uid) : null;
}

export async function createProfileAction(
  draft: unknown,
  mobileNumber: string,
): Promise<Result<{ profile: Profile }>> {
  const res = await serverApi<{ profile: Profile }>("/profiles", {
    method: "POST",
    body: { profile: draft, contact: { mobileNumber } },
  });

  if (res.ok && res.data?.profile) {
    revalidateAll();
    return { ok: true, profile: res.data.profile };
  }
  if (res.error && res.status < 500) return { ok: false, error: res.error };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to create a profile." };

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

  if (result.ok) revalidateAll();
  return result;
}

export async function updateProfileAction(patch: unknown): Promise<Result<{ profile: Profile }>> {
  const res = await serverApi<{ profile: Profile }>("/me/profile", { method: "PATCH", body: patch });

  if (res.ok && res.data?.profile) {
    revalidateAll();
    return { ok: true, profile: res.data.profile };
  }
  if (res.error && res.status < 500) return { ok: false, error: res.error };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };

  const parsed = updateProfileSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const result = await updateProfileFor(session.uid, parsed.data as UpdateProfileInput);
  if (result.ok) revalidateAll();
  return result;
}

export async function updateContactAction(mobileNumber: string): Promise<Result<{ contact: PrivateContact }>> {
  const res = await serverApi<{ contact: PrivateContact }>("/me/contact", {
    method: "PATCH",
    body: { mobileNumber },
  });

  if (res.ok && res.data?.contact) return { ok: true, contact: res.data.contact };
  if (res.error && res.status < 500) return { ok: false, error: res.error };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in again to continue." };

  return updateContactFor(session.uid, { mobileNumber });
}
