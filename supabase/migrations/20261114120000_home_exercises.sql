-- =========================================================================
-- Ejercicios para entrenar EN CASA (peso corporal y mancuernas improvisadas).
-- Las mancuernas se pueden reemplazar por botellas de agua, de arena o una
-- mochila con libros/peso según se indica en cada instrucción.
-- Imágenes vacías: se cargan después desde el editor admin.
-- =========================================================================

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

-- ========================= PECHO (casa) ==================================
select _ins_ex('Flexiones','flexiones','pecho','peso-corporal',
  array['triceps','hombros']::text[],'empuje_horizontal','compuesto','reps','principiante',
  array['Manos al ancho de hombros, cuerpo en línea recta.','Bajá hasta casi tocar el piso con el pecho.','Empujá hasta la extensión sin bloquear codos.'],
  array['Cadera caída','Cola al techo','Codos muy abiertos'],
  'Pushups','flexiones técnica');
select _ins_ex('Flexiones diamante','flexiones-diamante','triceps','peso-corporal',
  array['pecho']::text[],'empuje_horizontal','compuesto','reps','intermedio',
  array['Manos juntas formando un diamante con pulgares e índices.','Bajá llevando los codos pegados al cuerpo.','Empujá hasta la extensión.'],
  array['Abrir codos (pierde foco en tríceps)','Rango corto'],
  'Diamond_Push-Up','flexiones diamante');
select _ins_ex('Flexiones inclinadas','flexiones-inclinadas','pecho','peso-corporal',
  array['triceps','hombros']::text[],'empuje_horizontal','compuesto','reps','principiante',
  array['Manos apoyadas en mesa o silla firme, pies al piso.','Cuerpo en línea recta.','Bajá llevando el pecho a la superficie y empujá.'],
  array['Cadera caída','Superficie inestable'],
  '','flexiones inclinadas apoyadas');
select _ins_ex('Flexiones declinadas','flexiones-declinadas','pecho','peso-corporal',
  array['hombros','triceps']::text[],'empuje_horizontal','compuesto','reps','intermedio',
  array['Pies elevados sobre silla o cama, manos al ancho de hombros en el piso.','Bajá el pecho controlado.','Empujá hasta extender.'],
  array['Pies demasiado altos (pasa a hombro)','Cadera caída'],
  '','flexiones pies elevados');
select _ins_ex('Flexiones arqueras','flexiones-arqueras','pecho','peso-corporal',
  array['triceps','hombros']::text[],'empuje_horizontal','compuesto','reps','avanzado',
  array['Manos amplias, bajás cargando el peso sobre un brazo.','La otra queda extendida acompañando.','Empujá y cambiá de lado la próxima.'],
  array['Perder la línea del cuerpo'],
  '','flexion arquero');
select _ins_ex('Flexiones hindúes','flexiones-hindues','hombros','peso-corporal',
  array['pecho','triceps']::text[],'empuje_vertical','compuesto','reps','intermedio',
  array['Cadera arriba (perro boca abajo).','Bajás en arco llevando el pecho primero, después la cadera.','Volvés al perro boca abajo.'],
  array['Movimiento abrupto','Hombros encogidos'],
  'Hindu_Pushup','flexiones hindues');
select _ins_ex('Flexiones con palmada','flexiones-palmada','pecho','peso-corporal',
  array['triceps','hombros']::text[],'empuje_horizontal','compuesto','reps','avanzado',
  array['Flexión explosiva: empujá tan fuerte que las manos se despegan.','En el aire das una palmada y volvés a apoyar.'],
  array['Caer con codos bloqueados','Rango incompleto'],
  'Clap_Pushups','flexiones con palmada');
select _ins_ex('Press piso con mancuernas','press-piso-mancuernas','pecho','mancuernas',
  array['triceps','hombros']::text[],'empuje_horizontal','compuesto','peso_reps','principiante',
  array['Acostado en el piso, codos a 45° del torso.','Bajá hasta que los codos toquen el piso.','Empujá sin bloquear.'],
  array['Rebote de los codos en el piso'],
  'Dumbbell_Floor_Press','press piso mancuernas');
