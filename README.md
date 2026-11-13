# GYMIA

App web mobile-first para armar, llevar y ajustar tu rutina de gimnasio desde el celular.
La especificación completa está en [`docs/SPEC.md`](docs/SPEC.md).

## Stack

- Next.js (App Router) + TypeScript strict
- Tailwind CSS v4 + utilidades estilo shadcn/ui
- Supabase (Auth + Postgres + RLS + Storage) vía `@supabase/ssr`
- Vitest para lógica pura

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Cuenta de Supabase (gratuita)

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las keys de Supabase
```

### Supabase

1. Crear un proyecto nuevo en https://supabase.com.
2. Ir a `Project Settings → API`.
3. Copiar a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` → service_role key (solo server, nunca exponer)

## Scripts

```bash
npm run dev       # dev server en http://localhost:3000
npm run build     # build de producción
npm run start     # correr el build
npm run lint      # ESLint
npm run test      # Vitest (una vez)
npm run test:watch
```

## Estructura

```
src/
  app/              rutas App Router: (auth), (app), (trainer)
  modules/          lógica de dominio por feature
  lib/supabase/     clientes server y browser + middleware
  components/ui/    componentes shadcn
  middleware.ts     refresco de sesión Supabase
supabase/
  migrations/       SQL versionado
  seed.sql          catálogo inicial
docs/SPEC.md        spec completa
```

## Verificar que funciona

Después de `npm install` y configurar `.env.local`:

```bash
npm run dev
```

Abrir http://localhost:3000. Debería redirigir a `/hoy` y mostrar el placeholder.
Correr `npm run test` para verificar que Vitest está OK.
