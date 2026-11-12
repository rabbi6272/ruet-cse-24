import type { Metadata } from "next";

import { ForgotPasswordFlow } from "@/modules/auth/components/ForgotPasswordFlow";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordFlow />;
}
