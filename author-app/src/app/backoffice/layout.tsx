import BackofficeNav from "@/components/BackofficeNav";

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <BackofficeNav />
      <main className="mx-auto max-w-[1680px] px-5 py-8 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
