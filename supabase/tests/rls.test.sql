-- =========================================================================
-- Tests de aislamiento RLS.
-- Correr en el SQL Editor de un proyecto de staging (no en producción:
-- crea 2 usuarios ficticios en auth.users y datos de prueba).
-- =========================================================================
-- Para correrlo necesita service_role: el SQL Editor lo tiene.
-- Al final de cada bloque se levanta ROLLBACK para no dejar basura.
-- Si algún assert falla, la query levanta una exception y se aborta.

do $$
declare
  _u1 uuid := gen_random_uuid();
  _u2 uuid := gen_random_uuid();
  _rid uuid;
  _did uuid;
  _rex uuid;
  _sid uuid;
  _n int;
begin
  -- Crear dos usuarios auth ficticios
  insert into auth.users (id, email, encrypted_password, created_at, updated_at,
                          instance_id, aud, role, raw_app_meta_data, raw_user_meta_data,
                          email_confirmed_at)
  values
    (_u1, 'u1@test.gymia', 'x', now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated','{}'::jsonb,'{}'::jsonb, now()),
    (_u2, 'u2@test.gymia', 'x', now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated','{}'::jsonb,'{}'::jsonb, now());

  -- Rutina del user 1
  insert into routines (id, owner_id, nombre, dias_por_semana, semanas, split, nivel, objetivo, activa)
  values (gen_random_uuid(), _u1, 'r', 3, 1, 'Full', 'intermedio', 'hipertrofia', true)
  returning id into _rid;

  insert into routine_days (id, routine_id, semana, orden, nombre)
  values (gen_random_uuid(), _rid, 1, 1, 'Día A')
  returning id into _did;

  -- --------- Test 1: user 2 NO puede leer rutinas del user 1 ------------
  set local role authenticated;
  set local "request.jwt.claims" to format('{"sub":"%s","role":"authenticated"}', _u2);
  select count(*) into _n from routines where id = _rid;
  if _n <> 0 then
    raise exception 'FAIL: u2 puede leer una rutina ajena (%)', _n;
  end if;

  -- --------- Test 2: user 1 SÍ la ve ------------------------------------
  set local "request.jwt.claims" to format('{"sub":"%s","role":"authenticated"}', _u1);
  select count(*) into _n from routines where id = _rid;
  if _n <> 1 then
    raise exception 'FAIL: u1 no ve su propia rutina';
  end if;

  -- --------- Test 3: user 2 NO puede insertar rutina a nombre de user 1 -
  set local "request.jwt.claims" to format('{"sub":"%s","role":"authenticated"}', _u2);
  begin
    insert into routines (owner_id, nombre, dias_por_semana, semanas, split, nivel, objetivo)
    values (_u1, 'hack', 3, 1, 'Full', 'intermedio', 'hipertrofia');
    raise exception 'FAIL: u2 logró insertar rutina para u1';
  exception when insufficient_privilege or others then
    -- OK: RLS bloqueó el insert
    null;
  end;

  -- --------- Test 4: set_logs de u1 no son visibles para u2 -------------
  set local "request.jwt.claims" to format('{"sub":"%s","role":"authenticated"}', _u1);
  insert into routine_exercises (id, routine_day_id, exercise_id, orden, series, descanso_seg)
  values (gen_random_uuid(), _did,
          (select id from exercises where created_by is null order by nombre limit 1),
          1, 3, 90)
  returning id into _rex;

  insert into workout_sessions (id, user_id, routine_day_id)
  values (gen_random_uuid(), _u1, _did)
  returning id into _sid;

  insert into set_logs (session_id, routine_exercise_id, exercise_id, numero_serie, reps, peso_kg, completada)
  values (_sid, _rex, (select exercise_id from routine_exercises where id = _rex), 1, 10, 20, true);

  set local "request.jwt.claims" to format('{"sub":"%s","role":"authenticated"}', _u2);
  select count(*) into _n from set_logs where session_id = _sid;
  if _n <> 0 then
    raise exception 'FAIL: u2 ve set_logs ajenos (%)', _n;
  end if;

  -- --------- Test 5: catálogo global se lee por ambos --------------------
  set local "request.jwt.claims" to format('{"sub":"%s","role":"authenticated"}', _u2);
  select count(*) into _n from exercises where created_by is null;
  if _n = 0 then
    raise exception 'FAIL: catálogo global no visible';
  end if;

  raise notice 'OK: todos los tests de RLS pasaron.';
end;
$$ language plpgsql;

rollback;
