# GYMIA – Especificación del proyecto

> Documento de referencia. Todas las fases de desarrollo se basan en este archivo.

## 1. Visión
App web mobile-first para usar en el gimnasio desde el celular. Permite:
1. Generar una rutina de musculación de 1 a 4 semanas según los días que entreno.
2. Ver cada ejercicio de forma simple, con una imagen animada de la técnica correcta.
3. Registrar en vivo peso, reps o tiempo de cada serie y ver lo que hice la última vez.
4. Ajustar la rutina según lo que realmente pude hacer.
5. Ver mi progreso en un dashboard.

Hoy la usa una sola persona, pero la arquitectura queda preparada para profesores con alumnos (fase 2).

**Principio rector: simplicidad.** Para ver y entender un ejercicio alcanza con 1 toque. Botones grandes y poco texto, para usarla con una mano.

Idioma: español (Argentina). Unidades: kg y segundos.

## 2. Stack
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS + shadcn/ui; tipografía Inter o Geist
- Supabase: Auth (email y Google), Postgres, Row Level Security, Storage
- `@supabase/ssr` para la sesión en server components y middleware
- Recharts para los gráficos
- Vitest para los tests de la lógica pura
- Deploy en Vercel; PWA instalable
- Migraciones en `/supabase/migrations`, seed en `/supabase/seed.sql`
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (esta última solo en el server)

## 3. Estructura de carpetas
```
/app
  /(auth)/login
  /(app)/hoy                 → pantalla principal: entrenamiento del día
  /(app)/sesion/[id]         → sesión en vivo
  /(app)/rutina              → plan (semanas → días → ejercicios)
  /(app)/generar             → asistente para generar la rutina
  /(app)/ejercicios          → catálogo
  /(app)/ejercicios/[slug]   → detalle del ejercicio
  /(app)/cuenta              → dashboard de progreso
  /(trainer)/...             → reservado para la fase 2 (no se implementa todavía)
/modules
  /exercises   componentes (ExerciseCard, ExerciseMedia, TechniqueSheet), queries
  /routines    generator/ (lógica pura + tests), componentes del plan
  /workouts    sesión en vivo, SetRow, RestTimer, HoldTimer, BusyMachineSheet, progression/ (lógica pura + tests)
  /progress    stats y gráficos
  /trainers    vacío, solo interfaces/tipos
/lib/supabase  clientes de server y de browser, tipos generados (database.types.ts)
/components/ui shadcn
```
Regla: la lógica de negocio (generador, progresión, sustitución) va en funciones puras con tests, separada de la UI.

## 4. Modelo de datos

### Catálogo
- **muscle_groups**: id, nombre, slug. Valores: Pecho, Espalda, Hombros, Bíceps, Tríceps, Cuádriceps, Isquiotibiales, Glúteos, Gemelos, Core
- **equipment**: id, nombre, slug. Valores: Barra, Mancuernas, Máquina, Polea, Banco, Smith, Peso corporal, Barra Z
- **exercises**:
  - id, nombre, slug
  - muscle_group_id (principal), secondary_muscles text[]
  - equipment_id
  - patron (`empuje_horizontal`, `empuje_vertical`, `traccion_horizontal`, `traccion_vertical`, `sentadilla`, `bisagra`, `zancada`, `aislamiento`, `core_antiextension`, `core_flexion`, `core_antirotacion`, `core_lateral`)
  - tipo (`compuesto` | `aislamiento`)
  - tipo_registro (`peso_reps` | `reps` | `tiempo`)
  - nivel_minimo (`principiante` | `intermedio` | `avanzado`)
  - instrucciones text[] (de 3 a 5 pasos cortos), errores_comunes text[]
  - media_url (gif/webp, opcional), media_frames text[] (2 imágenes: inicio y fin)
  - youtube_query text, youtube_video_id text (opcional)
  - created_by uuid null (null = catálogo global)

### Usuario y rutinas
- **profiles**: id (= auth.users.id), nombre, role (`user` | `trainer` | `admin`, por defecto `user`), nivel, objetivo (`hipertrofia` | `fuerza` | `general`), created_at
- **routines**: id, owner_id, assigned_by (null; en el futuro un trainer_id), nombre, dias_por_semana (2–5), semanas (1–4), split, nivel, objetivo, activa bool, created_at. Solo una rutina activa por usuario.
- **routine_days**: id, routine_id, semana (1..N), orden (1..dias), nombre (ej. "Semana 1 · Día A – Torso")
- **routine_exercises**: id, routine_day_id, exercise_id, orden, series, reps_min, reps_max, duracion_seg (para los de tiempo), peso_objetivo_kg (null hasta la primera vez), descanso_seg, notas
- **user_exercise_videos**: user_id, exercise_id, youtube_video_id (el "mi video de referencia")

