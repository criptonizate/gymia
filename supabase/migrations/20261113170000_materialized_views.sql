-- =========================================================================
-- Materialized views para /cuenta: días entrenados y volumen semanal.
-- Refrescan on-demand con refresh_user_stats(). Si querés, agendá un cron
-- en Supabase que las refresque cada N minutos.
-- =========================================================================

-- Días entrenados por usuario (últimos 180 días).
drop materialized view if exists public.mv_user_training_days;
create materialized view public.mv_user_training_days as
  select user_id, started_at::date as dia, count(*)::int as sesiones
  from workout_sessions
  where finished_at is not null
    and started_at >= now() - interval '180 days'
  group by user_id, started_at::date;
create unique index on public.mv_user_training_days(user_id, dia);

-- Volumen semanal por usuario (últimas 16 semanas).
drop materialized view if exists public.mv_user_weekly_volume;
create materialized view public.mv_user_weekly_volume as
  select s.user_id,
    date_trunc('week', s.started_at)::date as week_start,
    coalesce(sum(sl.peso_kg * sl.reps), 0)::numeric as volumen
  from workout_sessions s
  join set_logs sl on sl.session_id = s.id
  where s.finished_at is not null
    and sl.completada
    and s.started_at >= date_trunc('week', now()) - interval '15 weeks'
  group by s.user_id, date_trunc('week', s.started_at);
create unique index on public.mv_user_weekly_volume(user_id, week_start);

-- RLS: las MVs no soportan RLS directa; se consulta sólo con RPC que filtra.
revoke all on public.mv_user_training_days from authenticated;
revoke all on public.mv_user_weekly_volume from authenticated;

-- Reemplazar user_training_days / user_weekly_volume por versión que lee MV.
create or replace function public.user_training_days(days_back int default 120)
returns table (dia date, sesiones int)
language sql
stable
security definer
set search_path = public
as $$
  select dia, sesiones::int
  from mv_user_training_days
  where user_id = auth.uid()
    and dia >= (current_date - days_back)
  order by dia;
$$;

create or replace function public.user_weekly_volume(weeks int default 12)
returns table (week_start date, volumen numeric)
language sql
stable
security definer
set search_path = public
as $$
  with semanas as (
    select generate_series(
      date_trunc('week', now()) - make_interval(weeks => weeks - 1),
      date_trunc('week', now()),
      interval '1 week'
    )::date as week_start
  )
  select s.week_start, coalesce(mv.volumen, 0) as volumen
  from semanas s
  left join mv_user_weekly_volume mv
    on mv.week_start = s.week_start and mv.user_id = auth.uid()
  order by s.week_start;
$$;

-- Refresh manual. Llamar cuando se termina una sesión (desde finishSession)
-- o programar con pg_cron si está disponible.
create or replace function public.refresh_user_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently mv_user_training_days;
  refresh materialized view concurrently mv_user_weekly_volume;
exception when others then
  -- Si concurrently falla (primer refresh sin datos), hacer el normal.
  refresh materialized view mv_user_training_days;
  refresh materialized view mv_user_weekly_volume;
end;
$$;
