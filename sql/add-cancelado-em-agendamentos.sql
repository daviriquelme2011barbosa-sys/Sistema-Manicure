alter table public.agendamentos
  add column if not exists cancelado_em timestamptz;
