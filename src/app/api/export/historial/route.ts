import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  created_at: string;
  numero_serie: number;
  peso_kg: number | null;
  reps: number | null;
  duracion_seg: number | null;
  rir: number | null;
  completada: boolean;
  exercise: { nombre: string; slug: string } | null;
};

function csvEscape(v: string | number | boolean | null): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data, error } = await supabase
    .from("set_logs")
    .select(
      "created_at, numero_serie, peso_kg, reps, duracion_seg, rir, completada, exercise:exercises!inner(nombre, slug), session:workout_sessions!inner(user_id)",
    )
    .eq("session.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
  const rows = (data as unknown as Row[]) ?? [];

  const header = [
    "fecha",
    "ejercicio",
    "slug",
    "serie",
    "peso_kg",
    "reps",
    "duracion_seg",
    "rir",
    "completada",
  ].join(",");
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.exercise?.nombre ?? "",
      r.exercise?.slug ?? "",
      r.numero_serie,
      r.peso_kg,
      r.reps,
      r.duracion_seg,
      r.rir,
      r.completada,
    ]
      .map(csvEscape)
      .join(","),
  );
  const body = [header, ...lines].join("\n");
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gymia-historial-${today}.csv"`,
    },
  });
}
