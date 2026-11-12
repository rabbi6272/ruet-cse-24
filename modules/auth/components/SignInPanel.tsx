"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { signInAction } from "@/modules/auth/auth.actions";
import { studentsKeys } from "@/shared/queryKeys";

import { Button, buttonClasses } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/Field";
import { Alert } from "@/shared/ui/Icon";

import { GoogleButton, OrDivider } from "./GoogleButton";

/**
 * Shown wherever a mutation needs a session. Deliberately not a route: both the
 * create and update pages need it inline.
 *
 * Sign-in runs on cse-archive-server via a Server Action; the session is an
 * HttpOnly `__session` cookie. After success the cached "signed out" state is
 * dropped and the user is sent to their dashboard ("My profile"), or to
 * profile creation when they have no profile yet. Unverified accounts land on
 * the create page, which shows the verify-email banner with a resend button.
 */
export function SignInPanel({ context }: { context: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsClaim, setNeedsClaim] = useState(false);

  // The Google callback lands here with `?authError=<code>` when it fails.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("authError");
    if (code === "claim") {
      setFormError("This email has a profile from the old directory. Claim it with an email link first.");
      setNeedsClaim(true);
    } else if (code) {
      setFormError("Google sign-in didn't go through. Try again, or use your email and password.");
    }
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNeedsClaim(false);
    setBusy(true);

    const result = await signInAction(email, password).catch(() => ({
      ok: false as const,
      error: "Sign-in is unavailable right now. Please try again.",
      code: undefined,
    }));

    if (!result.ok) {
      setBusy(false);
      setFormError(result.error ?? "Could not sign in. Check your details.");
      setNeedsClaim(result.code === "claim");
      return;
    }

    // Everything cached so far was fetched while signed out (session = null).
    // resetQueries also refetches the queries still mounted on this page, so
    // this works even when `next` is the page we are already on.
    await queryClient.resetQueries({ queryKey: studentsKeys.all });
    router.replace(result.next);
    router.refresh();
    // Keep the button busy until the navigation unmounts this panel.
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <div className="rounded-panel border border-border bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-center text-3xl font-bold tracking-tight text-fg">Sign in</h1>
        <p className="mt-0.5 text-center text-base text-fg-muted">{context}</p>

        <form onSubmit={onSubmit} className="space-y-2" noValidate>
          <TextField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <TextField
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {formError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger"
            >
              <Alert className="mt-0.5 size-4 shrink-0" />
              {formError}
            </p>
          ) : null}

          {needsClaim ? (
            <Link href="/profiles/claim" className={buttonClasses("primary", "md", "w-full")}>
              Reclaim with email link
            </Link>
          ) : null}

          <Button
            type="submit"
            busy={busy}
            busyLabel="Signing in…"
            className="w-full"
          >
            Sign in
          </Button>
        </form>

        <OrDivider />

        <div className="mt-6">
          {/* The Google callback picks "My profile" or "Create profile" itself. */}
          <GoogleButton />
        </div>

        <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm">
          <p>
            <Link
              href="/profiles/forgot-password"
              className="font-semibold text-ink-700 underline-offset-4 hover:text-ink-900 hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
          <p className="text-fg-muted">
            Joining for the first time?{" "}
            <Link
              href="/"
              className="font-semibold text-ink-700 underline-offset-4 hover:text-ink-900 hover:underline"
            >
              Choose your series
            </Link>{" "}
            to create an account.
          </p>
          <p className="text-fg-muted">
            Had a profile in the old directory?{" "}
            <Link
              href="/profiles/claim"
              className="font-semibold text-ink-700 underline-offset-4 hover:text-ink-900 hover:underline"
            >
              Reclaim it with an email link
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
