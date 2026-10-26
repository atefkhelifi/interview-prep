"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="link"
    >
      {t.signOut}
    </button>
  );
}
