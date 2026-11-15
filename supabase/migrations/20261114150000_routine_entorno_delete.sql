-- =========================================================================
-- Guarda el entorno con el que se generó la rutina (para regenerar/mostrar).
-- =========================================================================

alter table routines add column if not exists entorno text
  check (entorno is null or entorno in ('casa','gimnasio'));

-- Reescribo save_routine para incluir entorno en el insert.
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
  perform pg_advisory_xact_lock(hashtext(_uid::text));

  update workout_sessions
     set finished_at = now()
   where user_id = _uid
     and finished_at is null
     and routine_day_id in (
       select rd.id from routine_days rd
       join routines r on r.id = rd.routine_id
       where r.owner_id = _uid and r.activa
     );
  update routines set activa = false where owner_id = _uid and activa;

  insert into routines (
    owner_id, nombre, dias_por_semana, semanas, split,
    nivel, objetivo, entorno, activa
  ) values (
    _uid,
    payload->>'nombre',
    (payload->>'dias_por_semana')::int,
    (payload->>'semanas')::int,
    payload->>'split',
    (payload->>'nivel')::nivel,
    (payload->>'objetivo')::objetivo,
    nullif(payload->>'entorno',''),
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
        reps_min, reps_max, duracion_seg, descanso_seg,
        superset_group, rir_objetivo
      ) values (
        _day_id,
        (_ex->>'exercise_id')::uuid,
        (_ex->>'orden')::int,
        (_ex->>'series')::int,
        nullif(_ex->>'reps_min','')::int,
        nullif(_ex->>'reps_max','')::int,
        nullif(_ex->>'duracion_seg','')::int,
        coalesce((_ex->>'descanso_seg')::int, 90),
        nullif(_ex->>'superset_group','')::smallint,
        nullif(_ex->>'rir_objetivo','')::smallint
      );
    end loop;
  end loop;
  return _routine_id;
end;
$$;

-- Eliminar la rutina activa del user (hard delete del árbol).
create or replace function public.delete_active_routine()
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _n int;
begin
  if _uid is null then raise exception 'unauthenticated'; end if;
  -- Cerrar sesiones abiertas de esa rutina primero.
  update workout_sessions
     set finished_at = now()
   where user_id = _uid
     and finished_at is null
     and routine_day_id in (
       select rd.id from routine_days rd
       join routines r on r.id = rd.routine_id
       where r.owner_id = _uid and r.activa
     );
  -- El cascade de routine_days y routine_exercises los limpia.
  delete from routines where owner_id = _uid and activa;
  get diagnostics _n = row_count;
  return _n;
end;
$$;
