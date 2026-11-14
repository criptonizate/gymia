-- =========================================================================
-- Tanda C: detección de estancamiento, comparación período 4-6 semanas,
-- soporte de 6 días por semana.
-- =========================================================================

-- Ampliar el rango de dias_por_semana (2..5 → 2..6).
alter table routines drop constraint if exists routines_dias_por_semana_check;
alter table routines add constraint routines_dias_por_semana_check
  check (dias_por_semana between 2 and 6);

-- Para cada ejercicio con al menos 3 sesiones recientes del user, devuelve
-- info de progreso. "estancado" = peso_max no subió en las últimas 3 sesiones
-- y las reps tampoco crecieron (ignora las sesiones donde no hay peso).
create or replace function public.user_stalled_exercises()
returns table (
  exercise_id uuid,
  nombre text,
  slug text,
  sesiones int,
  peso_max_actual numeric,
  peso_max_hace_3 numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with recientes as (
    select sl.exercise_id,
      s.started_at::date as fecha,
      max(sl.peso_kg) as peso_max
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and s.finished_at is not null
      and sl.completada
      and sl.peso_kg is not null
    group by sl.exercise_id, s.started_at::date
  ),
  ranked as (
    select exercise_id, fecha, peso_max,
      row_number() over (partition by exercise_id order by fecha desc) as rn,
      count(*) over (partition by exercise_id) as n
    from recientes
  ),
  actual as (select exercise_id, peso_max as peso_actual from ranked where rn = 1),
  pasado as (select exercise_id, peso_max as peso_hace_3 from ranked where rn = 3)
  select a.exercise_id,
    e.nombre, e.slug,
    r.n::int as sesiones,
    a.peso_actual as peso_max_actual,
    p.peso_hace_3 as peso_max_hace_3
  from actual a
  join pasado p on p.exercise_id = a.exercise_id
  join ranked r on r.exercise_id = a.exercise_id and r.rn = 1
  join exercises e on e.id = a.exercise_id
  where a.peso_actual <= p.peso_hace_3
  order by e.nombre;
$$;

-- Comparación 4-6 semanas: suma volumen y entrenamientos en dos ventanas.
-- Ventana reciente: últimas 4 semanas. Ventana previa: 4-8 semanas atrás.
create or replace function public.user_period_compare(weeks int default 4)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      (now() - make_interval(weeks => weeks))::timestamptz as inicio_actual,
      (now() - make_interval(weeks => weeks * 2))::timestamptz as inicio_prev,
      now()::timestamptz as fin_actual
  ),
  ses_actual as (
    select count(*)::int as n
    from workout_sessions
    where user_id = auth.uid()
      and finished_at is not null
      and started_at >= (select inicio_actual from bounds)
  ),
  ses_prev as (
    select count(*)::int as n
    from workout_sessions
    where user_id = auth.uid()
      and finished_at is not null
      and started_at >= (select inicio_prev from bounds)
      and started_at <  (select inicio_actual from bounds)
  ),
  vol_actual as (
    select coalesce(round(sum(sl.peso_kg * sl.reps)), 0)::numeric as n
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and sl.completada and sl.peso_kg is not null and sl.reps is not null
      and s.started_at >= (select inicio_actual from bounds)
  ),
  vol_prev as (
    select coalesce(round(sum(sl.peso_kg * sl.reps)), 0)::numeric as n
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and sl.completada and sl.peso_kg is not null and sl.reps is not null
      and s.started_at >= (select inicio_prev from bounds)
      and s.started_at <  (select inicio_actual from bounds)
  )
  select jsonb_build_object(
    'weeks', weeks,
    'sesiones_actual', (select n from ses_actual),
    'sesiones_prev',   (select n from ses_prev),
    'volumen_actual',  (select n from vol_actual),
    'volumen_prev',    (select n from vol_prev)
  );
$$;
