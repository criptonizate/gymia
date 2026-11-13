-- =========================================================================
-- GYMIA · Seed de catálogo global (docs/SPEC.md sección 5)
-- Ejecutar DESPUÉS de las migraciones. Idempotente por slug.
-- =========================================================================

-- --------------------------- Muscle groups -------------------------------
insert into muscle_groups (nombre, slug) values
  ('Pecho',          'pecho'),
  ('Espalda',        'espalda'),
  ('Hombros',        'hombros'),
  ('Bíceps',         'biceps'),
  ('Tríceps',        'triceps'),
  ('Cuádriceps',     'cuadriceps'),
  ('Isquiotibiales', 'isquios'),
  ('Glúteos',        'gluteos'),
  ('Gemelos',        'gemelos'),
  ('Core',           'core')
on conflict (slug) do nothing;

-- --------------------------- Equipment -----------------------------------
insert into equipment (nombre, slug) values
  ('Barra',        'barra'),
  ('Mancuernas',   'mancuernas'),
  ('Máquina',      'maquina'),
  ('Polea',        'polea'),
  ('Banco',        'banco'),
  ('Smith',        'smith'),
  ('Peso corporal','peso-corporal'),
  ('Barra Z',      'barra-z')
on conflict (slug) do nothing;

-- --------------------------- Exercises -----------------------------------
-- Helper temporal: inserta un ejercicio resolviendo slugs y armando URLs
-- raw de github.com/yuhonas/free-exercise-db desde el ID del dataset.
create or replace function _ins_ex(
  _nombre text, _slug text, _mg text, _eq text, _sec text[],
  _patron patron, _tipo tipo_ejercicio, _reg tipo_registro, _nivel nivel,
  _inst text[], _err text[], _freedb_id text, _yt text
) returns void as $$
  insert into exercises (
    nombre, slug, muscle_group_id, equipment_id, secondary_muscles,
    patron, tipo, tipo_registro, nivel_minimo,
    instrucciones, errores_comunes, media_frames, youtube_query
  )
  values (
    _nombre, _slug,
    (select id from muscle_groups where slug = _mg),
    (select id from equipment      where slug = _eq),
    _sec, _patron, _tipo, _reg, _nivel, _inst, _err,
    case
      when _freedb_id is null or _freedb_id = '' then '{}'::text[]
      else array[
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' || _freedb_id || '/0.jpg',
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/' || _freedb_id || '/1.jpg'
      ]
    end,
    _yt
  )
  on conflict (slug) do nothing;
$$ language sql;