select _ins_ex('Aperturas en piso con mancuernas','aperturas-piso','pecho','mancuernas',
  array['hombros']::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Acostado en el piso, brazos arriba con codos semiflexionados.','Abrí en arco hasta sentir estiramiento (antes de tocar el piso).','Cerrá con la fuerza del pecho.'],
  array['Flexionar y extender codos (pasa a press)'],
  '','aperturas piso mancuernas');
select _ins_ex('Flexiones amplias','flexiones-amplias','pecho','peso-corporal',
  array['hombros']::text[],'empuje_horizontal','compuesto','reps','principiante',
  array['Manos más amplias que los hombros.','Bajás abriendo codos en T.','Empujás activando el pecho externo.'],
  array['Rango corto por apertura exagerada'],
  '','flexiones amplias wide pushup');

-- ========================= ESPALDA (casa) ================================
select _ins_ex('Remo invertido (mesa)','remo-invertido','espalda','peso-corporal',
  array['biceps']::text[],'traccion_horizontal','compuesto','reps','principiante',
  array['Colgate de una mesa firme o barra baja con el cuerpo recto.','Traccioná llevando el pecho a la superficie.','Bajá controlado.'],
  array['Cadera caída','Rango corto'],
  'Inverted_Row','remo invertido bodyweight');
select _ins_ex('Superman','superman','espalda','peso-corporal',
  array['gluteos','isquios']::text[],'aislamiento','aislamiento','reps','principiante',
  array['Boca abajo, brazos al frente y piernas extendidas.','Levantá brazos y piernas simultáneamente.','Mantené un segundo y bajá.'],
  array['Hiperextender el cuello','Movimiento brusco'],
  'Back_Extensions','superman ejercicio');
select _ins_ex('Superman alternado','superman-alternado','espalda','peso-corporal',
  array['gluteos','core']::text[],'aislamiento','aislamiento','reps','principiante',
  array['Boca abajo. Levantás brazo derecho y pierna izquierda.','Bajás y alternás con brazo izquierdo y pierna derecha.'],
  array['Girar la cadera'],
  '','superman alternado');
select _ins_ex('Dominadas supinas','dominadas-supinas','espalda','peso-corporal',
  array['biceps']::text[],'traccion_vertical','compuesto','reps','avanzado',
  array['Agarre supino (palmas hacia vos), un poco más angosto que los hombros.','Traccioná hasta pasar el mentón.','Bajá controlado.'],
  array['Balanceo','Rango corto arriba'],
  'Chin-Up','chin ups dominadas supinas');
select _ins_ex('Remo con mancuerna en casa','remo-mancuerna-casa','espalda','mancuernas',
  array['biceps']::text[],'traccion_horizontal','compuesto','peso_reps','principiante',
  array['Apoyate con una mano en una silla, espalda plana.','Con la otra mano traccioná la mancuerna (o botella/mochila) a la cadera.','Bajá controlado.'],
  array['Rotar el torso'],
  '','remo mancuerna una mano casa');
select _ins_ex('Pullover con mancuerna en piso','pullover-piso','espalda','mancuernas',
  array['pecho','triceps']::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Acostado en el piso, sostenés una mancuerna con las dos manos sobre el pecho.','Llevá los brazos por encima de la cabeza hasta sentir estiramiento del dorsal.','Volvé con la fuerza de la espalda.'],
  array['Flexionar los codos','Arquear la lumbar'],
  'Dumbbell_Pullover','pullover mancuerna casa');
select _ins_ex('Face pull con toalla','face-pull-toalla','espalda','peso-corporal',
  array['hombros']::text[],'traccion_horizontal','aislamiento','reps','principiante',
  array['Enganchás una toalla en una puerta firme.','Agarrás los extremos y traccionás hacia la cara con los codos altos.','Apretá romboides y deltoides posterior.'],
  array['Codos bajos','Encoger trapecios'],
  '','face pull con toalla puerta');
select _ins_ex('Peso muerto con mancuernas en casa','peso-muerto-casa','isquios','mancuernas',
  array['gluteos','espalda']::text[],'bisagra','compuesto','peso_reps','principiante',
  array['Mancuernas (o mochila con peso) al frente de los muslos.','Empujá cadera atrás bajando pegado a las piernas.','Subí extendiendo cadera, apretando glúteos.'],
  array['Redondear lumbares','Flexionar demasiado las rodillas'],
  '','peso muerto mancuernas casa');

