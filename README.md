# Vehicontrol — Frontend (Netlify)

Interfaz Next.js para dueños, conductores y super admin. La **base de datos** está en Supabase; las **mutaciones** van al backend en Railway.

## Arquitectura

| Capa | Dónde | Qué hace |
|------|-------|----------|
| UI + SSR | Netlify (este repo) | Pantallas, auth Supabase, lecturas RLS |
| API | Railway (`vehicontrol-back`) | Crear viajes, gastos, liquidaciones, etc. |
| DB | Supabase | Postgres, auth, storage |

## Variables (Netlify)

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `BACKEND_URL` | URL del API Railway (server actions) |
| `NEXT_PUBLIC_BACKEND_URL` | Misma URL (proxy evidencias en cliente) |

## Desarrollo local

```bash
cp .env.example .env.local
npm install
# Terminal 1 — backend (repo vehicontrol-back)
npm run dev
# Terminal 2 — front
npm run dev
```

App: http://localhost:3000

## Deploy Netlify

1. Conecta este repo en Netlify
2. Build: `npm run build` (usa `@netlify/plugin-nextjs`)
3. Configura las variables de entorno
4. En Supabase → Authentication → URL Configuration, agrega la URL de Netlify

## Demo

- `owner.alpha@demo.saas-camiones.test` / `Demo2026!`
- `driver.alpha@demo.saas-camiones.test` / `Demo2026!`