-- ========================= PECHO =========================================
select _ins_ex(
  'Press banca plano con barra','press-banca-plano-barra','pecho','barra',
  array['triceps','hombros'],
  'empuje_horizontal','compuesto','peso_reps','intermedio',
  array[
    'Acostate en el banco con los pies apoyados y escápulas retraídas.',
    'Agarrá la barra un poco más ancho que los hombros.',
    'Bajá la barra controlado hasta el pecho medio.',
    'Empujá hacia arriba sin bloquear los codos del todo.'
  ],
  array['Rebotar la barra en el pecho','Despegar los glúteos del banco','Abrir demasiado los codos'],
  'Barbell_Bench_Press_-_Medium_Grip',
  'press banca plano con barra técnica'
);
select _ins_ex(
  'Press banca plano con mancuernas','press-banca-plano-mancuernas','pecho','mancuernas',
  array['triceps','hombros'],
  'empuje_horizontal','compuesto','peso_reps','principiante',
  array[
    'Sentate con las mancuernas en los muslos y recostate llevándolas al pecho.',
    'Palmas hacia los pies, codos a 45° del torso.',
    'Bajá hasta sentir estiramiento en el pecho.',
    'Empujá juntando ligeramente las mancuernas arriba.'
  ],
  array['Codos demasiado abiertos','Rango corto','Zona lumbar despegada'],
  'Dumbbell_Bench_Press',
  'press banca con mancuernas técnica'
);
select _ins_ex(
  'Press banca inclinado con barra','press-banca-inclinado-barra','pecho','barra',
  array['hombros','triceps'],
  'empuje_horizontal','compuesto','peso_reps','intermedio',
  array[
    'Banco a 30°–45°, escápulas retraídas.',
    'Bajá la barra a la zona alta del pecho.',
    'Empujá en diagonal hacia arriba y atrás.'
  ],
  array['Inclinación demasiado alta (pasa a ser press de hombro)','Codos muy abiertos'],
  'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'press banca inclinado barra técnica'
);
select _ins_ex(
  'Press banca inclinado con mancuernas','press-banca-inclinado-mancuernas','pecho','mancuernas',
  array['hombros','triceps'],
  'empuje_horizontal','compuesto','peso_reps','principiante',
  array[
    'Banco a 30°–45°, mancuernas en pecho alto.',
    'Bajá controlado sin perder la retracción escapular.',
    'Empujá llevándolas apenas hacia adentro.'
  ],
  array['Banco demasiado inclinado','Rebote con el pecho','Codos trabados'],
  'Incline_Dumbbell_Press',
  'press inclinado mancuernas técnica'
);
select _ins_ex(
  'Press pecho en máquina','press-pecho-maquina','pecho','maquina',
  array['triceps','hombros'],
  'empuje_horizontal','compuesto','peso_reps','principiante',
  array[
    'Ajustá el asiento para que los agarres queden a la altura del pecho medio.',
    'Pecho afuera y escápulas apoyadas.',
    'Empujá hasta casi extender sin trabar los codos.'
  ],
  array['Elevar hombros','Ajuste de asiento incorrecto'],
  'Machine_Bench_Press',
  'press pecho en máquina técnica'
);
select _ins_ex(
  'Aperturas con mancuernas','aperturas-mancuernas','pecho','mancuernas',
  array['hombros'],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Acostado en banco plano o inclinado, codos ligeramente flexionados.',
    'Abrí los brazos en arco hasta sentir el estiramiento del pecho.',
    'Cerrá traccionando con el pecho, no con los codos.'
  ],
  array['Flexionar los codos como en un press','Bajar demasiado el peso'],
  'Dumbbell_Flyes',
  'aperturas con mancuernas técnica'
);
select _ins_ex(
  'Cruce de poleas alto','cruce-poleas-alto','pecho','polea',
  array['hombros'],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Poleas en lo alto, un paso adelante, torso levemente inclinado.',
    'Codos semiflexionados fijos, traccioná en arco hacia el ombligo.',
    'Cruzá las manos adelante y volvé controlado.'
  ],
  array['Flexionar y extender los codos','Rango demasiado corto'],
  'Cable_Crossover',
  'cruce poleas alto técnica'
);
select _ins_ex(
  'Cruce de poleas bajo','cruce-poleas-bajo','pecho','polea',
  array['hombros'],
  'aislamiento','aislamiento','peso_reps','intermedio',
  array[
    'Poleas en lo bajo, un paso adelante, torso erguido.',
    'Traccioná en arco hacia arriba y adentro, a la altura del mentón.',
    'Juntá las manos y volvé controlado.'
  ],
  array['Encoger hombros al final','Perder la postura del torso'],
  'Low_Cable_Crossover',
  'cruce poleas bajo técnica'
);
select _ins_ex(
  'Pec deck (contractor)','pec-deck','pecho','maquina',
  array['hombros'],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Sentate con espalda y hombros apoyados.',
    'Codos a 90° sobre los pads, no los brazos.',
    'Juntá los pads por delante contrayendo el pecho.'
  ],
  array['Hombros adelantados','Rango corto'],
  'Butterfly',
  'pec deck máquina técnica'
);
select _ins_ex(
  'Fondos en paralelas (pecho)','fondos-paralelas','pecho','peso-corporal',
  array['triceps','hombros'],
  'empuje_horizontal','compuesto','reps','intermedio',
  array[
    'Agarrate de las paralelas con brazos extendidos.',
    'Inclinate adelante para enfatizar pecho.',
    'Bajá hasta que los hombros queden por debajo de los codos.',
    'Empujá hasta la extensión.'
  ],
  array['Torso vertical (quita pecho)','Rango corto','Codos trabados arriba'],
  'Dips_-_Chest_Version',
  'fondos paralelas pecho técnica'
);

