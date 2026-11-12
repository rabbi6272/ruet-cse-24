// React Query keys shared by every module. Everything sits under one prefix so
// sign-in / sign-out can reset or clear all of it at once.
export const studentsKeys = {
  all: ["profiles"] as const,
  list: (series: string) => [...studentsKeys.all, "list", series] as const,
  /** Prefix matching every series' directory cache. */
  get lists() {
    return [...studentsKeys.all, "list"] as const;
  },
  detail: (id: string) => [...studentsKeys.all, "detail", id] as const,
  unclaimedCount: () => [...studentsKeys.all, "unclaimed-count"] as const,
  viewer: () => [...studentsKeys.all, "viewer"] as const,
  session: () => [...studentsKeys.all, "session"] as const,
  contact: () => [...studentsKeys.all, "contact"] as const,
};
