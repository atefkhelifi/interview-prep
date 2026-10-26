import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Privacy policy" };

const issues = "https://github.com/atefkhelifi/interview-prep/issues";

export default function Privacy() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Wordmark />
        <Link href="/dashboard" className="link text-sm">
          Sign in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-16">
        <h1 className="text-4xl font-bold tracking-[-0.02em]">Privacy policy</h1>
        <p className="mt-2 text-sm text-ink-soft">Last updated: October 26, 2026</p>

        <div className="prose mt-8 max-w-none font-serif">
          <p>
            Interview Prep is a free practice app for technical interviews. This page says what it stores, why, and who
            else sees it.
          </p>

          <h2>What is stored</h2>
          <ul>
            <li>Your account: name, email address and, with email sign-up, a hashed password.</li>
            <li>
              With Google sign-in: your Google account ID, name, email address and profile picture URL. The app asks
              Google only for these basic profile details, not for access to Gmail, Drive or anything else.
            </li>
            <li>Your practice: interview questions, your answers, scores and feedback, and workshop code and reviews.</li>
            <li>Sessions: a sign-in cookie, plus the IP address and browser of each session, to keep you signed in.</li>
          </ul>

          <h2>How it is used</h2>
          <p>
            Only to run the app: sign you in, grade your answers and code, and show your results on the dashboard. No
            ads, no tracking, no analytics, and nothing is sold or shared for marketing.
          </p>

          <h2>Who else processes it</h2>
          <ul>
            <li>
              <strong>Google AI Studio</strong> receives your interview answers and workshop code so the Gemma model
              can ask questions and grade them.
            </li>
            <li>
              <strong>Vercel</strong> hosts the app and <strong>Turso</strong> hosts the database.
            </li>
            <li>
              <strong>Your browser&apos;s speech service</strong>, if you answer by voice: Chrome sends audio to Google
              and Edge to Microsoft for transcription. The app only receives the text.
            </li>
          </ul>

          <h2>Deleting your data</h2>
          <p>
            To delete your account and everything linked to it, open an issue at{" "}
            <a href={issues}>github.com/atefkhelifi/interview-prep/issues</a> with the email you signed up with (no
            other details needed). It is deleted within 30 days. With Google sign-in you can also remove the app&apos;s
            access at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about this policy: <a href={issues}>open an issue on GitHub</a>.
          </p>
        </div>
      </main>
    </>
  );
}
