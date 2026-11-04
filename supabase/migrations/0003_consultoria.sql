-- Consultoría de inversiones: cada consulta guarda las respuestas, el plan calculado por reglas
-- y, cuando hay IA configurada, la explicación y el contexto de mercado usados (para que no cambien al volver a verla).
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  answers jsonb not null,
  plan jsonb not null,
  explanation jsonb,
  research jsonb,
  macro jsonb,
  created_at timestamptz not null default now()
);
create index consultations_user_idx on public.consultations (user_id, created_at desc);

alter table public.consultations enable row level security;
create policy "own consultations" on public.consultations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
