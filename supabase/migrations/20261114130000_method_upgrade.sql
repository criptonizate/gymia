-- =========================================================================
-- Tanda A: columna RIR en set_logs. Tanda B: ampliación del perfil y
-- nuevos valores del enum objetivo.
-- =========================================================================

-- RIR (reps en reserva) por serie realizada.
alter table set_logs add column if not exists rir smallint
  check (rir is null or (rir between 0 and 5));

-- RIR objetivo por ejercicio de la rutina (prescripción).
alter table routine_exercises add column if not exists rir_objetivo smallint
  check (rir_objetivo is null or (rir_objetivo between 0 and 5));

-- Nuevos objetivos (ACSM / spec)
alter type objetivo add value if not exists 'perdida_grasa';
alter type objetivo add value if not exists 'rendimiento_deportivo';

-- Perfil extendido
alter table profiles add column if not exists edad smallint
  check (edad is null or (edad between 10 and 100));
alter table profiles add column if not exists sexo text
  check (sexo is null or sexo in ('masculino','femenino','otro'));
alter table profiles add column if not exists altura_cm smallint
  check (altura_cm is null or (altura_cm between 100 and 230));
alter table profiles add column if not exists limitaciones text[]
  default '{}' not null;
alter table profiles add column if not exists duracion_sesion_min smallint
  check (duracion_sesion_min is null or (duracion_sesion_min between 20 and 180));
alter table profiles add column if not exists grupos_prioritarios text[]
  default '{}' not null;
alter table profiles add column if not exists otros_deportes text[]
  default '{}' not null;

-- save_routine extendido: ahora incluye rir_objetivo por ejercicio.
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
        reps_min, reps_max, duracion_seg, descanso_seg, superset_group, rir_objetivo
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
