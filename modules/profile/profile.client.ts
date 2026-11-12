import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "@/config/firebase.client";
import { COLLECTIONS } from "@/config/collections";
import { toProfile } from "@/modules/profile/profile.mapper";
import { SERVER_URL } from "@/config/server-url";

import type { Profile } from "@/modules/profile/profile.types";

/**
 * Client-side reads for the public directory.
 *
 * Only published documents are fetched, and the Firestore rules independently
 * refuse to serve an unpublished one — so a hand-crafted query cannot widen
 * the result set. Everything else (mobile number, legacy profiles, rate limits)
 * is unreachable from here by design.
 */
type Raw = Record<string, unknown>;

function toProfileDoc(snap: QueryDocumentSnapshot<DocumentData>): Profile {
  return toProfile(snap.data() as Raw, snap.id);
}

function getApiBaseUrl(): string {
  return SERVER_URL;
}

export async function listPublishedProfiles(series: string): Promise<Profile[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/profiles?series=${encodeURIComponent(series)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.profiles)) {
        return json.profiles as Profile[];
      }
    }
  } catch (err) {
    console.warn("[profile.client] Failed to fetch profiles from /api/v1/profiles, falling back to Firestore:", err);
  }

  // Fallback to Firestore client query
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.profiles),
      where("series", "==", series),
      where("published", "==", true),
    ),
  );

  return snap.docs.map(toProfileDoc);
}

export async function getProfileDoc(uid: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/profiles/${encodeURIComponent(uid)}`);
    if (res.status === 404) return null;
    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.profile) {
        return json.profile as Profile;
      }
    }
  } catch (err) {
    console.warn(`[profile.client] Failed to fetch profile ${uid} from /api/v1/profiles, falling back to Firestore:`, err);
  }

  const snap = await getDoc(
    doc(collection(db, COLLECTIONS.profiles), uid),
  );

  return snap.exists() ? toProfile(snap.data() as Raw, snap.id) : null;
}
