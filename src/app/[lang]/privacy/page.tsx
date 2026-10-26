import Link from "next/link";
import { LanguageSwitch } from "@/components/i18n";
import { Wordmark } from "@/components/wordmark";
import { getDictionary, getLocale } from "@/lib/i18n/server";

const issues = "https://github.com/atefkhelifi/interview-prep/issues";

export async function generateMetadata() {
  return { title: (await getDictionary()).privacy };
}

export default async function Privacy() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Wordmark />
        <div className="flex items-center gap-5">
          <LanguageSwitch />
          <Link href="/dashboard" className="link text-sm">
            {t.signIn}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-16">
        {locale === "fr" ? <French /> : <English />}
      </main>
    </>
  );
}

function English() {
  return (
    <>
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
          <li>Your language choice, in a cookie.</li>
        </ul>

        <h2>How it is used</h2>
        <p>
          Only to run the app: sign you in, grade your answers and code, and show your results on the dashboard. No ads,
          no tracking, no analytics, and nothing is sold or shared for marketing.
        </p>

        <h2>Who else processes it</h2>
        <ul>
          <li>
            <strong>Google AI Studio</strong> receives your interview answers and workshop code so the Gemma model can
            ask questions and grade them.
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
          <a href={issues}>github.com/atefkhelifi/interview-prep/issues</a> with the email you signed up with (no other
          details needed). It is deleted within 30 days. With Google sign-in you can also remove the app&apos;s access at{" "}
          <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy: <a href={issues}>open an issue on GitHub</a>.
        </p>
      </div>
    </>
  );
}

function French() {
  return (
    <>
      <h1 className="text-4xl font-bold tracking-[-0.02em]">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-ink-soft">Dernière mise à jour : 26 octobre 2026</p>

      <div className="prose mt-8 max-w-none font-serif">
        <p>
          Interview Prep est une application gratuite pour s&apos;entraîner aux entretiens techniques. Cette page
          indique ce qu&apos;elle enregistre, pourquoi, et qui d&apos;autre y a accès.
        </p>

        <h2>Ce qui est enregistré</h2>
        <ul>
          <li>Votre compte : nom, adresse e-mail et, avec une inscription par e-mail, un mot de passe chiffré (haché).</li>
          <li>
            Avec la connexion Google : l&apos;identifiant de votre compte Google, votre nom, votre adresse e-mail et
            l&apos;URL de votre photo de profil. L&apos;application ne demande à Google que ces informations de profil de
            base, sans accès à Gmail, Drive ou autre.
          </li>
          <li>
            Votre entraînement : questions d&apos;entretien, vos réponses, notes et retours, ainsi que le code et les
            revues des ateliers.
          </li>
          <li>
            Les sessions : un cookie de connexion, plus l&apos;adresse IP et le navigateur de chaque session, pour vous
            garder connecté.
          </li>
          <li>Votre choix de langue, dans un cookie.</li>
        </ul>

        <h2>Utilisation</h2>
        <p>
          Uniquement pour faire fonctionner l&apos;application : vous connecter, noter vos réponses et votre code, et
          afficher vos résultats sur le tableau de bord. Pas de publicité, pas de pistage, pas de statistiques
          d&apos;audience, et rien n&apos;est vendu ni partagé à des fins commerciales.
        </p>

        <h2>Qui d&apos;autre traite ces données</h2>
        <ul>
          <li>
            <strong>Google AI Studio</strong> reçoit vos réponses d&apos;entretien et le code des ateliers, pour que le
            modèle Gemma pose les questions et les note.
          </li>
          <li>
            <strong>Vercel</strong> héberge l&apos;application et <strong>Turso</strong> héberge la base de données.
          </li>
          <li>
            <strong>Le service vocal de votre navigateur</strong>, si vous répondez à voix haute : Chrome envoie
            l&apos;audio à Google et Edge à Microsoft pour la transcription. L&apos;application ne reçoit que le texte.
          </li>
        </ul>

        <h2>Supprimer vos données</h2>
        <p>
          Pour supprimer votre compte et tout ce qui y est lié, ouvrez un ticket sur{" "}
          <a href={issues}>github.com/atefkhelifi/interview-prep/issues</a> avec l&apos;e-mail utilisé à
          l&apos;inscription (aucune autre information nécessaire). La suppression a lieu sous 30 jours. Avec la
          connexion Google, vous pouvez aussi retirer l&apos;accès de l&apos;application sur{" "}
          <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Une question sur cette politique : <a href={issues}>ouvrez un ticket sur GitHub</a>.
        </p>
      </div>
    </>
  );
}
