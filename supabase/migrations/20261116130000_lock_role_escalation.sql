-- =========================================================================
-- Seguridad: bloquear escalada de privilegios vía profiles.role
--
-- La policy "profiles self update" (20261113120200_rls.sql:49) permite al
-- user actualizar cualquier columna de su fila, incluida `role`. Con
-- `is_admin()` leyendo esa columna y habilitando operaciones sobre
-- ejercicios globales, un user autenticado podía ejecutar:
--
--   update profiles set role = 'admin' where id = auth.uid();
--
-- y pasar a admin con el anon key.
--
-- RLS en Postgres no soporta restringir columnas por policy, así que
-- bloqueamos el cambio de `role` con un trigger BEFORE UPDATE.
-- =========================================================================

create or replace function public.profiles_prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.role is distinct from OLD.role then
    -- Sólo un admin existente puede cambiar el rol (propio o ajeno). Como
    -- la policy self-update ya limita a NEW.id = auth.uid(), para subir a
    -- otro user se necesita además que haya políticas que lo permitan.
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'no permission to change role'
        using errcode = '42501';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.profiles_prevent_role_escalation();
