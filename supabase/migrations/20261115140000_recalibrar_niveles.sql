-- =========================================================================
-- Recalibración de nivel_minimo según consenso de coaching:
--   - Hip hinge con peso (peso muerto) sube a intermedio/avanzado (técnica
--     delicada, alto riesgo lumbar).
--   - Rueda abdominal y fondos paralelas suben a avanzado (muchos no pueden
--     hacerlos y lastiman).
--   - Elevación piernas colgado sube a avanzado (grip + core).
--   - Dominadas asistidas y curl 21s bajan a principiante (son el paso
--     previo / variaciones fáciles).
--   - Sentadilla con salto baja a principiante (plyo básico bodyweight).
--   - Pistol squat asistida baja a intermedio (con asistencia es accesible).
--   - Sentadilla en Smith sube a intermedio (requiere entender carga guiada).
-- =========================================================================

update exercises set nivel_minimo = 'intermedio' where slug in (
  'peso-muerto-mancuernas',
  'peso-muerto-casa',
  'sentadilla-smith',
  'pistol-squat-asistida',
  'elevacion-piernas-paralelas'
);

update exercises set nivel_minimo = 'avanzado' where slug in (
  'peso-muerto',
  'rueda-abdominal',
  'fondos-paralelas',
  'elevacion-piernas-colgado'
);

update exercises set nivel_minimo = 'principiante' where slug in (
  'curl-21s',
  'sentadilla-salto'
);
