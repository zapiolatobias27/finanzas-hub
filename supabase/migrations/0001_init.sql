-- Finanzas Hub: esquema inicial
create type provider as enum ('manual', 'mercadopago', 'iol');
create type currency as enum ('ARS', 'USD');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  occurred_on date not null,
  -- Positivo = ingreso, negativo = gasto
  amount numeric(14, 2) not null check (amount <> 0),
  currency currency not null default 'ARS',
  category text not null default 'otros',
  description text not null default '',
  source provider not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  -- Idempotencia de las sincronizaciones (NULLs no chocan: los manuales no se ven afectados)
  unique (user_id, source, external_id)
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);

create table public.budgets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category text not null,
  monthly_limit numeric(14, 2) not null check (monthly_limit > 0),
  primary key (user_id, category)
);

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  saved_amount numeric(14, 2) not null default 0 check (saved_amount >= 0),
  currency currency not null default 'ARS',
  deadline date not null,
  priority smallint not null default 3 check (priority between 1 and 5),
  created_at timestamptz not null default now()
);

create table public.investor_profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  risk_tolerance smallint not null default 3 check (risk_tolerance between 1 and 5),
  emergency_months smallint not null default 6 check (emergency_months between 1 and 24),
  emergency_saved numeric(14, 2) not null default 0,
  -- Tipo de cambio de referencia (MEP) para consolidar en pesos
  usd_ars_rate numeric(10, 2) not null default 1000,
  updated_at timestamptz not null default now()
);

-- Posiciones sincronizadas desde IOL (solo lectura para el usuario)
create table public.portfolio_positions (
  user_id uuid not null references auth.users on delete cascade,
  provider provider not null,
  symbol text not null,
  description text,
  instrument_type text,
  quantity numeric not null,
  last_price numeric,
  valuation numeric not null,
  currency currency not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, provider, symbol)
);

-- Tokens de terceros CIFRADOS. Sin policies: solo accesible con service role desde el server.
create table public.integrations (
  user_id uuid not null references auth.users on delete cascade,
  provider provider not null,
  access_token_enc text not null,
  refresh_token_enc text,
  expires_at timestamptz,
  external_user_id text,
  status text not null default 'active',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.financial_goals enable row level security;
alter table public.investor_profiles enable row level security;
alter table public.portfolio_positions enable row level security;
alter table public.integrations enable row level security;

create policy "own tx" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own budgets" on public.budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own goals" on public.financial_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own investor profile" on public.investor_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read own positions" on public.portfolio_positions for select using (user_id = auth.uid());

-- Estado de integraciones sin exponer tokens
create or replace function public.my_integrations()
returns table (provider provider, status text, last_sync_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select provider, status, last_sync_at from public.integrations where user_id = auth.uid();
$$;
revoke all on function public.my_integrations() from public;
grant execute on function public.my_integrations() to authenticated;
revoke execute on function public.my_integrations() from anon;
