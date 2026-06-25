-- Adiciona 'cancelado' ao check constraint de agendamentos.status.
-- Rodar se o UPDATE de cancelamento retornar erro de violação de constraint.
--
-- Diagnóstico: verifique o nome real do constraint com:
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.agendamentos'::regclass and contype = 'c';
--
-- Se o constraint existir e não incluir 'cancelado', execute:

alter table public.agendamentos
  drop constraint if exists agendamentos_status_check;

alter table public.agendamentos
  add constraint agendamentos_status_check
  check (status in ('pendente', 'confirmado', 'compareceu', 'faltou', 'cancelado'));