### Registro
- **workout_sessions**: id, user_id, routine_day_id, started_at, finished_at, notas
- **set_logs**:
  - id, session_id, routine_exercise_id
  - exercise_id (el que se hizo realmente; puede ser un sustituto)
  - es_sustituto bool
  - numero_serie
  - planificado: objetivo_reps, objetivo_peso_kg, objetivo_seg
  - realizado: peso_kg, reps, duracion_seg
  - completada bool, created_at

### Fase 2 (crear las tablas ya, sin UI)
- **trainer_clients**: trainer_id, client_id, estado (`pendiente` | `activo`), created_at

### RLS
- Cada usuario lee y escribe solo sus profiles, routines (y sus días y ejercicios), sesiones, set_logs y videos.
- Los exercises con `created_by is null` los puede leer cualquier usuario autenticado. Los que tienen created_by, solo su creador.
- Crear la función `is_trainer_of(client uuid)` y dejar las políticas de trainer escritas pero comentadas, para la fase 2.
- muscle_groups y equipment: solo lectura para usuarios autenticados.

## 5. Catálogo de ejercicios (seed)
Entre 70 y 80 ejercicios de **gimnasio tradicional** (nada raro), con **mucha presencia de poleas** y un bloque fuerte de **core**.

Ejemplos por grupo:
- **Pecho**: press banca plano/inclinado (barra y mancuernas), press en máquina, aperturas con mancuernas, cruce de poleas alto/bajo, pec deck, fondos
- **Espalda**: jalón al pecho (agarre ancho/neutro), dominadas asistidas, remo con barra, remo con mancuerna, remo en polea baja, remo en máquina, pullover en polea, face pull
- **Hombros**: press militar (barra/mancuernas/máquina), elevaciones laterales (mancuerna y polea), vuelos posteriores (mancuerna y pec deck invertido), elevación frontal en polea
- **Bíceps**: curl con barra, curl con barra Z, curl alternado, curl martillo, curl en banco Scott, curl en polea
- **Tríceps**: extensión en polea (soga y barra), press francés, extensión sobre la cabeza en polea, fondos en banco, patada en polea
- **Piernas**: sentadilla con barra, sentadilla goblet, sentadilla en Smith, prensa 45°, hack, extensión de cuádriceps, curl femoral acostado/sentado, peso muerto rumano, hip thrust, pull-through en polea, patada de glúteo en polea, abductores en máquina, zancadas, búlgaras, gemelos parado/sentado/en prensa
- **Core**: plancha frontal, plancha lateral, rueda abdominal, crunch en polea, elevación de piernas colgado/en paralelas, Pallof press, leñador en polea, dead bug, hollow hold

**Imágenes**: dataset open source **free-exercise-db** (github.com/yuhonas/free-exercise-db, dominio público), que trae 2 fotos por ejercicio (inicio y fin).
- En la v1 se pueden referenciar las URLs raw de GitHub del dataset. Más adelante se copian a Supabase Storage con un script.
- Mapear cada ejercicio del catálogo con su equivalente del dataset. Si no hay equivalente, dejar `media_frames` vacío.
- Verificar que cada URL responda antes de cargarla en el seed.

## 6. Generador de rutina (basado en reglas, sin IA en la v1)

### Asistente (4 pasos, 1 toque cada uno)
1. Días por semana: 2 / 3 / 4 / 5
2. Semanas del plan: 1 / 2 / 3 / 4
3. Nivel: principiante / intermedio / avanzado
4. Objetivo: hipertrofia (por defecto) / fuerza / general

### Splits
- 2 días → Full body A / B
- 3 días → Full body A / B / C (principiante) · Empuje / Tirón / Piernas (intermedio en adelante)
- 4 días → Torso / Pierna / Torso / Pierna
- 5 días → Empuje / Tirón / Piernas / Torso / Pierna

