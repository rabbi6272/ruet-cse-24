import "server-only";
import { cookies, headers as requestHeaders } from "next/headers";

import { SERVER_URL as API_ORIGIN } from "@/config/server-url";

const COOKIE_NAME = "__session";

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  revalidate?: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
}

export type SessionPayload = { value: string; maxAge: number };

/**
 * Stores the session minted by cse-archive-server as an HttpOnly cookie on THIS
 * site's domain. Only callable from Server Actions / Route Handlers.
 */
export async function setSessionCookie(session: SessionPayload): Promise<void> {
  (await cookies()).set(COOKIE_NAME, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // the Google callback arrives as a cross-site top-level redirect
    path: "/",
    maxAge: session.maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** End-user IP, so the auth server's brute-force limits apply per visitor. */
async function forwardedFor(): Promise<string | undefined> {
  try {
    const h = await requestHeaders();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Server-to-server fetch helper for calling cse-archive-server APIs (/api/v1/*).
 * Forwards the visitor's `__session` cookie and IP and sends the site Origin for
 * the server's CSRF check. It never writes cookies itself (that would throw when
 * called while rendering a Server Component); callers that receive a session use
 * `setSessionCookie`.
 */
export async function serverApi<T = any>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  const ip = await forwardedFor();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const origin = new URL(siteUrl).origin;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: origin,
    ...(sessionCookie ? { Cookie: `${COOKIE_NAME}=${sessionCookie.value}` } : {}),
    ...(ip ? { "X-Forwarded-For": ip } : {}),
    ...options.headers,
  };

  const endpoint = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_ORIGIN}/api/v1${endpoint}`;

  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      ...(options.revalidate ? { next: { revalidate: options.revalidate } } : { cache: "no-store" as const }),
    });

    const json = (await res.json().catch(() => null)) as Record<string, any> | null;

    if (!res.ok || json?.ok === false) {
      return {
        ok: false,
        status: res.status,
        code: json?.code,
        error: json?.message || json?.error || `HTTP ${res.status}`,
        data: json as T,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json as T,
    };
  } catch (err: any) {
    console.error(`[serverApi] Request failed for ${options.method ?? "GET"} ${url}:`, err);
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: "The server is unavailable right now. Please try again.",
    };
  }
}
