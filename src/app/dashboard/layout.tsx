import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/app/dashboard-shell";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  return <DashboardShell>{children}</DashboardShell>;
}
