-- Execute este arquivo no SQL Editor do Supabase para adicionar
-- a coluna ultimo_servico à view clientes_status.
-- Seguro para rodar em banco já configurado — não altera tabelas nem policies.

drop view if exists public.clientes_status;

create view public.clientes_status
  with (security_invoker = true)
as
select
  c.id,
  c.nome,
  c.whatsapp,
  c.observacoes,
  max(a.data_atendimento)                                as ultima_visita,
  current_date - max(a.data_atendimento)                 as dias_desde_ultima_visita,
  (
    select a2.servico
    from public.atendimentos a2
    where a2.cliente_id = c.id
    order by a2.data_atendimento desc
    limit 1
  )                                                      as ultimo_servico,
  case
    when max(a.data_atendimento) is null                         then 'sem_atendimento'
    when current_date - max(a.data_atendimento) <= 30            then 'verde'
    when current_date - max(a.data_atendimento) <= 60            then 'amarelo'
    else                                                              'vermelho'
  end                                                    as status
from public.clientes c
left join public.atendimentos a on a.cliente_id = c.id
group by c.id, c.nome, c.whatsapp, c.observacoes;
