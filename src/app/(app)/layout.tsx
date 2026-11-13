import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div
        className="mx-auto w-full max-w-md flex-1"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
