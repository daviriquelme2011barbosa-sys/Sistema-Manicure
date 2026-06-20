-- =============================================================
-- setup.sql — Sistema de Gestão e Reativação de Clientes
-- Execute este arquivo uma única vez no SQL Editor do Supabase
-- ao implantar o sistema para um novo salão.
--
-- Ordem de execução:
--   1. Extensão
--   2. Tabelas (salao_config → clientes → atendimentos →
--               convites → reativacoes → changelog)
--   3. Índices de performance
--   4. View clientes_status
--   5. Habilitar RLS
--   6. Policies por tabela
-- =============================================================


-- =============================================================
-- 1. EXTENSÃO
-- =============================================================

create extension if not exists "pgcrypto";


-- =============================================================
-- 2. TABELAS
-- =============================================================

-- Configuração do salão — 1 linha por instância/tenant.
-- user_id vincula o registro ao usuário criado no Supabase Auth.
create table if not exists public.salao_config (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null unique references auth.users(id) on delete cascade,
  nome_salao    text        not null,
  nome_manicure text,
  cor_primaria  text        not null default '#ec4899',
  foto_url      text,
  plano         text        not null default 'basic' check (plano in ('basic', 'profissional', 'master')),
  criado_em     timestamptz not null default now()
);

-- Identidade da cliente — 1 linha por cliente, nunca duplicada por salão.
-- whatsapp é a chave de deduplicação; armazenar normalizado (só dígitos).
-- origem: 'manual' (cadastrado pela dona) | 'formulario' (auto-cadastro pelo link público).
create table if not exists public.clientes (
  id               uuid        primary key default gen_random_uuid(),
  salao_id         uuid        not null references public.salao_config(id) on delete cascade,
  nome             text        not null,
  whatsapp         text        not null,
  email            text,
  data_nascimento  date,
  observacoes      text,
  autoriza_contato boolean     not null default true,
  origem           text        not null default 'manual',
  criado_em        timestamptz not null default now(),
  unique (whatsapp, salao_id)
);

-- Histórico de visitas — N atendimentos por cliente.
-- data_atendimento é a base do cálculo de status (verde/amarelo/vermelho).
create table if not exists public.atendimentos (
  id               uuid        primary key default gen_random_uuid(),
  cliente_id       uuid        not null references public.clientes(id) on delete cascade,
  salao_id         uuid        not null references public.salao_config(id) on delete cascade,
  servico          text        not null,
  data_atendimento date        not null default current_date,
  horario          time,
  preco            numeric(10, 2),
  criado_em        timestamptz not null default now()
);

-- Convites de onboarding — token de uso único para criar conta de novo salão.
-- Inserido manualmente pelo administrador via painel Supabase ou script.
create table if not exists public.convites (
  id        uuid        primary key default gen_random_uuid(),
  token     text        not null unique,
  usado     boolean     not null default false,
  criado_em timestamptz not null default now()
);

