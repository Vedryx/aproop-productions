import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import { getContent } from "@/lib/admin/content";
import AdminEditor from "@/components/admin/AdminEditor";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return <AdminEditor initial={await getContent()} email={session.email} />;
}
