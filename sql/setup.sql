-- =============================================================
-- setup.sql — Sistema de Gestão e Reativação de Clientes
-- Execute este arquivo uma única vez no SQL Editor do Supabase
-- ao implantar o sistema para um novo salão.
--
-- Ordem de execução:
--   1. Extensão
--   2. Tabelas (clientes → atendimentos → salao_config)
--   3. Índice de performance
--   4. View clientes_status
--   5. Habilitar RLS
--   6. Policies (clientes → atendimentos → salao_config)
-- =============================================================


-- =============================================================
-- 1. EXTENSÃO
-- =============================================================

create extension if not exists "pgcrypto";


-- =============================================================
-- 2. TABELAS
-- =============================================================

-- Identidade da cliente — 1 linha por cliente, nunca duplicada.
-- whatsapp é a chave de deduplicação; armazenar normalizado (só dígitos).
create table if not exists public.clientes (
  id          uuid        primary key default gen_random_uuid(),
  nome        text        not null,
  whatsapp    text        not null unique,
  observacoes text,
  criado_em   timestamptz not null default now()
);

-- Histórico de visitas — N atendimentos por cliente.
-- data_atendimento é a base do cálculo de status (verde/amarelo/vermelho).
create table if not exists public.atendimentos (
  id               uuid  primary key default gen_random_uuid(),
  cliente_id       uuid  not null references public.clientes(id) on delete cascade,
  servico          text  not null,
  data_atendimento date  not null default current_date,
  criado_em        timestamptz not null default now()
);

-- Configuração do salão — 1 linha por instância.
-- user_id vincula o registro ao usuário criado no Supabase Auth.
create table if not exists public.salao_config (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  nome_salao   text not null,
  cor_primaria text not null default '#ec4899',
  criado_em    timestamptz not null default now()
);


-- =============================================================
-- 3. ÍNDICE DE PERFORMANCE
-- =============================================================

-- Acelera a busca da última visita por cliente (MAX(data_atendimento)).
create index if not exists idx_atendimentos_cliente_data
  on public.atendimentos (cliente_id, data_atendimento desc);


-- =============================================================
-- 4. VIEW clientes_status
-- =============================================================
-- Status é sempre calculado em tempo de leitura — nunca uma coluna.
-- security_invoker = true garante que o RLS das tabelas base seja
-- aplicado no contexto de quem consulta, não de quem criou a view.

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


-- =============================================================
-- 5. HABILITAR RLS
-- Após este comando, toda query sem policy retorna zero linhas.
-- =============================================================

alter table public.clientes     enable row level security;
alter table public.atendimentos enable row level security;
alter table public.salao_config enable row level security;


-- =============================================================
-- 6. POLICIES — tabela clientes
-- =============================================================

create policy "owner pode ler clientes"
  on public.clientes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );

create policy "owner pode inserir clientes"
  on public.clientes
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );

create policy "owner pode atualizar clientes"
  on public.clientes
  for update
  to authenticated
  using (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );

create policy "owner pode deletar clientes"
  on public.clientes
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );


-- =============================================================
-- 7. POLICIES — tabela atendimentos
-- =============================================================

create policy "owner pode ler atendimentos"
  on public.atendimentos
  for select
  to authenticated
  using (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );

create policy "owner pode inserir atendimentos"
  on public.atendimentos
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );

create policy "owner pode atualizar atendimentos"
  on public.atendimentos
  for update
  to authenticated
  using (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );

create policy "owner pode deletar atendimentos"
  on public.atendimentos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );


-- =============================================================
-- 8. POLICIES — tabela salao_config
-- INSERT e DELETE bloqueados por omissão (RLS padrão).
-- Apenas o implantador insere via service_role no painel Supabase.
-- =============================================================

create policy "owner pode ler sua config"
  on public.salao_config
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "owner pode atualizar sua config"
  on public.salao_config
  for update
  to authenticated
  using    (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================
-- PRÓXIMO PASSO (executar separadamente com a service_role key)
-- =============================================================
-- Após criar o usuário da dona no Supabase Auth → Authentication → Add user,
-- execute o INSERT abaixo substituindo os valores em < >:
--
-- insert into public.salao_config (user_id, nome_salao, cor_primaria)
-- values (
--   '<uuid-do-usuario-criado-no-auth>',
--   '<Nome do Salão>',
--   '#ec4899'
-- );
-- =============================================================