### Reglas
- Entre 5 y 7 ejercicios por día. Primero los compuestos, después los de aislamiento, y el core al final.
- **Zona media todos los días**: cerrar con 1 o 2 ejercicios de core, rotando los patrones (anti-extensión, flexión, anti-rotación, lateral) para no repetir el mismo patrón en días seguidos.
- **Poleas**: al menos 1 ejercicio de polea por día (sin contar el core).
- Cubrir todos los grupos grandes en la semana: de 10 a 20 series semanales por grupo según el nivel.
- **Variedad entre semanas**:
  - Los compuestos principales (sentadilla, press, remo, bisagra) se mantienen o rotan como mucho cada 2 semanas, para poder medir la progresión.
  - Los accesorios y el core rotan cada semana, buscando otro ejercicio del mismo `patron` y grupo muscular.
- No repetir el mismo ejercicio en días seguidos.
- Principiantes: priorizar máquinas, poleas y mancuernas por sobre la barra libre. Filtrar por nivel_minimo.
- Series y reps:
  - Hipertrofia: 3–4 × 8–12, descanso de 90 s
  - Fuerza: 4–5 × 4–6, descanso de 180 s (accesorios de 3 × 8–10)
  - General: 3 × 10–15, descanso de 60 s
  - Core por tiempo: 3 × 30 s (principiante), 40 s (intermedio), 60 s (avanzado)
- El generador es determinístico si recibe una semilla (seed), para poder testearlo.

### Edición
- En cada ejercicio: "Cambiar ejercicio" (por otro del mismo patrón y grupo), reordenar y eliminar. También se puede agregar desde el catálogo.
- Se puede regenerar la rutina completa (pide confirmación).

### Interfaz
`RoutineGenerator { generate(config, catalog, seed?): RoutinePlan }`. La implementación v1 es `RuleBasedGenerator`. Queda preparada para sumar después un generador con IA o rutinas armadas por un profesor.

## 7. Sesión en vivo

### Navegación
- Un ejercicio por pantalla, con swipe o botones Anterior / Siguiente, y un indicador de progreso (3/7).
- Arriba, la animación de la técnica en grande. Al tocarla se abre un bottom sheet con los pasos, los errores comunes y el botón de YouTube.

### Registro según tipo_registro
- **peso_reps**: una fila por serie con `[peso kg] [reps] [✓]`.
- **reps**: una fila por serie con `[reps] [✓]`.
- **tiempo**: temporizador de mantenimiento (ver más abajo).
- Los campos vienen precargados con el valor de la última vez o con el objetivo. Botones ±2,5 kg y ±1 rep para no tener que tipear.
- Arriba de las series se muestra "Última vez: 40 kg × 10, 10, 9".
- Cada serie se guarda al instante (optimistic UI). Si se cierra la app, no se pierde nada y la sesión se puede retomar.
- Una serie que no llegó al objetivo se marca en ámbar.

### Temporizador de descanso
- Arranca solo al marcar ✓. Permite +15 s / −15 s y saltear. Vibra y suena al terminar.

### Temporizador para ejercicios por tiempo (HoldTimer)
- Pantalla completa con números enormes y un anillo de progreso celeste.
- "Empezar" lanza una cuenta regresiva de 3 s.
- Beep y vibración cuando faltan 5 s y al terminar.
- Wake Lock API activo para que la pantalla no se apague.
- "Terminé" guarda el tiempo real si se corta antes.
- Al completar, arranca el descanso.

### Máquina ocupada (BusyMachineSheet)
- Botón "Máquina ocupada" en cada ejercicio, en la sesión y en la vista del día.
- Muestra **2 alternativas** en tarjetas (animación, nombre, equipo). Deben tener el mismo grupo muscular, el mismo `patron`, el mismo `tipo` y **equipo distinto** al original.
- "Otras opciones" muestra 2 más.
- Al elegir, el sustituto se usa **solo en esta sesión** (`set_logs.es_sustituto = true`). La opción "Usar siempre este" reemplaza el exercise_id en routine_exercises.
- Si el sustituto ya se hizo antes, muestra su "última vez".

### Ajuste de progresión (lógica pura en /modules/workouts/progression)
Al terminar cada ejercicio:
- **No llegué al objetivo** → sheet con 3 opciones de un toque:
  - Bajar el peso (propone el escalón anterior: −2,5 kg en mancuernas y poleas, −5 kg en barra y máquinas), manteniendo las reps.
  - Bajar las reps objetivo (propone, por ejemplo, 12), manteniendo el peso.
  - Dejar igual.
