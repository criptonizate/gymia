export const instant = false;

export default async function SesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto w-full max-w-md p-4">
      <h1 className="text-2xl font-semibold">Sesión {id}</h1>
    </main>
  );
}
