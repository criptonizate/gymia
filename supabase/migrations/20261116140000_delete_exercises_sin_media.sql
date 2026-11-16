-- =========================================================================
-- Eliminar ejercicios sin imagen referencial.
--
-- Candidato: media_url IS NULL y media_frames vacío. Son los que caen
-- al emoji fallback por completo y no tienen frames en Storage.
--
-- La FK set_logs.exercise_id → exercises y routine_exercises.exercise_id
-- → exercises son ON DELETE RESTRICT, así que sólo podemos borrar los
-- que NO estén usados. Los que tengan historial o estén en una rutina
-- los dejamos con un NOTICE para que puedas decidir después qué hacer
-- (p.ej. reemplazarlos con swapExercise en cada rutina).
-- =========================================================================

do $$
declare
  _total int;
  _con_refs int;
  _borrados int;
begin
  select count(*) into _total
  from exercises
  where media_url is null
    and (media_frames is null or array_length(media_frames, 1) is null);

  raise notice 'Candidatos sin media: %', _total;

  with target as (
    select e.id
    from exercises e
    where e.media_url is null
      and (e.media_frames is null or array_length(e.media_frames, 1) is null)
      and not exists (select 1 from routine_exercises re where re.exercise_id = e.id)
      and not exists (select 1 from set_logs sl where sl.exercise_id = e.id)
      -- user_exercise_favorites tiene ON DELETE CASCADE, no hace falta
      -- chequearlo acá: se limpia solo si borramos el exercise.
  )
  delete from exercises
  where id in (select id from target);

  get diagnostics _borrados = row_count;

  select count(*) into _con_refs
  from exercises e
  where e.media_url is null
    and (e.media_frames is null or array_length(e.media_frames, 1) is null)
    and (
      exists (select 1 from routine_exercises re where re.exercise_id = e.id)
      or exists (select 1 from set_logs sl where sl.exercise_id = e.id)
    );

  raise notice 'Borrados: %. Quedan con referencias (rutinas/historial): %.', _borrados, _con_refs;
end$$;

-- Listado de los que QUEDARON para que decidas qué hacer con ellos.
-- Lo podés leer corriendo este SELECT manualmente cuando quieras:
--
-- select e.id, e.nombre, e.slug,
--        (select count(*) from routine_exercises where exercise_id = e.id) as en_rutinas,
--        (select count(*) from set_logs where exercise_id = e.id) as en_historial
-- from exercises e
-- where e.media_url is null
--   and (e.media_frames is null or array_length(e.media_frames, 1) is null)
-- order by en_historial desc, en_rutinas desc, e.nombre;
