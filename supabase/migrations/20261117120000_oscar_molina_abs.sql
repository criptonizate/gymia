-- =========================================================================
-- GYMIA · Ejercicios de @oscarmolina6867 · tanda 1 (abdomen)
-- =========================================================================

insert into exercises (
  nombre, slug, muscle_group_id, equipment_id, secondary_muscles,
  patron, tipo, tipo_registro, nivel_minimo,
  instrucciones, errores_comunes, media_frames, youtube_query, youtube_video_id
)
values
(
  'Abdomen cortito',
  'abdomen-cortito',
  (select id from muscle_groups where slug = 'core'),
  (select id from equipment where slug = 'peso-corporal'),
  array[]::text[],
  'core_flexion', 'aislamiento', 'reps', 'principiante',
  array[
    'Boca arriba, rodillas flexionadas, pies apoyados.',
    'Despegá hombros del piso con recorrido corto contrayendo el abdomen.',
    'Bajá controlado sin apoyar del todo la cabeza.'
  ],
  array['Tirar del cuello', 'Hacer impulso con los brazos'],
  array[]::text[],
  'abdomen cortito',
  'ZTV1naU_mk8'
),
(
  'Abdomen cortos tocando el tobillo',
  'abdomen-cortos-tocando-tobillo',
  (select id from muscle_groups where slug = 'core'),
  (select id from equipment where slug = 'peso-corporal'),
  array[]::text[],
  'core_lateral', 'aislamiento', 'reps', 'principiante',
  array[
    'Boca arriba, rodillas flexionadas, pies apoyados.',
    'Despegá el tronco y llevá la mano a tocar el tobillo del mismo lado.',
    'Alterná lados manteniendo la lumbar pegada al piso.'
  ],
  array['Levantar demasiado el tronco', 'Empujar con el cuello'],
  array[]::text[],
  'abdomen cortos tocando tobillo',
  'ZTV1naU_mk8'
)
on conflict (slug) do update set
  youtube_video_id = excluded.youtube_video_id,
  youtube_query = excluded.youtube_query;
