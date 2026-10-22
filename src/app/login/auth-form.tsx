"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: String(form.get("name")) })
        : await authClient.signIn.email({ email, password });

    setPending(false);
    if (error) return setError(error.message ?? "Something went wrong");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="page-title">{mode === "signin" ? "Sign in" : "Create an account"}</h1>
      <p className="mt-2 font-serif text-ink-soft">
        {mode === "signin" ? "Pick up where you left off." : "Your scores and progress are saved to it."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {mode === "signup" && (
          <label className="block">
            <span className="field-label">Name</span>
            <input name="name" required autoComplete="name" className="field" />
          </label>
        )}
        <label className="block">
          <span className="field-label">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="block">
          <span className="field-label">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="field"
          />
        </label>

        {error && (
          <p role="alert" className="pen text-sm">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn w-full">
          {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {googleEnabled && (
        <button
          type="button"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })}
          className="btn-line mt-3 w-full"
        >
          Continue with Google
        </button>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="link font-medium"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
