import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import LoginForm from "@/components/admin/LoginForm";
export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return <LoginForm />;
}
