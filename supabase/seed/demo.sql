-- Datos de demo para el usuario de prueba de desarrollo.
-- Idempotente: solo borra y recrea lo que este script cargó (movimientos con external_id 'demo:%'
-- y los objetivos demo). No toca datos cargados a mano.
do $$
declare
  uid uuid := (select id from auth.users where email = 'dev@life-suite.test');
begin
  if uid is null then
    raise exception 'No existe el usuario dev@life-suite.test';
  end if;

  delete from public.transactions where user_id = uid and external_id like 'demo:%';
  delete from public.financial_goals where user_id = uid and name in ('Viaje a Europa', 'Notebook nueva');

  -- Movimientos: plantilla mensual × factor de inflación de cada mes.
  insert into public.transactions (user_id, occurred_on, amount, currency, category, description, source, external_id)
  select
    uid,
    make_date(m.y, m.mo, t.day),
    round(t.amount * m.factor, -2),
    'ARS',
    t.category,
    t.description,
    'manual',
    format('demo:%s-%s:%s', m.y, m.mo, t.id)
  from (values
    (2026, 8, 0.94, 31),
    (2026, 9, 0.97, 30),
    (2026, 10, 1.00, 31),
    (2026, 11, 1.03, 3)  -- mes en curso: hasta hoy
  ) as m(y, mo, factor, last_day)
  cross join (values
    ('sueldo', 1, 1800000, 'sueldo', 'Sueldo'),
    ('osde', 2, -85000, 'salud', 'OSDE'),
    ('netflix', 3, -9500, 'suscripciones', 'Netflix'),
    ('spotify', 3, -6500, 'suscripciones', 'Spotify'),
    ('sube', 4, -15000, 'transporte', 'SUBE'),
    ('alquiler', 5, -450000, 'vivienda', 'Alquiler'),
    ('coto1', 6, -62000, 'supermercado', 'Coto'),
    ('expensas', 8, -92000, 'vivienda', 'Expensas'),
    ('rappi', 9, -18000, 'comida', 'Rappi'),
    ('edenor', 10, -38000, 'servicios', 'Edenor'),
    ('personal', 12, -21000, 'servicios', 'Personal fibra'),
    ('carrefour', 13, -58000, 'supermercado', 'Carrefour'),
    ('pedidosya', 16, -24000, 'comida', 'PedidosYa'),
    ('ypf', 18, -42000, 'transporte', 'YPF'),
    ('coto2', 20, -71000, 'supermercado', 'Coto'),
    ('salida', 21, -55000, 'ocio', 'Cine y salida'),
    ('resto', 23, -35000, 'comida', 'Resto con amigos'),
    ('ropa', 25, -30000, 'ropa', 'Zara'),
    ('dia', 27, -49000, 'supermercado', 'Día')
  ) as t(id, day, amount, category, description)
  where t.day <= m.last_day;

  -- Ingresos extra (freelance) en septiembre y octubre.
  insert into public.transactions (user_id, occurred_on, amount, currency, category, description, source, external_id) values
    (uid, '2026-09-15', 250000, 'ARS', 'sueldo', 'Honorarios freelance', 'manual', 'demo:2026-9:freelance'),
    (uid, '2026-10-15', 250000, 'ARS', 'sueldo', 'Honorarios freelance', 'manual', 'demo:2026-10:freelance'),
    -- Noviembre arranca con mucho delivery: dispara el aviso de "más que lo usual".
    (uid, '2026-11-02', -48000, 'ARS', 'comida', 'Rappi', 'manual', 'demo:2026-11:rappi-extra'),
    (uid, '2026-11-03', -62000, 'ARS', 'comida', 'Cumpleaños en resto', 'manual', 'demo:2026-11:resto-extra');

  insert into public.budgets (user_id, category, monthly_limit) values
    (uid, 'supermercado', 260000),
    (uid, 'comida', 90000),
    (uid, 'ocio', 60000),
    (uid, 'transporte', 60000)
  on conflict (user_id, category) do update set monthly_limit = excluded.monthly_limit;

  insert into public.financial_goals (user_id, name, target_amount, saved_amount, currency, deadline, priority) values
    (uid, 'Viaje a Europa', 4000, 900, 'USD', '2027-10-15', 3),
    (uid, 'Notebook nueva', 1800000, 900000, 'ARS', '2027-06-30', 4);

  insert into public.investor_profiles (user_id, risk_tolerance, emergency_months, emergency_saved, usd_ars_rate)
  values (uid, 3, 6, 3500000, 1450)
  on conflict (user_id) do update set
    risk_tolerance = excluded.risk_tolerance,
    emergency_months = excluded.emergency_months,
    emergency_saved = excluded.emergency_saved,
    usd_ars_rate = excluded.usd_ars_rate,
    updated_at = now();
end $$;

-- Inversiones de ejemplo (precios en vivo; el precio de compra es aproximado para mostrar ganancia/pérdida).
do $$
declare
  uid uuid := (select id from auth.users where email = 'dev@life-suite.test');
begin
  insert into public.manual_positions (user_id, kind, symbol, quantity, avg_price) values
    (uid, 'cedear', 'SPY', 12, 18500),
    (uid, 'cedear', 'AAPL', 15, 24000),
    (uid, 'cedear', 'MELI', 4, 26500),
    (uid, 'accion', 'GGAL', 150, 4800),
    (uid, 'accion', 'YPFD', 20, 7600),
    (uid, 'cripto', 'BTC', 0.012, 62000),
    (uid, 'cripto', 'ETH', 0.35, 2900),
    (uid, 'cripto', 'USDT', 250, 1)
  on conflict (user_id, kind, symbol) do update set quantity = excluded.quantity, avg_price = excluded.avg_price;
end $$;
