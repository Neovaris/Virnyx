import { fetchMe } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Middleware already validated auth + role
  // Just fetch user data for sidebar/layout use
  const me = await fetchMe();
  
  if (!me) {
    redirect("/login");
  }

  return <div className="min-h-screen">{children}</div>;
}