-- ========================= HOMBROS (casa) ================================
select _ins_ex('Pike push-ups','pike-pushups','hombros','peso-corporal',
  array['triceps']::text[],'empuje_vertical','compuesto','reps','intermedio',
  array['Cadera arriba formando V invertida con el cuerpo.','Bajás la cabeza hacia el piso entre las manos.','Empujás volviendo a la V.'],
  array['Cadera baja (pasa a pecho)','Codos muy abiertos'],
  'Pike_Pushup','pike push ups');
select _ins_ex('Elevaciones laterales con botellas','elevaciones-botellas','hombros','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['De pie con una botella en cada mano.','Elevás los brazos a los costados hasta la altura del hombro.','Bajás controlado sin impulso.'],
  array['Impulso de cadera','Subir por encima del hombro'],
  '','elevaciones laterales botellas casa');
select _ins_ex('Elevaciones frontales con botellas','elevaciones-frontales-botellas','hombros','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Botellas al frente de los muslos.','Elevás una al frente hasta la altura del hombro.','Bajás y alternás.'],
  array['Balanceo','Subir por encima del hombro'],
  '','elevaciones frontales botellas');
select _ins_ex('Press militar con mancuernas sentado','press-militar-sentado','hombros','mancuernas',
  array['triceps']::text[],'empuje_vertical','compuesto','peso_reps','principiante',
  array['Sentado con espalda recta (silla con respaldo o piso).','Mancuernas a la altura de hombros, codos apenas adelante.','Empujá arriba sin bloquear.'],
  array['Hiperextender la lumbar','Despegar la espalda del respaldo'],
  '','press militar sentado mancuernas');
select _ins_ex('Press Arnold','press-arnold','hombros','mancuernas',
  array['triceps']::text[],'empuje_vertical','compuesto','peso_reps','intermedio',
  array['Sentado, mancuernas al frente de la cara con las palmas hacia vos.','Mientras empujás, rotás las palmas hasta quedar al frente.','Bajás rotando a la posición inicial.'],
  array['Rotación brusca','Mucho peso'],
  'Arnold_Dumbbell_Press','press arnold');
select _ins_ex('Vuelos posteriores acostado','vuelos-posteriores-piso','hombros','mancuernas',
  array['espalda']::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Boca abajo en el piso, brazos colgando con mancuernas.','Abrís en arco hasta la altura de los hombros con codos semiflexionados.','Volvés controlado.'],
  array['Encoger trapecios','Flexionar codos'],
  '','vuelos posteriores piso');
select _ins_ex('Shrugs con mancuernas','shrugs','hombros','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['De pie, mancuernas a los costados.','Encogé los hombros subiéndolos a las orejas.','Bajá controlado.'],
  array['Rotar los hombros'],
  'Dumbbell_Shrug','shrugs mancuernas');
select _ins_ex('Pike push-ups elevadas','pike-pushups-elevadas','hombros','peso-corporal',
  array['triceps']::text[],'empuje_vertical','compuesto','reps','avanzado',
  array['Pies elevados en silla o cama, cadera arriba en V invertida.','Bajás la cabeza hacia el piso.','Empujás volviendo.'],
  array['Perder la V','Codos abiertos'],
  '','pike push ups pies elevados');

-- ========================= BÍCEPS (casa) =================================
select _ins_ex('Curl martillo con botellas','curl-martillo-botellas','biceps','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Botellas en agarre neutro todo el movimiento.','Codos pegados al torso, flexioná alternando o simultáneo.','Bajá controlado.'],
  array['Balanceo del torso'],
  '','curl martillo botellas');
select _ins_ex('Curl concentrado','curl-concentrado','biceps','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Sentado, apoyás el codo en la cara interna del muslo.','Flexioná el brazo llevando la mancuerna al hombro.','Bajá hasta casi extender.'],
  array['Despegar el codo del muslo'],
  'Concentration_Curls','curl concentrado');
