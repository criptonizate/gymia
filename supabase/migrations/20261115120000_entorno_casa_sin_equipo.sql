-- =========================================================================
-- Agrega "casa_sin_equipo" como entorno valido para routines.
-- =========================================================================

alter table routines drop constraint if exists routines_entorno_check;

alter table routines add constraint routines_entorno_check
  check (entorno is null or entorno in ('casa','casa_sin_equipo','gimnasio'));