-- ========================= ESPALDA =======================================
select _ins_ex(
  'Jalón al pecho agarre ancho','jalon-al-pecho-ancho','espalda','polea',
  array['biceps','hombros'],
  'traccion_vertical','compuesto','peso_reps','principiante',
  array[
    'Agarre prono un poco más ancho que los hombros.',
    'Pecho afuera, escápulas abajo y atrás.',
    'Traccioná la barra hacia el pecho alto.',
    'Volvé controlado hasta la extensión.'
  ],
  array['Inclinarse demasiado atrás','Traccionar con los brazos (no con la espalda)'],
  'Wide-Grip_Lat_Pulldown',
  'jalón al pecho agarre ancho técnica'
);
select _ins_ex(
  'Jalón al pecho agarre neutro','jalon-al-pecho-neutro','espalda','polea',
  array['biceps'],
  'traccion_vertical','compuesto','peso_reps','principiante',
  array[
    'Usá triángulo o barra con agarre neutro.',
    'Pecho afuera, codos pegados al cuerpo.',
    'Traccioná al pecho pensando en bajar los codos.'
  ],
  array['Encoger hombros','Perder la postura del torso'],
  'Close-Grip_Front_Lat_Pulldown',
  'jalón al pecho agarre neutro'
);
select _ins_ex(
  'Dominadas asistidas','dominadas-asistidas','espalda','maquina',
  array['biceps','hombros'],
  'traccion_vertical','compuesto','reps','principiante',
  array[
    'Arrodillate o paráte en el pad de asistencia.',
    'Agarre prono, escápulas abajo y atrás.',
    'Traccioná hasta pasar el mentón.'
  ],
  array['Peso de asistencia demasiado alto','Rango corto'],
  'Band_Assisted_Pull-Up',
  'dominadas asistidas máquina'
);
select _ins_ex(
  'Remo con barra','remo-con-barra','espalda','barra',
  array['biceps','isquios'],
  'traccion_horizontal','compuesto','peso_reps','intermedio',
  array[
    'Pies al ancho de caderas, flexión de cadera a 45°.',
    'Espalda neutra, barra cerca de las piernas.',
    'Traccioná la barra al abdomen bajo.',
    'Bajá controlado sin perder la posición.'
  ],
  array['Redondear la espalda','Tirar hacia el pecho (es más alto)','Impulsar con tren inferior'],
  'Bent_Over_Barbell_Row',
  'remo con barra técnica'
);
select _ins_ex(
  'Remo con mancuerna a una mano','remo-mancuerna','espalda','mancuernas',
  array['biceps'],
  'traccion_horizontal','compuesto','peso_reps','principiante',
  array[
    'Una rodilla y una mano en el banco, espalda plana.',
    'Mancuerna colgando de la mano libre.',
    'Traccioná a la cadera llevando el codo hacia atrás.'
  ],
  array['Rotar el torso al traccionar','Codo demasiado abierto'],
  'One-Arm_Dumbbell_Row',
  'remo una mano mancuerna'
);
select _ins_ex(
  'Remo en polea baja (triángulo)','remo-polea-baja','espalda','polea',
  array['biceps'],
  'traccion_horizontal','compuesto','peso_reps','principiante',
  array[
    'Sentado, pies apoyados, rodillas semiflexionadas.',
    'Pecho afuera, columna neutra.',
    'Traccioná al abdomen pegando los codos al cuerpo.'
  ],
  array['Redondear o hiperextender la espalda','Terminar el movimiento con los brazos'],
  'Seated_Cable_Rows',
  'remo polea baja sentado'
);
select _ins_ex(
  'Remo en máquina','remo-maquina','espalda','maquina',
  array['biceps'],
  'traccion_horizontal','compuesto','peso_reps','principiante',
  array[
    'Pecho apoyado en el pad, pies firmes.',
    'Agarres según equipo, codos cerca del torso.',
    'Traccioná hasta sentir la contracción de la espalda media.'
  ],
  array['Despegar el pecho del pad','Encoger hombros'],
  'Smith_Machine_Bent_Over_Row',
  'remo en máquina técnica'
);
select _ins_ex(
  'Pullover en polea','pullover-polea','espalda','polea',
  array['triceps','core'],
  'aislamiento','aislamiento','peso_reps','intermedio',
  array[
    'De pie frente a una polea alta, barra recta o soga.',
    'Codos semirrígidos, bajá la barra en arco hasta los muslos.',
    'Volvé controlado sintiendo el estiramiento del dorsal.'
  ],
  array['Flexionar los codos como pressdown','Perder la retracción escapular'],
  'Straight-Arm_Pulldown',
  'pullover polea técnica'
);
select _ins_ex(
  'Face pull','face-pull','espalda','polea',
  array['hombros'],
  'traccion_horizontal','aislamiento','peso_reps','principiante',
  array[
    'Polea a la altura de la cara, soga con agarre prono.',
    'Traccioná llevando los puños a la frente y los codos altos.',
    'Apretá los romboides y el deltoides posterior.'
  ],
  array['Codos bajos','Encoger trapecios'],
  'Face_Pull',
  'face pull técnica'
);
select _ins_ex(
  'Peso muerto convencional','peso-muerto','espalda','barra',
  array['gluteos','isquios','core'],
  'bisagra','compuesto','peso_reps','intermedio',
  array[
    'Pies al ancho de caderas, barra sobre el medio del pie.',
    'Cadera y rodillas flexionadas, espalda neutra.',
    'Empujá el piso llevando la cadera adelante.',
    'Bloqueá sin hiperextender arriba.'
  ],
  array['Redondear lumbares','Hiperextender arriba','Barra lejos del cuerpo'],
  'Barbell_Deadlift',
  'peso muerto técnica'
);