select _ins_ex('Curl 21s con botellas','curl-21s','biceps','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','intermedio',
  array['7 reps parciales de abajo a la mitad.','7 reps parciales de la mitad a arriba.','7 reps de rango completo.'],
  array['Rango inconsistente'],
  '','curl 21s biceps');
select _ins_ex('Curl zottman','curl-zottman','biceps','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','intermedio',
  array['Subís como un curl supino normal.','Rotás las manos a pronación y bajás controlado.','Rotás de nuevo a supino abajo.'],
  array['Rotación tardía o rápida'],
  'Zottman_Curl','curl zottman');
select _ins_ex('Isometría de curl con toalla','isometria-curl-toalla','biceps','peso-corporal',
  array[]::text[],'aislamiento','aislamiento','tiempo','principiante',
  array['Enganchás una toalla en una puerta firme (lazo).','Sostenés como un curl a 90° y mantenés la posición.','Buscá sentir tensión en el bíceps todo el tiempo.'],
  array['Encoger hombros'],
  '','isometria biceps toalla');

-- ========================= TRÍCEPS (casa) ================================
select _ins_ex('Fondos en silla','fondos-silla','triceps','peso-corporal',
  array['hombros']::text[],'empuje_vertical','compuesto','reps','principiante',
  array['Manos en el borde de una silla firme a la espalda, piernas extendidas o flexionadas.','Bajás flexionando los codos hacia atrás.','Empujás hasta la extensión.'],
  array['Codos muy abiertos','Hombros encogidos'],
  'Bench_Dips','fondos en silla');
select _ins_ex('Flexiones cerradas','flexiones-cerradas','triceps','peso-corporal',
  array['pecho']::text[],'empuje_horizontal','compuesto','reps','intermedio',
  array['Manos al ancho de hombros con los dedos hacia adelante.','Bajás con codos pegados al cuerpo.','Empujás apretando tríceps arriba.'],
  array['Abrir los codos'],
  'Close-Grip_Push-Up','flexiones cerradas triceps');
select _ins_ex('Patada de tríceps con botella','patada-triceps-casa','triceps','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Inclinado adelante, codo pegado al costado del torso.','Extendés el brazo hacia atrás apretando tríceps.','Volvés sin mover el codo.'],
  array['Mover el hombro','Perder la inclinación'],
  'Tricep_Dumbbell_Kickback','patada triceps mancuerna');
select _ins_ex('Press francés con botella acostado','press-frances-piso','triceps','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','intermedio',
  array['Acostado en el piso, brazos verticales con una botella por mano.','Flexionás codos llevando las botellas a los lados de la frente.','Extendés sin mover los codos.'],
  array['Mover los codos'],
  '','press frances mancuernas piso');
select _ins_ex('Extensión tríceps sobre cabeza con botella','extension-sobre-cabeza-casa','triceps','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Sentado o parado, agarrás una mancuerna con las dos manos arriba de la cabeza.','Bajás flexionando codos atrás de la nuca.','Extendés arriba sin mover codos.'],
  array['Abrir los codos','Arquear la lumbar'],
  '','extension triceps sobre cabeza mancuerna');
select _ins_ex('Flexiones piramidales','flexiones-piramidales','triceps','peso-corporal',
  array['pecho','hombros']::text[],'empuje_horizontal','compuesto','reps','intermedio',
  array['Manos amplias, cadera arriba formando triángulo.','Bajás la cabeza hacia las manos (foco tríceps).','Empujás volviendo al triángulo.'],
  array['Rango corto'],
  'Pyramid','flexiones piramidales');

-- ========================= CUÁDRICEPS (casa) =============================
select _ins_ex('Sentadilla sin peso','sentadilla-sin-peso','cuadriceps','peso-corporal',
  array['gluteos','isquios']::text[],'sentadilla','compuesto','reps','principiante',
  array['Pies al ancho de hombros, puntas apenas afuera.','Bajás llevando la cadera atrás como si te sentaras.','Subís empujando el piso.'],
  array['Rodillas en valgo','Talones despegados'],
  'Bodyweight_Squat','air squat sentadilla peso corporal');
