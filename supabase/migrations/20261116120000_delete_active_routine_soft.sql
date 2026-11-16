-- =========================================================================
-- delete_active_routine pasa a soft delete.
--
-- El hard delete rompía contra la FK on delete restrict de
-- workout_sessions.routine_day_id y workout_logs.routine_exercise_id:
--   ERROR:  update or delete on table "routine_days" violates foreign
--   key constraint ... on table "workout_sessions"
-- cuando el user tenía sesiones históricas que referenciaban la rutina.
--
-- La UI promete "el historial queda intacto", así que soft delete es la
-- semántica correcta: marcamos la rutina como no activa y preservamos
-- todo el árbol para que las sesiones pasadas sigan resolviendo.
-- =========================================================================

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

  -- Soft delete: marcar la rutina como inactiva.
  update routines
     set activa = false
   where owner_id = _uid
     and activa;
  get diagnostics _n = row_count;

  return _n;
end;
$$;
