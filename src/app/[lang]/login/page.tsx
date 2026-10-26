import Link from "next/link";
import { LanguageSwitch } from "@/components/i18n";
import { Wordmark } from "@/components/wordmark";
import { googleEnabled } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { AuthForm } from "./auth-form";

export async function generateMetadata() {
  return { title: (await getDictionary()).signIn };
}

export default function LoginPage() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" aria-label="Interview Prep" className="inline-block">
          <Wordmark />
        </Link>
        <LanguageSwitch />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-16 md:pt-20">
        <AuthForm googleEnabled={googleEnabled} />
      </main>
    </>
  );
}
