import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = {
  title: "Studio admin — Aproop",
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="studio-admin">{children}</div>;
}
