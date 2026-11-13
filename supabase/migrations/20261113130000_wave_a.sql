-- =========================================================================
-- Ola A: RPC transaccional save_routine, índices, user_kpis consolidado,
-- insert policy explícita de profiles, columna notas en workout_sessions,
-- columna "favorito" para exercises por usuario.
-- =========================================================================

-- --------------------- Índice para getExerciseHistory --------------------
create index if not exists set_logs_exercise_created_idx
  on set_logs(exercise_id, created_at desc);

-- --------------------- Insert explícito en profiles ----------------------
-- Defensa en profundidad: aunque el trigger security definer crea el row,
-- dejamos la política explícita para que el propio user pueda re-insertarse
-- con sus datos si por algún motivo falta.
drop policy if exists "profiles self insert" on profiles;
create policy "profiles self insert" on profiles
  for insert to authenticated
  with check (id = auth.uid());

-- --------------------- Favoritos de ejercicios por usuario ---------------
create table if not exists user_exercise_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
alter table user_exercise_favorites enable row level security;
drop policy if exists "favorites owner" on user_exercise_favorites;
create policy "favorites owner" on user_exercise_favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --------------------- Peso corporal (mejora #5) -------------------------
create table if not exists body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  kg numeric(6,2) not null check (kg > 0),
  created_at timestamptz not null default now(),
  unique (user_id, fecha)
);
create index if not exists body_weights_user_fecha_idx
  on body_weights(user_id, fecha desc);
alter table body_weights enable row level security;
drop policy if exists "body_weights owner" on body_weights;
create policy "body_weights owner" on body_weights
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --------------------- RPC transaccional save_routine --------------------
drop function if exists public.save_routine(jsonb);
create or replace function public.save_routine(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _routine_id uuid;
  _dia jsonb;
  _ex jsonb;
  _day_id uuid;
begin
  if _uid is null then
    raise exception 'unauthenticated';
  end if;

  -- Desactivar rutinas activas previas
  update routines set activa = false
    where owner_id = _uid and activa;

  -- Insertar routines
  insert into routines (
    owner_id, nombre, dias_por_semana, semanas, split, nivel, objetivo, activa
  ) values (
    _uid,
    payload->>'nombre',
    (payload->>'dias_por_semana')::int,
    (payload->>'semanas')::int,
    payload->>'split',
    (payload->>'nivel')::nivel,
    (payload->>'objetivo')::objetivo,
    true
  ) returning id into _routine_id;

  -- Días y ejercicios
  for _dia in select * from jsonb_array_elements(payload->'dias') loop
    insert into routine_days (routine_id, semana, orden, nombre)
    values (
      _routine_id,
      (_dia->>'semana')::int,
      (_dia->>'orden')::int,
      _dia->>'nombre'
    )
    returning id into _day_id;

    for _ex in select * from jsonb_array_elements(_dia->'ejercicios') loop
      insert into routine_exercises (
        routine_day_id, exercise_id, orden, series,
        reps_min, reps_max, duracion_seg, descanso_seg
      ) values (
        _day_id,
        (_ex->>'exercise_id')::uuid,
        (_ex->>'orden')::int,
        (_ex->>'series')::int,
        nullif(_ex->>'reps_min','')::int,
        nullif(_ex->>'reps_max','')::int,
        nullif(_ex->>'duracion_seg','')::int,
        coalesce((_ex->>'descanso_seg')::int, 90)
      );
    end loop;
  end loop;

  return _routine_id;
end;
$$;

-- --------------------- user_kpis consolidado en un CTE -------------------
drop function if exists public.user_kpis();
create or replace function public.user_kpis()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with
  cfg as (
    select coalesce((
      select dias_por_semana from routines
      where owner_id = auth.uid() and activa limit 1
    ), 0) as planificadas
  ),
  mes as (
    select count(*) as entrenamientos
    from workout_sessions
    where user_id = auth.uid()
      and finished_at is not null
      and date_trunc('month', started_at) = date_trunc('month', now())
  ),
  vol as (
    select coalesce(sum(sl.peso_kg * sl.reps), 0)::numeric as volumen
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and sl.completada
      and sl.peso_kg is not null and sl.reps is not null
  ),
  semana_actual as (
    select count(*) as hechas
    from workout_sessions
    where user_id = auth.uid()
      and finished_at is not null
      and started_at >= date_trunc('week', now())
      and started_at <  date_trunc('week', now()) + interval '1 week'
  ),
  semanas as (
    select generate_series(
      date_trunc('week', now()) - interval '51 weeks',
      date_trunc('week', now()),
      interval '1 week'
    )::date as w
  ),
  por_semana as (
    select s.w,
      (select count(*) from workout_sessions ws
        where ws.user_id = auth.uid()
          and ws.finished_at is not null
          and ws.started_at >= s.w
          and ws.started_at <  s.w + interval '1 week') as hechas
    from semanas s
  ),
  cumplidas as (
    select w, (hechas >= (select planificadas from cfg)) as ok
    from por_semana order by w desc
  ),
  racha as (
    -- Streak contando desde la semana más reciente hacia atrás
    select coalesce(min(idx) - 1, (select count(*) from cumplidas)) as n
    from (
      select row_number() over (order by w desc) as idx, ok from cumplidas
    ) t where not ok
  )
  select jsonb_build_object(
    'entrenamientos_mes', (select entrenamientos from mes),
    'volumen_total_kg',   (select round(volumen) from vol),
    'planificadas_semana', (select planificadas from cfg),
    'hechas_semana',       (select hechas from semana_actual),
    'cumplimiento_semana', case
      when (select planificadas from cfg) > 0 then
        round(((select hechas from semana_actual)::numeric
               / (select planificadas from cfg)) * 100)
      else 0 end,
    'racha_semanas', coalesce((select n from racha), 0)
  );
$$;
