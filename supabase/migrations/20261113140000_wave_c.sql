-- =========================================================================
-- Ola C: comparación semanal + supersets.
-- =========================================================================

-- --------------------- Comparar semana vs anterior ----------------------
create or replace function public.user_week_compare()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      date_trunc('week', now())::timestamptz as w0,
      (date_trunc('week', now()) - interval '1 week')::timestamptz as wm1
  ),
  ses_actual as (
    select count(*)::int as n
    from workout_sessions
    where user_id = auth.uid()
      and finished_at is not null
      and started_at >= (select w0 from bounds)
      and started_at <  (select w0 from bounds) + interval '1 week'
  ),
  ses_prev as (
    select count(*)::int as n
    from workout_sessions
    where user_id = auth.uid()
      and finished_at is not null
      and started_at >= (select wm1 from bounds)
      and started_at <  (select w0  from bounds)
  ),
  series_actual as (
    select count(*)::int as n
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and sl.completada
      and s.started_at >= (select w0 from bounds)
      and s.started_at <  (select w0 from bounds) + interval '1 week'
  ),
  series_prev as (
    select count(*)::int as n
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and sl.completada
      and s.started_at >= (select wm1 from bounds)
      and s.started_at <  (select w0  from bounds)
  ),
  vol_actual as (
    select coalesce(round(sum(peso_kg * reps)), 0)::numeric as n
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and sl.completada and sl.peso_kg is not null and sl.reps is not null
      and s.started_at >= (select w0 from bounds)
      and s.started_at <  (select w0 from bounds) + interval '1 week'
  ),
  vol_prev as (
    select coalesce(round(sum(peso_kg * reps)), 0)::numeric as n
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and sl.completada and sl.peso_kg is not null and sl.reps is not null
      and s.started_at >= (select wm1 from bounds)
      and s.started_at <  (select w0  from bounds)
  )
  select jsonb_build_object(
    'sesiones_actual', (select n from ses_actual),
    'sesiones_prev',   (select n from ses_prev),
    'series_actual',   (select n from series_actual),
    'series_prev',     (select n from series_prev),
    'volumen_actual',  (select n from vol_actual),
    'volumen_prev',    (select n from vol_prev)
  );
$$;

-- --------------------- Supersets: columna en routine_exercises ----------
alter table routine_exercises
  add column if not exists superset_group smallint;

create index if not exists routine_exercises_superset_idx
  on routine_exercises(routine_day_id, superset_group)
  where superset_group is not null;
