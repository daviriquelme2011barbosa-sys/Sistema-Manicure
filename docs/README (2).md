# Sistema de Gestão e Reativação de Clientes

> Avisa a dona do salão **quem sumiu** e deixa **um clique** entre ela e a mensagem de "saudade, bora marcar?".

Sistema web mobile-first para manicures e donas de salão pararem de perder clientes por esquecimento. Centraliza o cadastro de atendimentos, mostra visualmente quem está sumindo e abre o WhatsApp com mensagem pronta em um toque.

---

## O problema que resolve

A dona gerencia tudo no WhatsApp e no caderno. Resultado: sem histórico confiável de quando cada cliente veio, sem sinal de quem está sumindo, sem jeito organizado de chamar de volta. O problema é esquecimento e desorganização — não falta de vontade.

---

## Como funciona (3 telas)

```
Atendimento acontece
      │
      ▼
[Tela 1] Cadastra a cliente ou registra novo atendimento
      │          (deduplicação automática por WhatsApp)
      ▼
[Tela 2] Lista todas as clientes com status por cor
      │   🟢 ativa (≤ 30 dias)  🟡 atenção (31–60 dias)  🔴 sumida (> 60 dias)
      ▼
[Tela 3] Painel de reativação — clica → WhatsApp abre com mensagem pronta
      │
      ▼
Cliente volta → próximo atendimento fecha o ciclo
```