-- ========================= HOMBROS =======================================
select _ins_ex(
  'Press militar con barra','press-militar-barra','hombros','barra',
  array['triceps','core'],
  'empuje_vertical','compuesto','peso_reps','intermedio',
  array[
    'Barra a la altura de clavículas, codos ligeramente adelante.',
    'Empujá en línea recta pasando la cabeza por debajo.',
    'Arriba, bloqueá con los glúteos y el core activos.'
  ],
  array['Hiperextensión lumbar','Empujar la barra adelante'],
  'Standing_Military_Press',
  'press militar barra técnica'
);
select _ins_ex(
  'Press hombros con mancuernas','press-hombros-mancuernas','hombros','mancuernas',
  array['triceps'],
  'empuje_vertical','compuesto','peso_reps','principiante',
  array[
    'Sentado con respaldo o de pie, mancuernas a la altura de los hombros.',
    'Codos a unos 30° del plano frontal.',
    'Empujá hacia arriba sin bloquear.'
  ],
  array['Abrir demasiado los codos','Despegar la espalda del respaldo'],
  'Dumbbell_Shoulder_Press',
  'press hombros mancuernas técnica'
);
select _ins_ex(
  'Press hombros en máquina','press-hombros-maquina','hombros','maquina',
  array['triceps'],
  'empuje_vertical','compuesto','peso_reps','principiante',
  array[
    'Asiento ajustado con los agarres a la altura de los hombros.',
    'Espalda apoyada, core activo.',
    'Empujá hacia arriba controlado.'
  ],
  array['Asiento mal regulado','Trabar codos arriba'],
  'Machine_Shoulder_Military_Press',
  'press hombros máquina técnica'
);
select _ins_ex(
  'Elevaciones laterales con mancuernas','elevaciones-laterales-mancuernas','hombros','mancuernas',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'De pie, mancuernas a los costados, codos levemente flexionados.',
    'Levantá en arco hasta la altura de los hombros.',
    'Bajá controlado sin impulso.'
  ],
  array['Usar impulso de cadera','Subir por encima de los hombros','Encoger trapecios'],
  'Side_Lateral_Raise',
  'elevaciones laterales mancuernas'
);
select _ins_ex(
  'Elevaciones laterales en polea','elevaciones-laterales-polea','hombros','polea',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','intermedio',
  array[
    'Polea baja cruzando por delante del cuerpo.',
    'Levantá el brazo lateral hasta la altura del hombro.',
    'Bajá controlado manteniendo tensión.'
  ],
  array['Rotar el torso','Ir demasiado pesado y usar impulso'],
  'Cable_Seated_Lateral_Raise',
  'elevación lateral polea'
);
select _ins_ex(
  'Vuelos posteriores con mancuernas','vuelos-posteriores-mancuernas','hombros','mancuernas',
  array['espalda'],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Torso inclinado adelante, espalda neutra.',
    'Mancuernas colgando, codos semiflexionados.',
    'Abrí en arco hasta la altura de los hombros.'
  ],
  array['Flexionar y extender los codos','Encoger trapecios'],
  'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench',
  'vuelos posteriores mancuernas'
);
select _ins_ex(
  'Pec deck invertido','pec-deck-invertido','hombros','maquina',
  array['espalda'],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Pecho apoyado, agarres en posición trasera.',
    'Abrí los brazos en arco con codos semiflexionados.',
    'Apretá el deltoides posterior al final.'
  ],
  array['Encoger hombros al final','Rango corto'],
  'Reverse_Machine_Flyes',
  'pec deck invertido técnica'
);
select _ins_ex(
  'Elevación frontal en polea','elevacion-frontal-polea','hombros','polea',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Polea baja por detrás de las piernas, agarre prono.',
    'Elevá en arco hasta la altura de los hombros.',
    'Bajá controlado sin impulso.'
  ],
  array['Inclinarse atrás','Subir por encima del hombro'],
  'Front_Cable_Raise',
  'elevación frontal polea'
);

-- ========================= BÍCEPS ========================================
select _ins_ex(
  'Curl con barra','curl-barra','biceps','barra',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'De pie, agarre supino al ancho de hombros.',
    'Codos pegados al torso, flexioná el brazo.',
    'Bajá controlado sin extender del todo.'
  ],
  array['Balancear el torso','Separar los codos'],
  'Barbell_Curl',
  'curl con barra bíceps'
);
select _ins_ex(
  'Curl con barra Z','curl-barra-z','biceps','barra-z',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Agarre en las curvas internas de la Z.',
    'Codos pegados al torso, flexioná con control.',
    'Bajá controlado.'
  ],
  array['Rebotar en los muslos','Inclinarse atrás'],
  'EZ-Bar_Curl',
  'curl con barra z técnica'
);
select _ins_ex(
  'Curl alternado con mancuernas','curl-alternado','biceps','mancuernas',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'De pie, mancuernas al costado en agarre neutro.',
    'Al flexionar, rotá a supino.',
    'Bajá controlado rotando a neutro de nuevo.'
  ],
  array['Empezar la supinación tarde','Impulsar con hombros'],
  'Dumbbell_Alternate_Bicep_Curl',
  'curl alternado mancuernas'
);
select _ins_ex(
  'Curl martillo','curl-martillo','biceps','mancuernas',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Agarre neutro todo el movimiento.',
    'Codos pegados al torso.',
    'Flexioná y bajá controlado.'
  ],
  array['Balanceo del torso'],
  'Hammer_Curls',
  'curl martillo mancuernas'
);
select _ins_ex(
  'Curl en banco Scott','curl-scott','biceps','barra-z',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','intermedio',
  array[
    'Pecho apoyado en el pad, brazos extendidos sobre el banco.',
    'Flexioná sin despegar los codos del pad.',
    'Bajá hasta casi extender sin bloquear.'
  ],
  array['Extender a tope de golpe','Despegar codos del pad'],
  'Preacher_Curl',
  'curl scott técnica'
);
select _ins_ex(
  'Curl en polea','curl-polea','biceps','polea',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Polea baja, agarre recto o soga.',
    'Codos pegados al torso, flexioná controlado.',
    'Bajá sin perder la tensión.'
  ],
  array['Separar los codos','Inclinarse atrás'],
  'Standing_Biceps_Cable_Curl',
  'curl en polea bíceps'
);

