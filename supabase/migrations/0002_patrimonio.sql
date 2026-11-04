-- Patrimonio: billeteras cripto, posiciones cargadas a mano y fotos diarias del patrimonio.
-- Los precios NO se guardan acá: se consultan en vivo (dolarapi, data912, CoinGecko) con caché corta en el server.

create type crypto_chain as enum ('bitcoin', 'ethereum');
create type asset_kind as enum ('cedear', 'accion', 'cripto');

-- Billeteras propias: solo la dirección PÚBLICA (nunca claves privadas ni frases semilla).
create table public.crypto_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  chain crypto_chain not null,
  address text not null check (char_length(address) between 26 and 90),
  label text,
  created_at timestamptz not null default now(),
  unique (user_id, chain, address)
);

-- Tenencias cargadas a mano (para quien no conecta IOL o tiene activos en otro lado).
create table public.manual_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind asset_kind not null,
  symbol text not null check (symbol ~ '^[A-Z0-9.]{1,12}$'),
  quantity numeric not null check (quantity > 0),
  -- Precio promedio de compra (opcional) en la moneda en la que cotiza: ARS para CEDEARs/acciones, USD para cripto.
  avg_price numeric check (avg_price is null or avg_price >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, kind, symbol)
);

-- Una foto por día del patrimonio, para el gráfico de evolución.
create table public.net_worth_snapshots (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  total_ars numeric not null,
  total_usd numeric not null,
  breakdown jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.crypto_wallets enable row level security;
alter table public.manual_positions enable row level security;
alter table public.net_worth_snapshots enable row level security;

create policy "own wallets" on public.crypto_wallets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own positions" on public.manual_positions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own snapshots" on public.net_worth_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
