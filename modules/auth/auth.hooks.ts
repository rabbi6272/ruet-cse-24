"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { studentsKeys } from "@/shared/queryKeys";
import { getViewerSessionAction, signInAction, signOutAction } from "./auth.actions";

/** The signed-in account (`{ email, emailVerified, role }`), or `null` when signed out. */
export function useViewerSession() {
  return useQuery({
    queryKey: studentsKeys.session(),
    queryFn: getViewerSessionAction,
    // Always re-check: Join/Claim sign the user in via a full redirect, and a
    // cached "signed out" would show them the sign-in panel again. Also
    // re-check on tab focus, so "verify your email" clears after the user
    // opens the link in another tab (global default disables this).
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => signInAction(email, password),
    onSuccess: async (result) => {
      // Everything cached so far was fetched while signed out.
      if (result.ok) await queryClient.resetQueries({ queryKey: studentsKeys.all });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOutAction,
    onSuccess: () => {
      // Everything cached belongs to the previous user, so drop it rather than
      // showing a signed-out visitor the previous account's data.
      queryClient.clear();
    },
  });
}
