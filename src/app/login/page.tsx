import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { googleEnabled } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-4 py-4">
        <Link href="/" aria-label="Interview Prep, home" className="inline-block">
          <Wordmark />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-16 md:pt-20">
        <AuthForm googleEnabled={googleEnabled} />
      </main>
    </>
  );
}