-- Registro de reativações — cada vez que a dona clica "enviar mensagem".
-- Usado para métricas no dashboard e na tela de movimentação.
create table if not exists public.reativacoes (
  id         uuid        primary key default gen_random_uuid(),
  salao_id   uuid        not null references public.salao_config(id) on delete cascade,
  cliente_id uuid        not null references public.clientes(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

-- Atualizações do sistema — exibidas na tela "Novidades".
-- Inserido pelo administrador; não tem vínculo com salão específico.
create table if not exists public.changelog (
  id        uuid        primary key default gen_random_uuid(),
  titulo    text        not null,
  descricao text        not null,
  criado_em timestamptz not null default now()
);


-- =============================================================
-- 3. ÍNDICES DE PERFORMANCE
-- =============================================================

-- Acelera MAX(data_atendimento) por cliente (cálculo de status).
create index if not exists idx_atendimentos_cliente_data
  on public.atendimentos (cliente_id, data_atendimento desc);

-- Acelera filtros por salão nas queries do dashboard.
create index if not exists idx_atendimentos_salao_criado
  on public.atendimentos (salao_id, criado_em desc);

create index if not exists idx_clientes_salao_criado
  on public.clientes (salao_id, criado_em desc);

-- Acelera lookup de deduplicação por whatsapp + salão.
create index if not exists idx_clientes_whatsapp_salao
  on public.clientes (whatsapp, salao_id);

create index if not exists idx_reativacoes_salao_criado
  on public.reativacoes (salao_id, criado_em desc);


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
  c.salao_id,
  c.nome,
  c.whatsapp,
  c.email,
  c.data_nascimento,
  c.observacoes,
  c.autoriza_contato,
  c.origem,
  c.criado_em,
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
group by
  c.id, c.salao_id, c.nome, c.whatsapp, c.email, c.data_nascimento,
  c.observacoes, c.autoriza_contato, c.origem, c.criado_em;


-- =============================================================
-- 5. HABILITAR RLS
-- Após este comando, toda query sem policy retorna zero linhas.
-- =============================================================

alter table public.salao_config  enable row level security;
alter table public.clientes      enable row level security;
alter table public.atendimentos  enable row level security;
alter table public.convites      enable row level security;
alter table public.reativacoes   enable row level security;
alter table public.changelog     enable row level security;


-- =============================================================
-- 6. POLICIES — tabela salao_config
-- INSERT é feito via service_role no onboarding; bloqueado para anon/auth.
-- DELETE bloqueado por omissão (RLS padrão sem policy = nenhum acesso).
-- =============================================================

drop policy if exists "owner pode ler sua config"      on public.salao_config;
drop policy if exists "owner pode atualizar sua config" on public.salao_config;

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
-- 7. POLICIES — tabela clientes
-- Todas escopadas por salao_id para isolamento correto entre tenants.
-- =============================================================

drop policy if exists "owner pode ler clientes"      on public.clientes;
drop policy if exists "owner pode inserir clientes"  on public.clientes;
drop policy if exists "owner pode atualizar clientes" on public.clientes;
drop policy if exists "owner pode deletar clientes"  on public.clientes;

create policy "owner pode ler clientes"
  on public.clientes
  for select
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

create policy "owner pode inserir clientes"
  on public.clientes
  for insert
  to authenticated
  with check (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

create policy "owner pode atualizar clientes"
  on public.clientes
  for update
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  )
  with check (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

create policy "owner pode deletar clientes"
  on public.clientes
  for delete
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );


-- =============================================================
-- 8. POLICIES — tabela atendimentos
-- Todas escopadas por salao_id.
-- =============================================================

drop policy if exists "owner pode ler atendimentos"      on public.atendimentos;
drop policy if exists "owner pode inserir atendimentos"  on public.atendimentos;
drop policy if exists "owner pode atualizar atendimentos" on public.atendimentos;
drop policy if exists "owner pode deletar atendimentos"  on public.atendimentos;

create policy "owner pode ler atendimentos"
  on public.atendimentos
  for select
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

create policy "owner pode inserir atendimentos"
  on public.atendimentos
  for insert
  to authenticated
  with check (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

create policy "owner pode atualizar atendimentos"
  on public.atendimentos
  for update
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  )
  with check (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

create policy "owner pode deletar atendimentos"
  on public.atendimentos
  for delete
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );


-- =============================================================
-- 9. POLICIES — tabela reativacoes
-- Escopadas por salao_id.
-- =============================================================

drop policy if exists "owner pode ler reativacoes"     on public.reativacoes;
drop policy if exists "owner pode inserir reativacoes" on public.reativacoes;

create policy "owner pode ler reativacoes"
  on public.reativacoes
  for select
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

create policy "owner pode inserir reativacoes"
  on public.reativacoes
  for insert
  to authenticated
  with check (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );


-- =============================================================
-- 10. POLICIES — tabela changelog
-- Leitura pública para todos os usuários autenticados (global, sem tenant).
-- Escrita somente via service_role (painel Supabase ou script).
-- =============================================================

drop policy if exists "autenticados podem ler changelog" on public.changelog;

create policy "autenticados podem ler changelog"
  on public.changelog
  for select
  to authenticated
  using (true);


-- =============================================================
-- 11. POLICIES — tabela convites
-- Sem policies para usuários — acessada exclusivamente via
-- service_role no route de onboarding. RLS habilitado bloqueia
-- qualquer acesso via anon/auth.
-- =============================================================

-- (sem policies intencionalmente — proteção total via service_role)


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
--
-- Para criar um convite de onboarding:
--
-- insert into public.convites (token)
-- values ('<token-aleatorio-seguro>');
-- =============================================================
