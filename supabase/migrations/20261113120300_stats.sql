-- =========================================================================
-- GYMIA · Fase 6 · Funciones de estadísticas (ejecutadas por el usuario
-- actual vía RLS; usan auth.uid() internamente).
-- =========================================================================

-- --------------------------- KPIs ---------------------------------------
create or replace function public.user_kpis()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _entrenamientos_mes int;
  _volumen_total numeric;
  _cumplimiento numeric;
  _racha int;
  _planificadas_semana int;
  _hechas_semana int;
begin
  if _uid is null then
    return jsonb_build_object(
      'entrenamientos_mes', 0,
      'volumen_total_kg',   0,
      'cumplimiento_semana', 0,
      'racha_semanas',       0,
      'planificadas_semana', 0,
      'hechas_semana',       0
    );
  end if;

  -- Entrenamientos del mes (sesiones terminadas con started_at del mes actual)
  select count(*) into _entrenamientos_mes
  from workout_sessions
  where user_id = _uid
    and finished_at is not null
    and date_trunc('month', started_at) = date_trunc('month', now());

  -- Volumen total: suma de peso_kg * reps en todas las series completadas
  select coalesce(sum(peso_kg * reps), 0) into _volumen_total
  from set_logs sl
  join workout_sessions s on s.id = sl.session_id
  where s.user_id = _uid
    and sl.completada
    and sl.peso_kg is not null
    and sl.reps is not null;

  -- Cumplimiento semanal: hechas / planificadas en la rutina activa esta semana.
  -- Planificadas = dias_por_semana de la rutina activa.
  select r.dias_por_semana into _planificadas_semana
  from routines r
  where r.owner_id = _uid and r.activa
  limit 1;
  _planificadas_semana := coalesce(_planificadas_semana, 0);

  select count(*) into _hechas_semana
  from workout_sessions
  where user_id = _uid
    and finished_at is not null
    and started_at >= date_trunc('week', now())
    and started_at <  date_trunc('week', now()) + interval '1 week';

  _cumplimiento := case
    when _planificadas_semana > 0
      then round((_hechas_semana::numeric / _planificadas_semana) * 100)
    else 0 end;

  -- Racha de semanas cumplidas (consecutivas hacia atrás) donde se cumplió
  -- al menos las dias_por_semana planificadas. Mira hasta 52 semanas atrás.
  with semanas as (
    select generate_series(
      date_trunc('week', now()) - interval '51 weeks',
      date_trunc('week', now()),
      interval '1 week'
    )::date as w_start
  ),
  conteo as (
    select w.w_start,
      (select count(*) from workout_sessions ws
        where ws.user_id = _uid
          and ws.finished_at is not null
          and ws.started_at >= w.w_start
          and ws.started_at <  w.w_start + interval '1 week') as hechas
    from semanas w
  ),
  cumplida as (
    select w_start, (hechas >= _planificadas_semana) as ok
    from conteo
    order by w_start desc
  ),
  streak as (
    select ok, row_number() over () as rn,
      sum(case when not ok then 1 else 0 end) over (order by w_start desc) as grupo
    from cumplida
  )
  select coalesce(max(count_cumplidas), 0) into _racha
  from (
    select grupo, count(*) as count_cumplidas
    from streak
    where ok
    group by grupo
  ) t
  where grupo = 0;  -- sólo la racha más reciente

  return jsonb_build_object(
    'entrenamientos_mes', _entrenamientos_mes,
    'volumen_total_kg',   round(_volumen_total),
    'cumplimiento_semana', _cumplimiento,
    'racha_semanas',       _racha,
    'planificadas_semana', _planificadas_semana,
    'hechas_semana',       _hechas_semana
  );
end;
$$;

-- --------------------------- Días entrenados (heatmap) ------------------
create or replace function public.user_training_days(days_back int default 120)
returns table (dia date, sesiones int)
language sql
stable
security invoker
set search_path = public
as $$
  select started_at::date as dia, count(*)::int as sesiones
  from workout_sessions
  where user_id = auth.uid()
    and finished_at is not null
    and started_at >= now() - make_interval(days => days_back)
  group by started_at::date
  order by dia;
$$;

-- --------------------------- Volumen semanal ---------------------------
create or replace function public.user_weekly_volume(weeks int default 12)
returns table (week_start date, volumen numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with s as (
    select date_trunc('week', s.started_at)::date as week_start,
           coalesce(sl.peso_kg, 0) * coalesce(sl.reps, 0) as vol
    from workout_sessions s
    join set_logs sl on sl.session_id = s.id
    where s.user_id = auth.uid()
      and s.finished_at is not null
      and sl.completada
      and s.started_at >= date_trunc('week', now()) - make_interval(weeks => weeks - 1)
  ),
  semanas as (
    select generate_series(
      date_trunc('week', now()) - make_interval(weeks => weeks - 1),
      date_trunc('week', now()),
      interval '1 week'
    )::date as week_start
  )
  select w.week_start, coalesce(sum(s.vol), 0) as volumen
  from semanas w
  left join s on s.week_start = w.week_start
  group by w.week_start
  order by w.week_start;
$$;

-- --------------------------- Series por grupo muscular -----------------
create or replace function public.user_sets_by_muscle_group(days_back int default 7)
returns table (muscle_group_slug text, nombre text, sets_total int)
language sql
stable
security invoker
set search_path = public
as $$
  select mg.slug as muscle_group_slug, mg.nombre, count(*)::int as sets_total
  from set_logs sl
  join workout_sessions s on s.id = sl.session_id
  join exercises e on e.id = sl.exercise_id
  join muscle_groups mg on mg.id = e.muscle_group_id
  where s.user_id = auth.uid()
    and s.finished_at is not null
    and sl.completada
    and s.started_at >= now() - make_interval(days => days_back)
  group by mg.slug, mg.nombre
  order by sets_total desc;
$$;

-- --------------------------- Récords por ejercicio ---------------------
create or replace function public.user_exercise_records()
returns table (
  exercise_id uuid, nombre text, slug text,
  peso_max numeric, reps_en_max int,
  rm_epley numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with mejores as (
    select distinct on (sl.exercise_id)
      sl.exercise_id, sl.peso_kg as peso_max, sl.reps as reps_en_max
    from set_logs sl
    join workout_sessions s on s.id = sl.session_id
    where s.user_id = auth.uid()
      and s.finished_at is not null
      and sl.completada
      and sl.peso_kg is not null
      and sl.reps is not null
    order by sl.exercise_id, sl.peso_kg desc, sl.reps desc
  )
  select m.exercise_id, e.nombre, e.slug,
    m.peso_max, m.reps_en_max,
    round((m.peso_max * (1 + m.reps_en_max::numeric / 30))::numeric, 1) as rm_epley
  from mejores m
  join exercises e on e.id = m.exercise_id
  order by rm_epley desc nulls last;
$$;

-- --------------------------- Evolución de un ejercicio -----------------
create or replace function public.user_exercise_evolution(_exercise_id uuid)
returns table (fecha date, peso_max numeric, reps_max int, duracion_max int)
language sql
stable
security invoker
set search_path = public
as $$
  select s.started_at::date as fecha,
    max(sl.peso_kg) as peso_max,
    max(sl.reps) as reps_max,
    max(sl.duracion_seg) as duracion_max
  from set_logs sl
  join workout_sessions s on s.id = sl.session_id
  where s.user_id = auth.uid()
    and s.finished_at is not null
    and sl.exercise_id = _exercise_id
  group by s.started_at::date
  order by fecha;
$$;
