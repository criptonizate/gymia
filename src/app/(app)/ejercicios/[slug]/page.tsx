export const instant = false;

export default async function EjercicioDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="mx-auto w-full max-w-md p-4">
      <h1 className="text-2xl font-semibold">{slug}</h1>
    </main>
  );
}
