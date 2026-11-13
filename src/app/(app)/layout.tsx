import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-md flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
