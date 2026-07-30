import { redirect } from "next/navigation";

/** Fallback for old /form links — prefer linking to /form/1 directly. */
export default function FormIndexPage() {
  redirect("/form/1");
}
