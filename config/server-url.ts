// Origin of cse-archive-server. Single source: NEXT_PUBLIC_SERVER_URL (same value on server and browser).
export const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3005").replace(/\/+$/, "");