-- ========================= TRÍCEPS =======================================
select _ins_ex(
  'Extensión en polea con soga','extension-polea-soga','triceps','polea',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Polea alta con soga, codos pegados al torso.',
    'Extendé abajo separando los extremos de la soga.',
    'Volvé controlado.'
  ],
  array['Despegar codos','Inclinarse adelante'],
  'Triceps_Pushdown',
  'extensión tríceps soga polea'
);
select _ins_ex(
  'Extensión en polea con barra','extension-polea-barra','triceps','polea',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Polea alta con barra recta, agarre prono.',
    'Codos pegados al torso, extendé hacia abajo.',
    'Volvé controlado.'
  ],
  array['Despegar codos','Usar el torso'],
  'Triceps_Pushdown_-_V-Bar_Attachment',
  'extensión tríceps polea barra'
);
select _ins_ex(
  'Press francés con barra Z','press-frances','triceps','barra-z',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','intermedio',
  array[
    'Acostado en banco plano, brazos verticales.',
    'Flexioná los codos llevando la barra a la frente.',
    'Extendé sin mover los codos.'
  ],
  array['Mover los codos adelante/atrás','Rebotar en la cabeza'],
  'EZ-Bar_Skullcrusher',
  'press francés técnica'
);
select _ins_ex(
  'Extensión sobre la cabeza en polea','extension-sobre-cabeza-polea','triceps','polea',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'De espaldas a la polea alta, soga por encima de la cabeza.',
    'Codos arriba, flexioná dejando caer las manos atrás.',
    'Extendé arriba sin mover los codos.'
  ],
  array['Bajar los codos','Arquear la espalda'],
  'Standing_Overhead_Barbell_Triceps_Extension',
  'extensión tríceps sobre cabeza polea'
);
select _ins_ex(
  'Fondos en banco','fondos-banco','triceps','peso-corporal',
  array['hombros'],
  'empuje_vertical','compuesto','reps','principiante',
  array[
    'Manos en el banco, piernas extendidas o flexionadas.',
    'Bajá flexionando los codos hacia atrás.',
    'Empujá hasta la extensión.'
  ],
  array['Codos muy abiertos','Rango corto'],
  'Bench_Dips',
  'fondos en banco tríceps'
);
select _ins_ex(
  'Patada de tríceps en polea','patada-triceps-polea','triceps','polea',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Polea baja, torso inclinado, codo pegado al costado.',
    'Extendé el brazo hacia atrás contrayendo el tríceps.',
    'Volvé controlado.'
  ],
  array['Mover el hombro','Perder la inclinación del torso'],
  'Tricep_Dumbbell_Kickback',
  'patada tríceps polea'
);

