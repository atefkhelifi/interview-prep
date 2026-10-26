import { getDictionary } from "@/lib/i18n/server";
import { PitchForm } from "./pitch-form";

export async function generateMetadata() {
  return { title: (await getDictionary()).cv.title };
}

export default async function CvPage() {
  const t = await getDictionary();
  return (
    <div>
      <h1 className="page-title">{t.cv.title}</h1>
      <p className="page-intro">{t.cv.intro}</p>
      <PitchForm />
    </div>
  );
}
