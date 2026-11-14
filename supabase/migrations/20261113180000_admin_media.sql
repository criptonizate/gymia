-- =========================================================================
-- Admin: permite a usuarios con profiles.role='admin' editar
-- las columnas media_url y media_frames de cualquier ejercicio del
-- catálogo global.
--
-- IMPORTANTE: después de aplicar la migración, marcate como admin con:
--   update profiles set role = 'admin' where id = auth.uid();
-- (o sustituyendo id por tu uuid real).
-- =========================================================================

-- Helper: ¿el user actual es admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Policy de UPDATE: además de "exercises update own", el admin puede
-- actualizar cualquier ejercicio.
drop policy if exists "exercises admin update" on exercises;
create policy "exercises admin update" on exercises
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
