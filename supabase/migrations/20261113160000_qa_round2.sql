-- =========================================================================
-- QA round 2: unique partial de sesión abierta, save_routine con lock +
-- cierre de sesiones de rutinas que se desactivan, handle_new_user con
-- on conflict, RPC para limpiar supersets huérfanos atómicamente.
-- =========================================================================

-- #3  Sólo una sesión abierta por usuario
create unique index if not exists workout_sessions_one_open_per_user
  on workout_sessions(user_id)
  where finished_at is null;

-- #9  Trigger de profile idempotente (si el user ya tiene profile, no explota)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- #4 + #8  save_routine con lock advisory + cierre de sesiones abiertas de
-- las rutinas que se van a desactivar.
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
  if _uid is null then raise exception 'unauthenticated'; end if;

  -- Advisory lock por user para serializar savePlan concurrentes
  perform pg_advisory_xact_lock(hashtext(_uid::text));

  -- Cerrar sesiones abiertas de rutinas que se van a desactivar
  update workout_sessions
     set finished_at = now()
   where user_id = _uid
     and finished_at is null
     and routine_day_id in (
       select rd.id from routine_days rd
       join routines r on r.id = rd.routine_id
       where r.owner_id = _uid and r.activa
     );

  -- Desactivar rutinas activas previas
  update routines set activa = false
    where owner_id = _uid and activa;

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
        reps_min, reps_max, duracion_seg, descanso_seg, superset_group
      ) values (
        _day_id,
        (_ex->>'exercise_id')::uuid,
        (_ex->>'orden')::int,
        (_ex->>'series')::int,
        nullif(_ex->>'reps_min','')::int,
        nullif(_ex->>'reps_max','')::int,
        nullif(_ex->>'duracion_seg','')::int,
        coalesce((_ex->>'descanso_seg')::int, 90),
        nullif(_ex->>'superset_group','')::smallint
      );
    end loop;
  end loop;

  return _routine_id;
end;
$$;

-- #23  Limpieza atómica de supersets huérfanos de un día
create or replace function public.cleanup_orphan_supersets(_day_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  _n int;
begin
  with ok as (
    select id, superset_group
    from routine_exercises
    where routine_day_id = _day_id
      and superset_group is not null
  ),
  grupos as (
    select superset_group, count(*) as n from ok group by superset_group
  ),
  huerfanos as (
    select o.id from ok o
    join grupos g on g.superset_group = o.superset_group
    where g.n < 2
  )
  update routine_exercises
     set superset_group = null
   where id in (select id from huerfanos);
  get diagnostics _n = row_count;
  return _n;
end;
$$;
