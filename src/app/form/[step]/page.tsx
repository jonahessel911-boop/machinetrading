import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { FormFunnel } from "@/components/FormFunnel";

export const metadata: Metadata = {
  title: "Meld je heftruck aan | heftruckverkocht.nl",
  description:
    "Meld je heftruck gratis aan en ontvang een vrijblijvend bod van betrouwbare kopers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function FormStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  const n = Number(step);
  if (!Number.isInteger(n) || n < 1 || n > 7) {
    if (step === undefined || step === "") redirect("/form/1");
    notFound();
  }

  return <FormFunnel />;
}
