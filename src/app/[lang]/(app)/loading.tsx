"use client";

import { useI18n } from "@/components/i18n";

export default function Loading() {
  return <p className="text-ink-soft">{useI18n().t.loading}</p>;
}