select _ins_ex('Sentadilla con salto','sentadilla-salto','cuadriceps','peso-corporal',
  array['gluteos']::text[],'sentadilla','compuesto','reps','intermedio',
  array['Sentadilla normal.','Al subir, saltás en forma explosiva.','Caés suave recuperando la sentadilla.'],
  array['Caer rígido con rodillas trabadas'],
  'Squat_Jump','sentadilla salto jump squat');
select _ins_ex('Sentadilla isométrica (wall sit)','wall-sit','cuadriceps','peso-corporal',
  array['gluteos']::text[],'sentadilla','aislamiento','tiempo','principiante',
  array['Apoyado contra una pared, bajás hasta que las rodillas queden a 90°.','Mantenés la posición con pies firmes.'],
  array['Rodillas por delante de las puntas de los pies'],
  'Wall_Sit','wall sit sentadilla pared');
select _ins_ex('Sentadilla búlgara sin peso','bulgara-sin-peso','cuadriceps','peso-corporal',
  array['gluteos']::text[],'zancada','compuesto','reps','principiante',
  array['Un pie apoyado atrás en silla, delantero a un paso.','Bajás flexionando la rodilla delantera.','Subís empujando con el talón delantero.'],
  array['Paso corto','Rodilla en valgo'],
  '','bulgara sin peso');
select _ins_ex('Zancadas estáticas','zancadas-estaticas','cuadriceps','peso-corporal',
  array['gluteos','isquios']::text[],'zancada','compuesto','reps','principiante',
  array['Un pie adelante, otro atrás (paso largo).','Bajás hasta que la rodilla trasera quede cerca del piso.','Subís con el talón delantero. Cambiás lado la próxima.'],
  array['Rodilla cayendo en valgo','Torso muy adelantado'],
  '','zancadas estaticas sin peso');
select _ins_ex('Zancadas caminando','zancadas-caminando','cuadriceps','peso-corporal',
  array['gluteos','isquios']::text[],'zancada','compuesto','reps','intermedio',
  array['Paso largo adelante, bajás hasta rodilla trasera cerca del piso.','Al subir, llevás la otra pierna adelante dando un paso.','Alternás caminando.'],
  array['Perder el equilibrio','Paso corto'],
  'Walking_Lunge','zancadas caminando');
select _ins_ex('Step-ups en silla','step-ups','cuadriceps','peso-corporal',
  array['gluteos']::text[],'zancada','compuesto','reps','principiante',
  array['Silla o escalón firme.','Subís con un pie empujando con todo el pie.','Bajás controlado y alternás.'],
  array['Impulsar con la pierna de abajo','Superficie inestable'],
  '','step ups en silla');
select _ins_ex('Pistol squat asistida','pistol-squat-asistida','cuadriceps','peso-corporal',
  array['gluteos','core']::text[],'sentadilla','compuesto','reps','avanzado',
  array['Una pierna extendida al frente, la otra haciendo sentadilla.','Te sostenés de una pared o silla para equilibrio.','Bajás controlado y subís con la pierna de apoyo.'],
  array['Perder equilibrio','Talón despegado'],
  '','pistol squat asistida');

-- ========================= ISQUIOS Y GLÚTEOS (casa) =====================
select _ins_ex('Nordic hamstring curl','nordic-curl','isquios','peso-corporal',
  array['gluteos']::text[],'bisagra','aislamiento','reps','avanzado',
  array['Arrodillado con los tobillos fijos (alguien los sostiene o un mueble).','Bajás el torso controladísimo hacia adelante manteniendo caderas extendidas.','Volvés con la fuerza de los isquios o empujando con las manos.'],
  array['Flexionar la cadera','Caída sin control'],
  'Natural_Glute_Ham_Raise','nordic hamstring curl');
select _ins_ex('Good morning sin peso','good-morning-sin-peso','isquios','peso-corporal',
  array['gluteos','espalda']::text[],'bisagra','aislamiento','reps','principiante',
  array['Pies al ancho de caderas, manos en la nuca.','Empujás cadera atrás bajando el torso con espalda recta.','Subís extendiendo cadera.'],
  array['Redondear la espalda'],
  'Good_Morning','good morning sin peso');
