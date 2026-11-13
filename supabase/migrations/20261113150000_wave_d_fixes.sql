-- =========================================================================
-- Fixes de QA: save_routine persiste superset_group; helper atómico para
-- obtener el próximo id de superset_group.
-- =========================================================================

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

-- Próximo superset_group único dentro de la rutina activa del user.
create or replace function public.next_superset_group()
returns smallint
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  _max int;
begin
  select coalesce(max(re.superset_group), 0) into _max
  from routine_exercises re
  join routine_days rd on rd.id = re.routine_day_id
  join routines r on r.id = rd.routine_id
  where r.owner_id = auth.uid() and r.activa;
  return (_max + 1)::smallint;
end;
$$;
