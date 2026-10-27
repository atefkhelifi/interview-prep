import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";
import { liveAvailable } from "@/lib/live";
import { techs } from "@/lib/techs";
import { LiveInterview } from "./live-interview";

export async function generateMetadata() {
  return { title: (await getDictionary()).interview.live.title };
}

export default async function LiveInterviewPage() {
  const t = await getDictionary();
  const lv = t.interview.live;
  return (
    <div>
      <Link href="/interview" className="link text-sm">
        {t.interview.title}
      </Link>
      <h1 className="page-title mt-2">{lv.title}</h1>
      <p className="page-intro">{lv.intro}</p>
      {liveAvailable() ? (
        <LiveInterview techs={techs.map(({ slug, name }) => ({ slug, name }))} />
      ) : (
        <p className="pen mt-8 text-sm">{lv.unavailable}</p>
      )}
    </div>
  );
}
