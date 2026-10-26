import { notFound } from "next/navigation";
import { Archivo, Geist_Mono, Kalam, Source_Serif_4 } from "next/font/google";
import { I18nProvider } from "@/components/i18n";
import { isLocale, LOCALES } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/server";
import "../globals.css";

// Archivo: headings and UI. Source Serif: long reading. Kalam: red-pen grades only.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every page is prerendered once per language; the proxy picks one by cookie or browser language.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata() {
  const t = await getDictionary();
  return {
    title: { default: "Interview Prep", template: "%s · Interview Prep" },
    description: t.appDescription,
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      className={`${archivo.variable} ${sourceSerif.variable} ${kalam.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <I18nProvider locale={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