-- ========================= PIERNAS: cuádriceps ===========================
select _ins_ex(
  'Sentadilla con barra','sentadilla-barra','cuadriceps','barra',
  array['gluteos','isquios','core'],
  'sentadilla','compuesto','peso_reps','intermedio',
  array[
    'Barra en trapecio alto, pies al ancho de hombros, puntas apenas afuera.',
    'Bajá rompiendo cadera y rodillas a la vez.',
    'Mantené la espalda neutra y el pecho arriba.',
    'Subí empujando el piso.'
  ],
  array['Caer en valgo las rodillas','Redondear la espalda','Despegar los talones'],
  'Barbell_Squat',
  'sentadilla con barra técnica'
);
select _ins_ex(
  'Sentadilla goblet','sentadilla-goblet','cuadriceps','mancuernas',
  array['gluteos','core'],
  'sentadilla','compuesto','peso_reps','principiante',
  array[
    'Mancuerna sostenida por la cabeza contra el pecho.',
    'Pies al ancho de hombros, bajá recto.',
    'Mantené codos adentro de las rodillas.'
  ],
  array['Inclinarse adelante','Talones despegados'],
  'Goblet_Squat',
  'sentadilla goblet técnica'
);
select _ins_ex(
  'Sentadilla en Smith','sentadilla-smith','cuadriceps','smith',
  array['gluteos'],
  'sentadilla','compuesto','peso_reps','principiante',
  array[
    'Pies un poco adelante del eje de la barra.',
    'Bajá recto en la guía manteniendo el pecho arriba.',
    'Subí empujando con el medio del pie.'
  ],
  array['Pies demasiado atrás (mucha rodilla)','Trabar las rodillas arriba'],
  'Smith_Machine_Squat',
  'sentadilla en smith técnica'
);
select _ins_ex(
  'Prensa 45°','prensa-45','cuadriceps','maquina',
  array['gluteos','isquios'],
  'sentadilla','compuesto','peso_reps','principiante',
  array[
    'Pies al ancho de hombros a media altura del plato.',
    'Bajá hasta que las rodillas queden cerca del pecho sin despegar lumbares.',
    'Empujá sin trabar las rodillas.'
  ],
  array['Despegar la zona lumbar','Trabar las rodillas arriba'],
  'Leg_Press',
  'prensa 45 técnica'
);
select _ins_ex(
  'Hack sentadilla','hack-sentadilla','cuadriceps','maquina',
  array['gluteos'],
  'sentadilla','compuesto','peso_reps','intermedio',
  array[
    'Hombros contra los pads, pies al ancho de hombros.',
    'Bajá controlado hasta 90°.',
    'Empujá empujando el piso.'
  ],
  array['Levantar talones','Trabar rodillas arriba'],
  'Hack_Squat',
  'hack squat técnica'
);
select _ins_ex(
  'Extensión de cuádriceps','extension-cuadriceps','cuadriceps','maquina',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Sentado, pads sobre los empeines.',
    'Extendé las rodillas hasta casi trabar.',
    'Bajá controlado.'
  ],
  array['Rebotar arriba','Impulsar con el torso'],
  'Leg_Extensions',
  'extensión de cuádriceps máquina'
);
select _ins_ex(
  'Zancadas con mancuernas','zancadas','cuadriceps','mancuernas',
  array['gluteos','isquios'],
  'zancada','compuesto','peso_reps','principiante',
  array[
    'Mancuernas a los costados, paso largo adelante.',
    'Bajá hasta que la rodilla trasera quede cerca del piso.',
    'Volvé empujando con el talón de la pierna delantera.'
  ],
  array['Paso corto (mucha rodilla)','Torso muy adelantado'],
  'Dumbbell_Lunges',
  'zancadas mancuernas técnica'
);
select _ins_ex(
  'Sentadilla búlgara','sentadilla-bulgara','cuadriceps','mancuernas',
  array['gluteos'],
  'zancada','compuesto','peso_reps','intermedio',
  array[
    'Pie trasero apoyado en banco, delantero a un paso.',
    'Bajá recto flexionando la rodilla delantera.',
    'Subí empujando con el talón delantero.'
  ],
  array['Rodilla cayendo en valgo','Paso demasiado corto'],
  'Dumbbell_Rear_Lunge',
  'sentadilla búlgara técnica'
);

-- ========================= PIERNAS: isquios y glúteos ====================
select _ins_ex(
  'Curl femoral acostado','curl-femoral-acostado','isquios','maquina',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Boca abajo, pad sobre los tendones de Aquiles.',
    'Flexioná las rodillas hasta casi tocar el glúteo.',
    'Bajá controlado.'
  ],
  array['Despegar la cadera','Rebote abajo'],
  'Lying_Leg_Curls',
  'curl femoral acostado'
);
select _ins_ex(
  'Curl femoral sentado','curl-femoral-sentado','isquios','maquina',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Pads de muslo ajustados, piernas extendidas.',
    'Flexioná rodillas llevando los pies abajo y atrás.',
    'Volvé controlado.'
  ],
  array['Rango corto','Trabar la rodilla al extender'],
  'Seated_Leg_Curl',
  'curl femoral sentado'
);
select _ins_ex(
  'Peso muerto rumano','peso-muerto-rumano','isquios','barra',
  array['gluteos','espalda'],
  'bisagra','compuesto','peso_reps','intermedio',
  array[
    'Pies al ancho de caderas, rodillas apenas flexionadas.',
    'Empujá la cadera atrás bajando la barra pegada a las piernas.',
    'Bajá hasta sentir estiramiento en isquios.',
    'Subí extendiendo la cadera.'
  ],
  array['Flexionar mucho las rodillas','Redondear la espalda','Hiperextender arriba'],
  'Romanian_Deadlift',
  'peso muerto rumano técnica'
);
select _ins_ex(
  'Hip thrust con barra','hip-thrust','gluteos','barra',
  array['isquios'],
  'bisagra','compuesto','peso_reps','intermedio',
  array[
    'Espalda alta apoyada en banco, pies al ancho de caderas.',
    'Barra en la cadera (con pad).',
    'Empujá la cadera arriba apretando glúteos.',
    'Bajá controlado sin apoyar.'
  ],
  array['Hiperextender la espalda arriba','Pies demasiado cerca o lejos'],
  'Barbell_Hip_Thrust',
  'hip thrust barra técnica'
);
select _ins_ex(
  'Pull-through en polea','pull-through-polea','gluteos','polea',
  array['isquios','espalda'],
  'bisagra','compuesto','peso_reps','principiante',
  array[
    'De espaldas a la polea baja, cuerda entre las piernas.',
    'Empujá la cadera atrás manteniendo la espalda neutra.',
    'Volvé extendiendo cadera, apretando glúteos arriba.'
  ],
  array['Hacer una sentadilla en lugar de bisagra','Hiperextender arriba'],
  'Pull_Through',
  'pull through polea técnica'
);
select _ins_ex(
  'Patada de glúteo en polea','patada-gluteo-polea','gluteos','polea',
  array['isquios'],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Tobillera en la polea baja, agarrate del soporte.',
    'Pierna estirada, llevala atrás contrayendo el glúteo.',
    'Volvé controlado.'
  ],
  array['Arquear la lumbar','Rotar la cadera'],
  'One-Legged_Cable_Kickback',
  'patada glúteo polea técnica'
);
select _ins_ex(
  'Abductores en máquina','abductores-maquina','gluteos','maquina',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Sentado, pads al lado externo de los muslos.',
    'Abrí las rodillas al máximo.',
    'Volvé controlado.'
  ],
  array['Inclinarse adelante exagerado','Rango corto'],
  'Thigh_Abductor',
  'abductores en máquina'
);