O status (verde/amarelo/vermelho) é **calculado na hora** a partir da data do último atendimento — nunca fica desatualizado.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js (App Router) — mobile-first |
| Backend / Banco | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| Hospedagem | [Vercel](https://vercel.com) |
| Versionamento | GitHub |
| Estilização | Tailwind CSS |

---

## Estrutura do banco

Três tabelas + uma view que calcula o status automaticamente.

```
salao_config
─────────────
id (PK)
user_id (UK, FK auth.users)
nome_salao
cor_primaria

clientes                    atendimentos
────────────────────        ────────────────────────────
id (PK)                ←── cliente_id (FK)
salao_id (FK)               id (PK)
nome                        salao_id (FK)
whatsapp ─┐                 servico
           ├── UK por salão  data_atendimento  ← base do status
salao_id ─┘                 horario
observacoes                 preco
autoriza_contato            criado_em
origem
criado_em

view: clientes_status
  → última visita, dias desde última visita, status calculado, último serviço
```

`(whatsapp, salao_id)` é a constraint de unicidade — a chave de deduplicação dentro de cada salão. Cadastrar atendimento de cliente existente insere apenas em `atendimentos`, nunca duplica `clientes`.

---

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anon-public>
SUPABASE_SERVICE_ROLE_KEY=<chave-service-role>
```

> `SUPABASE_SERVICE_ROLE_KEY` é usada **exclusivamente** pela API Route `/api/cadastro-publico` no servidor. Nunca prefixar com `NEXT_PUBLIC_` — não deve ser exposta no frontend.

---

## Setup local

```bash
# 1. Clone o repositório
git clone https://github.com/<seu-usuario>/<repo>.git
cd <repo>

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# edite .env.local com suas chaves do Supabase

# 4. Rode o servidor de desenvolvimento
npm run dev
```

---

## Setup do Supabase (novo salão)

Execute os scripts na ordem abaixo no **SQL Editor** do Supabase.

**Passo 1 — Criar as tabelas e a view** (arquivo `docs/ERD-sistema-reativacao-salao.md`, seções 4 e 5):

```sql
create extension if not exists "pgcrypto";

-- Configuração do salão
create table if not exists public.salao_config (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null unique references auth.users(id) on delete cascade,
  nome_salao   text        not null,
  cor_primaria text        not null default '#ec4899',
  criado_em    timestamptz not null default now()
);

-- Clientes
create table if not exists public.clientes (
  id               uuid        primary key default gen_random_uuid(),
  salao_id         uuid        not null references public.salao_config(id) on delete cascade,
  nome             text        not null,
  whatsapp         text        not null,
  observacoes      text,
  autoriza_contato boolean     not null default false,
  origem           text        not null default 'manual',
  criado_em        timestamptz not null default now(),
  constraint clientes_whatsapp_salao_unique unique (whatsapp, salao_id)
);

-- Atendimentos
create table if not exists public.atendimentos (
  id               uuid         primary key default gen_random_uuid(),
  cliente_id       uuid         not null references public.clientes(id) on delete cascade,
  salao_id         uuid         not null references public.salao_config(id) on delete cascade,
  servico          text         not null,
  data_atendimento date         not null default current_date,
  horario          time,
  preco            numeric(10,2),
  criado_em        timestamptz  not null default now()
);

create index if not exists idx_atendimentos_cliente_data
  on public.atendimentos (cliente_id, data_atendimento desc);

create index if not exists idx_clientes_salao
  on public.clientes (salao_id);

create index if not exists idx_atendimentos_salao
  on public.atendimentos (salao_id);

-- View de status
create or replace view public.clientes_status
  with (security_invoker = true)
as
select
  c.id, c.nome, c.whatsapp, c.observacoes, c.autoriza_contato, c.salao_id,
  max(a.data_atendimento)                              as ultima_visita,
  (current_date - max(a.data_atendimento))::int        as dias_desde_ultima_visita,
  case
    when max(a.data_atendimento) is null        then 'sem_atendimento'
    when current_date - max(a.data_atendimento) <= 30  then 'verde'
    when current_date - max(a.data_atendimento) <= 60  then 'amarelo'
    else 'vermelho'
  end                                                  as status,
  (
    select servico from public.atendimentos
    where cliente_id = c.id
    order by data_atendimento desc
    limit 1
  )                                                    as ultimo_servico
from public.clientes c
left join public.atendimentos a on a.cliente_id = c.id
group by c.id;
```

**Passo 2 — Habilitar RLS e criar as policies** (arquivo `docs/RBAC-RLS-sistema-reativacao-salao.md`, seção 5):

```sql
alter table public.clientes     enable row level security;
alter table public.atendimentos enable row level security;
alter table public.salao_config enable row level security;

-- Policies clientes
create policy "owner pode ler clientes" on public.clientes
  for select to authenticated
  using (salao_id = (select id from public.salao_config where user_id = auth.uid()));

create policy "owner pode inserir clientes" on public.clientes
  for insert to authenticated
  with check (salao_id = (select id from public.salao_config where user_id = auth.uid()));

create policy "owner pode atualizar clientes" on public.clientes
  for update to authenticated
  using    (salao_id = (select id from public.salao_config where user_id = auth.uid()))
  with check (salao_id = (select id from public.salao_config where user_id = auth.uid()));

create policy "owner pode deletar clientes" on public.clientes
  for delete to authenticated
  using (salao_id = (select id from public.salao_config where user_id = auth.uid()));

-- Policies atendimentos
create policy "owner pode ler atendimentos" on public.atendimentos
  for select to authenticated
  using (salao_id = (select id from public.salao_config where user_id = auth.uid()));

create policy "owner pode inserir atendimentos" on public.atendimentos
  for insert to authenticated
  with check (salao_id = (select id from public.salao_config where user_id = auth.uid()));

create policy "owner pode atualizar atendimentos" on public.atendimentos
  for update to authenticated
  using    (salao_id = (select id from public.salao_config where user_id = auth.uid()))
  with check (salao_id = (select id from public.salao_config where user_id = auth.uid()));

create policy "owner pode deletar atendimentos" on public.atendimentos
  for delete to authenticated
  using (salao_id = (select id from public.salao_config where user_id = auth.uid()));

-- Policies salao_config
create policy "owner pode ler sua config" on public.salao_config
  for select to authenticated
  using (user_id = auth.uid());

create policy "owner pode atualizar sua config" on public.salao_config
  for update to authenticated
  using    (user_id = auth.uid())
  with check (user_id = auth.uid());
```

**Passo 3 — Criar a conta da dona e vincular ao salão:**

```sql
-- Execute com a service_role key (nunca commitar essa chave)
-- Antes: crie o usuário em Authentication → Add user no painel do Supabase

insert into public.salao_config (user_id, nome_salao, cor_primaria)
values (
  '<uuid-do-usuario-criado-no-auth>',
  '<Nome do Salão>',
  '#ec4899'   -- ou a cor primária do salão
);

-- Anote o id gerado — é o salao_id para a URL do formulário público:
-- https://<seu-deploy>.vercel.app/cadastro/<salao_id>
select id, nome_salao from public.salao_config;
```

**Passo 4 — Configurar as variáveis de ambiente no Vercel:**

```
NEXT_PUBLIC_SUPABASE_URL       = https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = <chave-anon-public>
SUPABASE_SERVICE_ROLE_KEY      = <chave-service-role>   ← sem NEXT_PUBLIC_
```

---

## Lógica de status

| Dias desde o último atendimento | Status |
|---------------------------------|--------|
| 0 a 30 | 🟢 Verde — ativa |
| 31 a 60 | 🟡 Amarelo — atenção |
| 61 ou mais | 🔴 Vermelho — sumida |
| Sem atendimento | ⚪ Cinza — não entra na reativação |

> As bordas importam: `dias = 30` → verde; `dias = 31` → amarelo; `dias = 60` → amarelo; `dias = 61` → vermelho.

---

## Formulário público de cadastro

Cada salão tem uma URL pública que a dona pode compartilhar como QR code ou link:

```
https://<seu-deploy>.vercel.app/cadastro/<salao_id>
```

A cliente preenche nome, WhatsApp e consentimento LGPD sem precisar criar conta. A deduplicação é automática — enviar o formulário duas vezes não duplica o cadastro.

---

## Modelo de negócio (fase atual)

Serviço replicável — ainda não SaaS. Cada salão recebe seu próprio projeto Supabase e deploy no Vercel.

- Taxa de implantação: R$ 300–600 (cobrada uma vez)
- Mensalidade de suporte: R$ 80–150
- Replicar para um novo salão = novo projeto Supabase + deploy Vercel + rodar os scripts acima
- Gatilho para virar SaaS: 5–8 salões pagando mensalidade

---

## Roadmap resumido

| Fase | Status | Gatilho de entrada | O que entra |
|------|--------|-------------------|-------------|
| **0 — MVP** | ✅ Concluída | — | 3 telas, 2 tabelas, 1 usuário por salão |
| **1 — Consolidação** | 🔄 Em andamento | Dona usa 2x/semana por hábito | Edição ✅ · Recuperação de senha ✅ · Formulário público ✅ · Templates variados · Histórico · Lembrete semanal |
| **2 — Plataforma** | ⏳ | 5–8 salões pagando | Multi-tenant (salao_id já pronto), onboarding self-service, múltiplos usuários |
| **3 — Expansão** | ⏳ | Onboarding sem intervenção manual | Insights, templates editáveis, agendamento básico, planos |

---

## Documentação

Todos os documentos vivem em `/docs` dentro deste repositório:

| Arquivo | O que contém |
|---------|-------------|
| [`docs/PRD-sistema-reativacao-salao.md`](docs/PRD-sistema-reativacao-salao.md) | Problema, escopo do MVP, métricas de sucesso, modelo de negócio |
| [`docs/ERD-sistema-reativacao-salao.md`](docs/ERD-sistema-reativacao-salao.md) | Diagrama de entidades, SQL das tabelas, view de status |
| [`docs/RBAC-RLS-sistema-reativacao-salao.md`](docs/RBAC-RLS-sistema-reativacao-salao.md) | Políticas de acesso, RLS do Supabase, script de implantação |
| [`docs/UX-Flow-sistema-reativacao-salao.md`](docs/UX-Flow-sistema-reativacao-salao.md) | Jornada da dona, comportamento de cada tela, estados de UI |
| [`docs/TEST-PLAN-sistema-reativacao-salao.md`](docs/TEST-PLAN-sistema-reativacao-salao.md) | Casos de teste, checklist de entrega, casos de borda |
| [`docs/ROADMAP-sistema-reativacao-salao.md`](docs/ROADMAP-sistema-reativacao-salao.md) | Fases de evolução, gatilhos, itens fora do escopo |

---

## Checklist antes de entregar a um salão

- [ ] RLS habilitado nas três tabelas
- [ ] Todas as policies criadas e testadas
- [ ] `salao_config` inserido com o `user_id` correto
- [ ] Chave `anon` no frontend; `service_role` ausente de variáveis `NEXT_PUBLIC_*`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel (sem `NEXT_PUBLIC_`)
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Testado: acesso anônimo não retorna dados
- [ ] Testado: responsivo em 375px (iPhone SE)
- [ ] Testado: deduplicação por WhatsApp funciona em 4 formatos de número
- [ ] Testado: bordas de status corretas (dias 30/31 e 60/61)
- [ ] Testado: link `wa.me` abre com número e mensagem corretos
- [ ] Testado: formulário público insere cliente com `salao_id` correto
- [ ] URL do formulário público anotada e testada: `/cadastro/<salao_id>`
