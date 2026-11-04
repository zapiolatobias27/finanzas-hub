# Finanzas Hub

Gastos, ingresos e inversiones (IOL + Mercado Pago)

## Stack
Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS) · TailwindCSS · shadcn/ui · Zod · Vitest

## Arranque
```bash
cp .env.example .env.local   # completar las keys de Supabase
npm install
npx supabase db push         # o pegar supabase/migrations/*.sql en el SQL editor
npm run dev                  # http://localhost:3003
```

## Scripts
- `npm run dev` · `npm run build` · `npm run typecheck` · `npm test`
