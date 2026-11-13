# Deploy de GYMIA

Guía paso a paso para poner GYMIA en producción en Vercel + Supabase.

## 1. Preparar Supabase (si no está hecho)

1. Crear proyecto en https://supabase.com.
2. SQL Editor → correr en orden las migraciones y el seed:
   - `supabase/migrations/20261113120000_schema.sql`
   - `supabase/migrations/20261113120100_triggers.sql`
   - `supabase/migrations/20261113120200_rls.sql`
   - `supabase/migrations/20261113120300_stats.sql`
   - `supabase/seed.sql`
3. **Project Settings → API**: copiar Project URL, anon key y service_role key.
4. **Authentication → Providers**:
   - **Email**: habilitado (si querés confirmar emails, mantener "Confirm email").
   - **Google**:
     1. En Google Cloud Console, crear OAuth 2.0 "Web application".
     2. Authorized redirect URIs: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
     3. Pegar Client ID y Client secret en Supabase → Google → habilitar → guardar.

## 2. Pushear el repo a GitHub

```bash
# Si no está, crear el remote y pushear
git remote add origin https://github.com/criptonizate/gymia.git
git push -u origin main
```

## 3. Conectar a Vercel

1. https://vercel.com → **Add New → Project** → Import de GitHub → elegir `criptonizate/gymia`.
2. Framework: Next.js (se detecta solo). Root dir: `/`.
3. **Environment Variables** (ambiente Production y Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = el Project URL de Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la anon key.
   - `SUPABASE_SERVICE_ROLE_KEY` = la service role (solo Production; marcar como *Sensitive*).
4. **Deploy**.

## 4. Configurar las URLs en Supabase Auth

Una vez que Vercel te asigne un dominio (ej. `gymia.vercel.app`), volver a Supabase:

**Authentication → URL Configuration**:
- Site URL: `https://gymia.vercel.app` (o tu dominio custom)
- Redirect URLs (agregar las tres, Vercel usa cada subdominio):
  - `http://localhost:3000/auth/callback`
  - `https://gymia.vercel.app/auth/callback`
  - `https://*.vercel.app/auth/callback`  (para previews)

Y en **Google Cloud Console**, agregar también al OAuth client:
- Authorized JavaScript origins: `https://gymia.vercel.app`
- Authorized redirect URIs: `https://<PROJECT-REF>.supabase.co/auth/v1/callback` (ya estaba).

## 5. Dominio custom (opcional)

1. En Vercel → Project → Settings → Domains → agregar `gymia.com.ar` (o el que uses).
2. Vercel te indica los registros DNS que hay que crear (A o CNAME).
3. Actualizar Site URL y Redirect URLs en Supabase con el dominio nuevo.

## 6. Verificación post-deploy

- Abrir el dominio en celular → debería redirigir a `/login`.
- Entrar con Google → onboarding → `/hoy`.
- Instalar como PWA (Android: menú → "Agregar a inicio"; iOS: Safari → Compartir → "Añadir a pantalla de inicio").
- Generar rutina, empezar sesión, marcar una serie, ver que persiste.
- `/cuenta`: KPIs, heatmap y gráficos cargan.

## 7. Correr los tests de RLS (recomendado antes de abrir a usuarios reales)

En un proyecto de **staging** (no en el de producción), SQL Editor:

```sql
-- Pegar el contenido de supabase/tests/rls.test.sql
```

Si imprime `OK: todos los tests de RLS pasaron.` y hace `ROLLBACK` sin errores, los permisos están bien.

## 8. Variables en resumen

| Variable | Dónde | Visibilidad |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | Pública (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | Pública (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API | Sólo server, *sensitive* |

Nunca pongas la `service_role` en código client-side ni la commitees.
