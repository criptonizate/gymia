-- =========================================================================
-- GYMIA · Fase 1 · Esquema base (docs/SPEC.md sección 4)
-- =========================================================================

create extension if not exists "pgcrypto";

-- =========================== Enums =======================================
create type user_role as enum ('user', 'trainer', 'admin');
create type nivel as enum ('principiante', 'intermedio', 'avanzado');
create type objetivo as enum ('hipertrofia', 'fuerza', 'general');
create type patron as enum (
  'empuje_horizontal', 'empuje_vertical',
  'traccion_horizontal', 'traccion_vertical',
  'sentadilla', 'bisagra', 'zancada', 'aislamiento',
  'core_antiextension', 'core_flexion',
  'core_antirotacion', 'core_lateral'
);
create type tipo_ejercicio as enum ('compuesto', 'aislamiento');
create type tipo_registro as enum ('peso_reps', 'reps', 'tiempo');
create type trainer_client_estado as enum ('pendiente', 'activo');

-- =========================== Catálogo ====================================
create table muscle_groups (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique
);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  muscle_group_id uuid not null references muscle_groups(id) on delete restrict,
  secondary_muscles text[] not null default '{}',
  equipment_id uuid not null references equipment(id) on delete restrict,
  patron patron not null,
  tipo tipo_ejercicio not null,
  tipo_registro tipo_registro not null,
  nivel_minimo nivel not null,
  instrucciones text[] not null default '{}',
  errores_comunes text[] not null default '{}',
  media_url text,
  media_frames text[] not null default '{}',
  youtube_query text,
  youtube_video_id text,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index exercises_muscle_group_idx on exercises(muscle_group_id);
create index exercises_equipment_idx on exercises(equipment_id);
create index exercises_patron_idx on exercises(patron);
create index exercises_created_by_idx on exercises(created_by);

-- =========================== Usuario y rutinas ===========================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  role user_role not null default 'user',
  nivel nivel,
  objetivo objetivo,
  created_at timestamptz not null default now()
);

create table routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  nombre text not null,
  dias_por_semana smallint not null check (dias_por_semana between 2 and 5),
  semanas smallint not null check (semanas between 1 and 4),
  split text not null,
  nivel nivel not null,
  objetivo objetivo not null,
  activa boolean not null default false,
  created_at timestamptz not null default now()
);
create index routines_owner_idx on routines(owner_id);
create unique index routines_one_active_per_owner
  on routines(owner_id) where activa;

create table routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references routines(id) on delete cascade,
  semana smallint not null check (semana >= 1),
  orden smallint not null check (orden >= 1),
  nombre text not null,
  unique (routine_id, semana, orden)
);
create index routine_days_routine_idx on routine_days(routine_id);

create table routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references routine_days(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  orden smallint not null check (orden >= 1),
  series smallint not null check (series between 1 and 10),
  reps_min smallint check (reps_min >= 1),
  reps_max smallint check (reps_max >= reps_min),
  duracion_seg smallint check (duracion_seg >= 1),
  peso_objetivo_kg numeric(6,2),
  descanso_seg smallint not null default 90,
  notas text,
  unique (routine_day_id, orden)
);
create index routine_exercises_day_idx on routine_exercises(routine_day_id);
create index routine_exercises_exercise_idx on routine_exercises(exercise_id);

create table user_exercise_videos (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  youtube_video_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- =========================== Registro ====================================
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_day_id uuid not null references routine_days(id) on delete restrict,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notas text
);
create index workout_sessions_user_idx on workout_sessions(user_id);
create index workout_sessions_day_idx on workout_sessions(routine_day_id);

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  routine_exercise_id uuid not null references routine_exercises(id) on delete restrict,
  exercise_id uuid not null references exercises(id) on delete restrict,
  es_sustituto boolean not null default false,
  numero_serie smallint not null check (numero_serie >= 1),
  objetivo_reps smallint,
  objetivo_peso_kg numeric(6,2),
  objetivo_seg smallint,
  peso_kg numeric(6,2),
  reps smallint,
  duracion_seg smallint,
  completada boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, routine_exercise_id, numero_serie)
);
create index set_logs_session_idx on set_logs(session_id);
create index set_logs_exercise_idx on set_logs(exercise_id);

-- =========================== Fase 2 ======================================
create table trainer_clients (
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  estado trainer_client_estado not null default 'pendiente',
  created_at timestamptz not null default now(),
  primary key (trainer_id, client_id)
);
create index trainer_clients_client_idx on trainer_clients(client_id);
