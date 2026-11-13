// Reservado para fase 2. Ver docs/SPEC.md sección 10.
export type TrainerClientStatus = "pendiente" | "activo";

export interface TrainerClient {
  trainer_id: string;
  client_id: string;
  estado: TrainerClientStatus;
  created_at: string;
}