- Si no elige nada, se aplica la regla automática: si faltó menos del 25 % del total de reps, se mantiene el objetivo; si faltó el 25 % o más, se baja un escalón de peso.
- **Superé el objetivo** (todas las series en el tope o por encima de reps_max) → sugerir subir un escalón de peso la próxima vez.
- **Ejercicios por tiempo**: si se completaron todas las series, sugerir +5 s; si no, mantener.
- El ajuste actualiza `routine_exercises.peso_objetivo_kg` / `reps_*` / `duracion_seg`.
- En set_logs se guarda siempre lo planificado y lo realizado.

### Fin de la sesión
Resumen con duración, volumen total (kg × reps), series completadas vs planificadas y récords nuevos ✨.

### Historial
Desde el detalle del ejercicio o desde Mi cuenta se pueden editar series de sesiones anteriores.

## 8. Otras pantallas

### Hoy (pantalla de inicio)
- Detecta qué día de la rutina toca (siguiente día no hecho, de la semana actual del plan).
- Tarjetas por ejercicio: animación, nombre, "4 × 8–12" o "3 × 30 s", "Última vez: …" y el botón "Máquina ocupada".
- Botón grande "Empezar entrenamiento". Si hay una sesión abierta, el botón es "Continuar".
- Cuando el plan termina: "¡Completaste el plan! → Generar el siguiente".

### Rutina
- Tabs por semana. Dentro, tarjetas por día y, en cada una, los ejercicios con miniatura.
- Cada día marcado como hecho / pendiente.

### Detalle del ejercicio
- Animación grande, chips de músculos (principal y secundarios), equipo, pasos y errores comunes.
- **YouTube**:
  - Si hay un `youtube_video_id` (el del usuario tiene prioridad sobre el global), se muestra embebido.
  - Siempre está el botón "Buscar en YouTube", que abre `https://www.youtube.com/results?search_query=<youtube_query>`. En mobile abre la app de YouTube.
  - "Guardar como mi video de referencia": pegás un link y se extrae el ID.
- Historial: gráfico del peso máximo por sesión (o segundos, o reps) y tabla con las últimas 5 sesiones.

### Mi cuenta (dashboard)
- KPIs: entrenamientos del mes, cumplimiento semanal (hechos/planificados), racha de semanas cumplidas, volumen total.
- Heatmap tipo calendario con los días entrenados.
- Volumen semanal de las últimas 12 semanas.
- Series por grupo muscular (barras).
- Récords por ejercicio: peso máximo y 1RM estimado (Epley: peso × (1 + reps/30)).
- Selector de ejercicio para ver su evolución.
- Datos del perfil: nombre, nivel y objetivo.

## 9. Diseño visual

### Paleta (modo oscuro por defecto)
| Token | Hex | Uso |
|---|---|---|
| background | `#0A0A0B` | fondo |
| card | `#16181C` | tarjetas |
| elevated | `#1F2228` | modales y sheets |
| border | `#2A2E35` | bordes |
| text | `#F2F4F7` | texto principal |
| muted | `#9BA3AF` | texto secundario |
| disabled | `#5B626D` | deshabilitado |
| primary | `#38BDF8` | acento celeste: botones, ✓, timers, tab activo |
| primary-strong | `#0EA5E9` | hover / pressed |
| primary-soft | `#38BDF8` al 15 % | chips, serie activa, barras |
| primary-light | `#7DD3FC` | récords, detalles |
| warning | `#F59E0B` | serie que no llegó al objetivo |
| danger | `#EF4444` | eliminar / error |

Modo claro opcional: fondo `#F5F7FA` y primary `#0284C7`.

### Reglas
- El celeste se usa poco y con intención: la acción principal y lo que estás haciendo en ese momento. Todo lo demás en grises.
- Mobile-first (390 px). Áreas táctiles de 48 px como mínimo. Navegación inferior con 4 tabs: **Hoy · Rutina · Ejercicios · Cuenta**.
- Números de peso, reps y tiempo grandes y en negrita (tabular-nums).
- Estados vacíos claros, con una acción ("Todavía no tenés rutina → Generar mi rutina").
- Accesibilidad: labels, foco visible, animaciones pausables, respetar prefers-reduced-motion.
- En los gráficos: celeste para el progreso real y gris para el objetivo o el período anterior.

## 10. Fase 2: profesores (solo preparar, no implementar)
- role `trainer`, tabla trainer_clients, `routines.assigned_by`, `exercises.created_by`.
- Rutas `/(trainer)` protegidas por middleware según el rol.
- Funcionalidades futuras: invitar alumnos con un link, armar y asignar rutinas, ver el progreso y el planificado vs realizado de cada alumno, asignar videos propios a los ejercicios, dejar comentarios.
