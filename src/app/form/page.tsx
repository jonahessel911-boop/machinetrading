import type { Metadata } from "next";
import { FormFunnel } from "@/components/FormFunnel";

export const metadata: Metadata = {
  title: "Meld je heftruck aan | heftruckverkocht.nl",
  description:
    "Meld je heftruck gratis aan en ontvang een vrijblijvend bod van betrouwbare kopers.",
};

export default function FormPage() {
  return <FormFunnel />;
}
