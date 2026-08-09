"use client";

import { usePathname } from "next/navigation";
import DashboardNav from "@/components/DashboardNav";

export default function DashboardFrame({
  children,
  email,
  tier,
  staffRole,
}: {
  children: React.ReactNode;
  email: string;
  tier: string;
  staffRole?: string;
}) {
  const pathname = usePathname();
  const focusedBook = pathname.startsWith("/dashboard/manuscripts/");

  return (
    <div className={`flex min-h-screen flex-1 flex-col ${focusedBook ? "bg-[#080a0b]" : "sm:flex-row"}`}>
      {focusedBook ? null : <DashboardNav email={email} tier={tier} staffRole={staffRole} />}
      <main className={focusedBook ? "min-w-0 flex-1" : "min-w-0 flex-1 px-6 py-8 sm:px-10 sm:py-10"}>
        {children}
      </main>
    </div>
  );
}
