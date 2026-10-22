import type { Metadata } from "next";
import { Archivo, Geist_Mono, Kalam, Source_Serif_4 } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: { default: "Interview Prep", template: "%s · Interview Prep" },
  description: "Study sheets, workshops and AI mock interviews",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${sourceSerif.variable} ${kalam.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
