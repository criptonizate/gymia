-- =========================================================================
-- RLS y políticas (docs/SPEC.md sección 4)
-- =========================================================================

create or replace function public.is_trainer_of(client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from trainer_clients
    where trainer_id = auth.uid()
      and client_id  = client
      and estado     = 'activo'
  );
$$;

-- -------- Catálogo (solo lectura autenticada) ----------------------------
alter table muscle_groups enable row level security;
create policy "muscle_groups read" on muscle_groups
  for select to authenticated using (true);

alter table equipment enable row level security;
create policy "equipment read" on equipment
  for select to authenticated using (true);

-- -------- exercises ------------------------------------------------------
alter table exercises enable row level security;
create policy "exercises read global or own" on exercises
  for select to authenticated
  using (created_by is null or created_by = auth.uid());
create policy "exercises insert own" on exercises
  for insert to authenticated
  with check (created_by = auth.uid());
create policy "exercises update own" on exercises
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
create policy "exercises delete own" on exercises
  for delete to authenticated
  using (created_by = auth.uid());

-- -------- profiles -------------------------------------------------------
alter table profiles enable row level security;
create policy "profiles self select" on profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles self update" on profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- INSERT lo hace el trigger con security definer.

-- -------- routines y cascada ---------------------------------------------
alter table routines enable row level security;
create policy "routines owner all" on routines
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table routine_days enable row level security;
create policy "routine_days via routine" on routine_days
  for all to authenticated
  using (exists (select 1 from routines r where r.id = routine_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from routines r where r.id = routine_id and r.owner_id = auth.uid()));

alter table routine_exercises enable row level security;
create policy "routine_exercises via day" on routine_exercises
  for all to authenticated
  using (exists (
    select 1 from routine_days d
    join routines r on r.id = d.routine_id
    where d.id = routine_day_id and r.owner_id = auth.uid()))
  with check (exists (
    select 1 from routine_days d
    join routines r on r.id = d.routine_id
    where d.id = routine_day_id and r.owner_id = auth.uid()));

-- -------- user_exercise_videos -------------------------------------------
alter table user_exercise_videos enable row level security;
create policy "user_exercise_videos owner" on user_exercise_videos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------- workout_sessions -----------------------------------------------
alter table workout_sessions enable row level security;
create policy "workout_sessions owner" on workout_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------- set_logs (via session) -----------------------------------------
alter table set_logs enable row level security;
create policy "set_logs via session" on set_logs
  for all to authenticated
  using (exists (select 1 from workout_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from workout_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- -------- trainer_clients ------------------------------------------------
alter table trainer_clients enable row level security;
create policy "trainer_clients self" on trainer_clients
  for select to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

-- =========================================================================
-- Fase 2: políticas de trainer (dejadas comentadas, ver SPEC §10)
-- =========================================================================
-- create policy "trainer reads client profile" on profiles
--   for select to authenticated using (public.is_trainer_of(id));
-- create policy "trainer reads client routines" on routines
--   for select to authenticated using (public.is_trainer_of(owner_id));
-- create policy "trainer writes client routines" on routines
--   for insert to authenticated with check (public.is_trainer_of(owner_id));
-- create policy "trainer updates client routines" on routines
--   for update to authenticated
--     using (public.is_trainer_of(owner_id))
--     with check (public.is_trainer_of(owner_id));
-- create policy "trainer reads client sessions" on workout_sessions
--   for select to authenticated using (public.is_trainer_of(user_id));
-- create policy "trainer reads client set_logs" on set_logs
--   for select to authenticated
--     using (exists (select 1 from workout_sessions s
--                    where s.id = session_id
--                      and public.is_trainer_of(s.user_id)));
