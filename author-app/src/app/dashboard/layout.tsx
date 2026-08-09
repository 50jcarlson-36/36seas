import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardFrame from "@/components/DashboardFrame";
import { effectiveRole, effectiveTier } from "@/lib/access";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, role")
    .eq("id", user.id)
    .single();

  return (
    <DashboardFrame
      email={user.email || ""}
      tier={effectiveTier(user.email, profile?.subscription_tier)}
      staffRole={effectiveRole(user.email, profile?.role)}
    >
      {children}
    </DashboardFrame>
  );
}
