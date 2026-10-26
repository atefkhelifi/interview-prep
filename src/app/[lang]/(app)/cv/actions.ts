"use server";

import { requireUser } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { getActionLocale } from "@/lib/i18n/server";
import { pdfToText, writePitch, type Pitch } from "@/lib/pitch";

export type PitchState = { error?: string; pitch?: Pitch } | undefined;

// Keep in sync with serverActions.bodySizeLimit in next.config.ts (Vercel caps requests at 4.5 MB).
const MAX_PDF_BYTES = 4 * 1024 * 1024;

export async function generatePitch(_prev: PitchState, formData: FormData): Promise<PitchState> {
  await requireUser();
  const lang = await getActionLocale();
  const errors = getDict(lang).cv.errors;
  const file = formData.get("file");
  const role = String(formData.get("role") ?? "").trim().slice(0, 120);
  let cv = String(formData.get("text") ?? "").trim();

  // A PDF wins over pasted text.
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return { error: errors.notPdf };
    if (file.size > MAX_PDF_BYTES) return { error: errors.tooBig };
    try {
      cv = (await pdfToText(file)).trim();
    } catch (e) {
      console.error(e);
      return { error: errors.unreadable };
    }
    if (!cv) return { error: errors.unreadable };
  }
  if (!cv) return { error: errors.empty };
  if (cv.length < 150) return { error: errors.tooShort };

  try {
    return { pitch: await writePitch(cv, role, lang) };
  } catch (e) {
    console.error(e);
    return { error: errors.ai };
  }
}