-- ========================= PIERNAS: gemelos ==============================
select _ins_ex(
  'Gemelos parado en máquina','gemelos-parado','gemelos','maquina',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Puntas en la plataforma, pads en los hombros.',
    'Bajá hasta estiramiento completo.',
    'Subí a punta de pie apretando el gemelo.'
  ],
  array['Rango corto','Rebote abajo'],
  'Standing_Calf_Raises',
  'gemelos parado máquina'
);
select _ins_ex(
  'Gemelos sentado en máquina','gemelos-sentado','gemelos','maquina',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'Puntas apoyadas, pads sobre los muslos.',
    'Bajá a estiramiento total.',
    'Subí lo más alto posible.'
  ],
  array['Rango corto','Impulso del torso'],
  'Seated_Calf_Raise',
  'gemelos sentado máquina'
);
select _ins_ex(
  'Gemelos en prensa','gemelos-prensa','gemelos','maquina',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'En la prensa, puntas en el borde inferior de la plataforma.',
    'Soltá el seguro, bajá a estiramiento.',
    'Empujá a punta de pie.'
  ],
  array['Flexionar las rodillas','Rango corto'],
  'Calf_Press',
  'gemelos en prensa'
);

-- ========================= CORE ==========================================
select _ins_ex(
  'Plancha frontal','plancha-frontal','core','peso-corporal',
  array['hombros'],
  'core_antiextension','aislamiento','tiempo','principiante',
  array[
    'Antebrazos y puntas de los pies apoyados, cuerpo recto.',
    'Meté la pelvis y contraé glúteos y abdomen.',
    'Mantené la posición respirando normal.'
  ],
  array['Cadera caída','Cola alta','Cabeza hacia abajo'],
  'Plank',
  'plancha frontal técnica'
);
select _ins_ex(
  'Plancha lateral','plancha-lateral','core','peso-corporal',
  array['hombros'],
  'core_lateral','aislamiento','tiempo','principiante',
  array[
    'Antebrazo apoyado, pies alineados o un pie delante.',
    'Cadera arriba formando una línea recta.',
    'Mantené la contracción.'
  ],
  array['Cadera caída','Rotación del torso'],
  'Side_Bridge',
  'plancha lateral técnica'
);
select _ins_ex(
  'Rueda abdominal','rueda-abdominal','core','peso-corporal',
  array['hombros'],
  'core_antiextension','aislamiento','reps','intermedio',
  array[
    'Arrodillado, rueda bajo los hombros.',
    'Rodá adelante manteniendo la pelvis metida.',
    'Volvé sin arquear la espalda.'
  ],
  array['Hiperextender la lumbar','Soltar el core abajo'],
  'Ab_Roller',
  'rueda abdominal técnica'
);
select _ins_ex(
  'Crunch en polea','crunch-polea','core','polea',
  array[]::text[],
  'core_flexion','aislamiento','peso_reps','principiante',
  array[
    'Arrodillado frente a la polea alta, soga en la nuca.',
    'Enrollá la columna llevando los codos a las rodillas.',
    'Volvé controlado sin perder la tensión.'
  ],
  array['Flexionar la cadera en vez del tronco','Tirar con los brazos'],
  'Cable_Crunch',
  'crunch polea técnica'
);
select _ins_ex(
  'Elevación de piernas colgado','elevacion-piernas-colgado','core','peso-corporal',
  array[]::text[],
  'core_flexion','aislamiento','reps','intermedio',
  array[
    'Colgado de una barra, hombros activos.',
    'Elevá las piernas enrollando la pelvis.',
    'Bajá controlado sin balancear.'
  ],
  array['Balancear el cuerpo','Elevar sin flexionar la pelvis'],
  'Hanging_Leg_Raise',
  'elevación piernas colgado'
);
select _ins_ex(
  'Elevación de piernas en paralelas','elevacion-piernas-paralelas','core','peso-corporal',
  array[]::text[],
  'core_flexion','aislamiento','reps','principiante',
  array[
    'Apoyado en los antebrazos en silla romana, espalda contra el respaldo.',
    'Elevá las rodillas o piernas enrollando la pelvis.',
    'Bajá controlado.'
  ],
  array['Balancear piernas','Despegar la espalda del respaldo'],
  'Hanging_Pike',
  'elevación piernas paralelas'
);
select _ins_ex(
  'Pallof press en polea','pallof-press','core','polea',
  array['hombros'],
  'core_antirotacion','aislamiento','peso_reps','principiante',
  array[
    'Polea a la altura del esternón, perpendicular al cable.',
    'Sostené el agarre con ambas manos frente al pecho.',
    'Extendé los brazos y mantené sin rotar.',
    'Volvé controlado.'
  ],
  array['Dejar que el cable te rote','Encorvarse al extender'],
  'Pallof_Press',
  'pallof press polea'
);
select _ins_ex(
  'Leñador en polea','lenador-polea','core','polea',
  array['hombros'],
  'core_antirotacion','aislamiento','peso_reps','intermedio',
  array[
    'Polea alta a un lado, brazos extendidos.',
    'Traccioná en diagonal hacia la cadera opuesta rotando el torso.',
    'Volvé controlado.'
  ],
  array['Flexionar los codos','Usar solo los brazos'],
  'Standing_Cable_Wood_Chop',
  'leñador polea técnica'
);
select _ins_ex(
  'Dead bug','dead-bug','core','peso-corporal',
  array[]::text[],
  'core_antiextension','aislamiento','reps','principiante',
  array[
    'Boca arriba, brazos al techo, caderas y rodillas a 90°.',
    'Estirá brazo y pierna opuestos sin despegar la lumbar.',
    'Volvé y alterná lado.'
  ],
  array['Arquear la espalda','Ir rápido'],
  '',
  'dead bug core técnica'
);
select _ins_ex(
  'Hollow hold','hollow-hold','core','peso-corporal',
  array[]::text[],
  'core_antiextension','aislamiento','tiempo','intermedio',
  array[
    'Boca arriba, lumbar pegada al piso, brazos al techo.',
    'Elevá piernas y escápulas formando un plátano invertido.',
    'Mantené manteniendo la lumbar pegada.'
  ],
  array['Despegar la lumbar','Aguantar la respiración'],
  '',
  'hollow hold core'
);

