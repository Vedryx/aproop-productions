import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import ContributionsAdmin from "@/components/payments/ContributionsAdmin";
import "@/components/payments/payments.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await getSession())) redirect("/admin/login");
  return <ContributionsAdmin />;
}
