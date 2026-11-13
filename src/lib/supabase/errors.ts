// Helper para que los errores de Supabase no se pierdan silenciosamente.
export function unwrap<T>(
  res: { data: T; error: { message: string; code?: string } | null },
  context: string,
): T {
  if (res.error) {
    console.error(`[${context}]`, res.error.message, res.error);
  }
  return res.data;
}