-- ========================= EXTRAS ========================================
select _ins_ex(
  'Dominadas','dominadas','espalda','peso-corporal',
  array['biceps','hombros'],
  'traccion_vertical','compuesto','reps','avanzado',
  array[
    'Agarre prono un poco más ancho que los hombros.',
    'Escápulas abajo y atrás, pecho afuera.',
    'Traccioná hasta pasar el mentón.',
    'Bajá controlado.'
  ],
  array['Balanceo','Rango corto arriba'],
  'Pullups',
  'dominadas técnica'
);
select _ins_ex(
  'Elevación frontal con mancuernas','elevacion-frontal-mancuernas','hombros','mancuernas',
  array[]::text[],
  'aislamiento','aislamiento','peso_reps','principiante',
  array[
    'De pie, mancuernas al frente de los muslos.',
    'Elevá una (o las dos) al frente hasta la altura del hombro.',
    'Bajá controlado.'
  ],
  array['Balanceo','Subir por encima del hombro'],
  'Front_Dumbbell_Raise',
  'elevación frontal mancuernas'
);
select _ins_ex(
  'Press banca cerrado','press-banca-cerrado','triceps','barra',
  array['pecho','hombros'],
  'empuje_horizontal','compuesto','peso_reps','intermedio',
  array[
    'Agarre al ancho de hombros, codos pegados al torso.',
    'Bajá al pecho bajo sin abrir los codos.',
    'Empujá llevando los codos atrás.'
  ],
  array['Agarre demasiado estrecho (muñecas)','Codos abiertos'],
  'Close-Grip_Barbell_Bench_Press',
  'press banca cerrado tríceps'
);
select _ins_ex(
  'Crunch abdominal','crunch','core','peso-corporal',
  array[]::text[],
  'core_flexion','aislamiento','reps','principiante',
  array[
    'Boca arriba, rodillas flexionadas, manos cruzadas en el pecho.',
    'Enrollá la columna llevando las costillas a la pelvis.',
    'Bajá controlado sin apoyar del todo.'
  ],
  array['Tirar de la cabeza','Hacerlo con impulso'],
  'Crunch_-_Hands_Overhead',
  'crunch abdominal técnica'
);
select _ins_ex(
  'Peso muerto con mancuernas','peso-muerto-mancuernas','gluteos','mancuernas',
  array['isquios','espalda'],
  'bisagra','compuesto','peso_reps','principiante',
  array[
    'Mancuernas al frente de los muslos, rodillas apenas flexionadas.',
    'Empujá la cadera atrás bajando las mancuernas pegadas a las piernas.',
    'Subí extendiendo la cadera, apretando glúteos.'
  ],
  array['Flexionar mucho rodillas','Redondear la espalda'],
  'Stiff-Legged_Dumbbell_Deadlift',
  'peso muerto con mancuernas'
);

-- --------------------------- Limpieza del helper -------------------------
drop function _ins_ex(
  text, text, text, text, text[],
  patron, tipo_ejercicio, tipo_registro, nivel,
  text[], text[], text, text
);
