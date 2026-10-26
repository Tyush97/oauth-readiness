import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LIBRARY, getGuide } from "@/data/guides";
import GuideView from "@/components/GuideView";

export function generateStaticParams() {
  return LIBRARY.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  return { title: g ? `${g.name} OAuth readiness` : "Guide not found" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  return <GuideView guide={guide} />;
}