select _ins_ex('Peso muerto a una pierna','peso-muerto-una-pierna','isquios','peso-corporal',
  array['gluteos','core']::text[],'bisagra','aislamiento','reps','intermedio',
  array['Parado en un pie, otra pierna extendida atrás.','Bajás el torso al piso mientras la pierna de atrás sube como contrapeso.','Volvés manteniendo el equilibrio.'],
  array['Rotar la cadera','Perder balance'],
  '','peso muerto una pierna sin peso');
select _ins_ex('Hip bridge','hip-bridge','gluteos','peso-corporal',
  array['isquios']::text[],'bisagra','compuesto','reps','principiante',
  array['Acostado boca arriba, rodillas flexionadas, pies apoyados cerca del glúteo.','Empujás con los talones subiendo la cadera.','Apretás glúteos arriba y bajás.'],
  array['Hiperextender la lumbar','Pies muy lejos'],
  'Hip_Lift_With_Band','hip bridge puente glúteos');
select _ins_ex('Single-leg hip bridge','hip-bridge-una-pierna','gluteos','peso-corporal',
  array['isquios']::text[],'bisagra','aislamiento','reps','intermedio',
  array['Puente de glúteo con una pierna extendida al frente.','Empujás con el talón de la pierna apoyada.','Apretás arriba y bajás.'],
  array['Rotar cadera','Cadera que cae del lado libre'],
  'Single_Leg_Glute_Bridge','single leg hip bridge');
select _ins_ex('Hip thrust en el piso con mancuerna','hip-thrust-piso','gluteos','mancuernas',
  array['isquios']::text[],'bisagra','compuesto','peso_reps','principiante',
  array['Acostado en el piso con mancuerna o mochila sobre la cadera.','Subís la cadera empujando con los talones.','Apretás glúteos arriba y bajás.'],
  array['Hiperextender la lumbar'],
  '','hip thrust piso casa');
select _ins_ex('Donkey kicks','donkey-kicks','gluteos','peso-corporal',
  array['isquios']::text[],'aislamiento','aislamiento','reps','principiante',
  array['En cuatro apoyos, rodilla a 90°.','Levantás la pierna hacia arriba manteniendo el ángulo.','Bajás sin apoyar.'],
  array['Arquear lumbar','Movimiento con impulso'],
  'Kneeling_Jump_Squat','donkey kicks glúteos');
select _ins_ex('Fire hydrant','fire-hydrant','gluteos','peso-corporal',
  array[]::text[],'aislamiento','aislamiento','reps','principiante',
  array['En cuatro apoyos, rodilla a 90°.','Abrís la pierna al costado como un perro orinando.','Volvés sin apoyar.'],
  array['Rotar la cadera','Caer al costado'],
  '','fire hydrant glúteos');
select _ins_ex('Frog pumps','frog-pumps','gluteos','peso-corporal',
  array[]::text[],'bisagra','aislamiento','reps','principiante',
  array['Acostado boca arriba, pies juntos cerca del glúteo y rodillas abiertas (mariposa).','Empujás la cadera arriba apretando glúteos.','Bajás sin apoyar del todo.'],
  array['Rango corto'],
  '','frog pump glúteos');

-- ========================= GEMELOS (casa) ================================
select _ins_ex('Gemelos en escalón','gemelos-escalon','gemelos','peso-corporal',
  array[]::text[],'aislamiento','aislamiento','reps','principiante',
  array['Puntas en el borde de un escalón.','Bajás a estiramiento total.','Subís a punta de pie apretando el gemelo.'],
  array['Rango corto'],
  '','gemelos escalón casa');
select _ins_ex('Gemelos una pierna','gemelos-una-pierna','gemelos','peso-corporal',
  array[]::text[],'aislamiento','aislamiento','reps','intermedio',
  array['Parado en un pie en el borde de un escalón.','Bajás controlado y subís a punta de pie.'],
  array['Perder equilibrio'],
  '','gemelos una pierna');
select _ins_ex('Gemelos con mancuerna','gemelos-mancuerna','gemelos','mancuernas',
  array[]::text[],'aislamiento','aislamiento','peso_reps','principiante',
  array['Parado con una mancuerna en una mano, otra agarrada a algo para equilibrio.','Elevás talones a punta de pie.','Bajás controlado.'],
  array['Rango corto'],
  '','gemelos una pierna con mancuerna');

