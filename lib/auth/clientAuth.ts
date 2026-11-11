"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  type UserCredential,
} from "firebase/auth";
import { auth } from "../firebase/client";
import {
  establishSessionAction,
  signOutAction,
} from "../db/students/students.server";

export interface ClientAuthResult {
  ok: boolean;
  error?: string;
  code?: string;
  email?: string;
  emailVerified?: boolean;
}

const googleProvider = new GoogleAuthProvider();

function getAuthErrorMessage(error: any): string {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes or reset your password.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed.";
    default:
      return error?.message || "Authentication failed. Please try again.";
  }
}

/**
 * Client-side Firebase sign-in with email & password.
 * Authenticates directly with Firebase on the client, then establishes session with the server.
 */
export async function clientSignIn(
  email: string,
  password: string,
): Promise<ClientAuthResult> {
  try {
    const cred: UserCredential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    const idToken = await cred.user.getIdToken();
    const sessionRes = await establishSessionAction(idToken);

    if (!sessionRes.ok) {
      return { ok: false, error: sessionRes.error ?? "Failed to establish session." };
    }

    return {
      ok: true,
      email: cred.user.email ?? email,
      emailVerified: cred.user.emailVerified,
    };
  } catch (err: any) {
    console.error("[clientAuth] Sign-in failed:", err);
    return {
      ok: false,
      code: err?.code,
      error: getAuthErrorMessage(err),
    };
  }
}

/**
 * Client-side Firebase account registration.
 * Creates the user in Firebase Auth directly from the browser, sends verification email,
 * and mints the server session cookie.
 */
export async function clientSignUp(
  email: string,
  password: string,
): Promise<ClientAuthResult> {
  try {
    const cred: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );

    // Send verification email directly from client
    await sendEmailVerification(cred.user).catch((e) =>
      console.warn("[clientAuth] sendEmailVerification warning:", e),
    );

    const idToken = await cred.user.getIdToken();
    const sessionRes = await establishSessionAction(idToken);

    if (!sessionRes.ok) {
      return { ok: false, error: sessionRes.error ?? "Failed to establish session." };
    }

    return {
      ok: true,
      email: cred.user.email ?? email,
      emailVerified: cred.user.emailVerified,
    };
  } catch (err: any) {
    console.error("[clientAuth] Sign-up failed:", err);
    return {
      ok: false,
      code: err?.code,
      error: getAuthErrorMessage(err),
    };
  }
}

/**
 * Client-side "Continue with Google" popup flow.
 */
export async function clientSignInWithGoogle(): Promise<ClientAuthResult> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const idToken = await cred.user.getIdToken();
    const sessionRes = await establishSessionAction(idToken);

    if (!sessionRes.ok) {
      return { ok: false, error: sessionRes.error ?? "Failed to establish session." };
    }

    return {
      ok: true,
      email: cred.user.email ?? "",
      emailVerified: cred.user.emailVerified,
    };
  } catch (err: any) {
    console.error("[clientAuth] Google sign-in failed:", err);
    return {
      ok: false,
      code: err?.code,
      error: getAuthErrorMessage(err),
    };
  }
}

/**
 * Client-side sign out from Firebase and server session.
 */
export async function clientSignOut(): Promise<{ ok: boolean }> {
  try {
    await firebaseSignOut(auth).catch(() => {});
    await signOutAction();
    return { ok: true };
  } catch (err) {
    console.error("[clientAuth] Sign-out failed:", err);
    return { ok: false };
  }
}

/**
 * Client-side password reset request via Firebase Auth.
 */
export async function clientResetPassword(email: string): Promise<ClientAuthResult> {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return { ok: true };
  } catch (err: any) {
    console.error("[clientAuth] Password reset failed:", err);
    return {
      ok: false,
      code: err?.code,
      error: getAuthErrorMessage(err),
    };
  }
}

/**
 * Client-side re-send verification email.
 */
export async function clientResendVerification(): Promise<ClientAuthResult> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { ok: false, error: "No user signed in." };
    }
    await sendEmailVerification(user);
    return { ok: true };
  } catch (err: any) {
    console.error("[clientAuth] Resend verification failed:", err);
    return {
      ok: false,
      code: err?.code,
      error: getAuthErrorMessage(err),
    };
  }
}
