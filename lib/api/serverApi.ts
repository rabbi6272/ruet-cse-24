import "server-only";
import { cookies } from "next/headers";

const API_ORIGIN = (process.env.API_ORIGIN ?? "http://localhost:3005").replace(/\/+$/, "");
const COOKIE_NAME = "__session";
const SESSION_MAX_AGE_S = 5 * 24 * 60 * 60; // 5 days

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

/**
 * Server-to-server fetch helper for calling cse-archive-server APIs (/api/v1/*).
 * Automatically forwards session cookies, handles CSRF origin headers, and syncs
 * returned Set-Cookie headers into Next.js cookie jar.
 */
export async function serverApi<T = any>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const origin = new URL(siteUrl).origin;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: origin,
    ...(sessionCookie ? { Cookie: `${COOKIE_NAME}=${sessionCookie.value}` } : {}),
    ...options.headers,
  };

  const endpoint = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_ORIGIN}/api/v1${endpoint}`;

  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      ...(options.revalidate ? { next: { revalidate: options.revalidate } } : {}),
    });

    // Sync Set-Cookie from server response into Next.js cookie jar
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      const match = setCookieHeader.match(/__session=([^;]+)/);
      if (match && match[1]) {
        cookieStore.set(COOKIE_NAME, match[1], {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: SESSION_MAX_AGE_S,
        });
      }
    }

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
      status: 500,
      error: err?.message || "Failed to communicate with API server.",
    };
  }
}