-- ========================= CORE (casa) ===================================
select _ins_ex('Mountain climbers','mountain-climbers','core','peso-corporal',
  array['hombros']::text[],'core_antirotacion','aislamiento','reps','principiante',
  array['En plancha alta, llevás una rodilla al pecho y alternás rápido.','Mantenés cadera a altura constante.'],
  array['Cadera alta','Pasos cortos'],
  'Mountain_Climbers','mountain climbers');
select _ins_ex('Bird dog','bird-dog','core','peso-corporal',
  array['gluteos','espalda']::text[],'core_antirotacion','aislamiento','reps','principiante',
  array['En cuatro apoyos. Estirás brazo derecho y pierna izquierda.','Mantenés un segundo. Volvés y alternás.'],
  array['Rotar cadera','Perder la línea'],
  'Alternating_Floor_Press','bird dog core');
select _ins_ex('Russian twist','russian-twist','core','mancuernas',
  array[]::text[],'core_antirotacion','aislamiento','peso_reps','principiante',
  array['Sentado con torso inclinado atrás, piernas elevadas o apoyadas.','Girás el torso de lado a lado tocando el piso.','Podés sumar una mancuerna o botella.'],
  array['Mover sólo los brazos'],
  'Russian_Twist','russian twist');
select _ins_ex('Flutter kicks','flutter-kicks','core','peso-corporal',
  array[]::text[],'core_flexion','aislamiento','tiempo','principiante',
  array['Acostado boca arriba, piernas extendidas levantadas unos centímetros.','Alternás patadas verticales rápidas sin tocar el piso.'],
  array['Despegar la lumbar','Mover el cuerpo entero'],
  '','flutter kicks');
select _ins_ex('V-ups','v-ups','core','peso-corporal',
  array[]::text[],'core_flexion','aislamiento','reps','intermedio',
  array['Acostado boca arriba, brazos y piernas extendidos.','Subís tronco y piernas juntos formando una V.','Bajás controlado.'],
  array['Impulso de piernas','Flexionar rodillas'],
  'V-Up','v ups abdominales');
select _ins_ex('Toe touches','toe-touches','core','peso-corporal',
  array[]::text[],'core_flexion','aislamiento','reps','principiante',
  array['Acostado boca arriba, piernas extendidas al techo.','Subís el tronco intentando tocar los pies con las manos.','Bajás controlado.'],
  array['Tirar del cuello','Rango corto'],
  '','toe touches abs');
select _ins_ex('Side plank reach-through','plancha-lateral-reach','core','peso-corporal',
  array['hombros']::text[],'core_lateral','aislamiento','reps','intermedio',
  array['Plancha lateral, brazo libre al techo.','Pasás el brazo libre por debajo del torso (rotación).','Volvés al techo.'],
  array['Cadera caída'],
  '','side plank reach through');
select _ins_ex('Bicycle crunches','bicycle-crunches','core','peso-corporal',
  array[]::text[],'core_flexion','aislamiento','reps','principiante',
  array['Acostado, manos en la nuca.','Llevás codo derecho a rodilla izquierda alternando como pedaleando.'],
  array['Tirar del cuello'],
  'Air_Bike','bicycle crunches');
select _ins_ex('Leg raises acostado','leg-raises-piso','core','peso-corporal',
  array[]::text[],'core_flexion','aislamiento','reps','principiante',
  array['Acostado boca arriba, manos a los costados o bajo la cola.','Elevás piernas extendidas hasta 90°.','Bajás controlado sin apoyar.'],
  array['Despegar la lumbar','Balancear'],
  'Leg_Raises','leg raises acostado');
select _ins_ex('Hollow rocks','hollow-rocks','core','peso-corporal',
  array[]::text[],'core_antiextension','aislamiento','tiempo','avanzado',
  array['Posición hollow (banana invertida): lumbar pegada, piernas y escápulas elevadas.','Mecés el cuerpo suavemente como banana.'],
  array['Perder la posición hollow'],
  '','hollow rocks');

drop function _ins_ex(
  text, text, text, text, text[],
  patron, tipo_ejercicio, tipo_registro, nivel,
  text[], text[], text, text
);
