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
| Frontend | A definir — framework mobile-first compatível com Vercel + Supabase |
| Backend / Banco | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| Hospedagem | [Vercel](https://vercel.com) |
| Versionamento | GitHub |
| IDE | VS Code + Claude Code |

---

## Estrutura do banco

Duas tabelas + uma view que calcula o status automaticamente.

```
clientes          atendimentos
─────────         ────────────────────
id (PK)      ←── cliente_id (FK)
nome              id (PK)
whatsapp (UK)     servico
observacoes       data_atendimento  ← base do status
criado_em         criado_em

view: clientes_status
  → última visita, dias desde última visita, status calculado
```

`whatsapp` é único e normalizado (só dígitos) — é a chave de deduplicação. Cadastrar atendimento de cliente existente insere apenas em `atendimentos`, nunca duplica `clientes`.

---

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
SUPABASE_URL=https://<seu-projeto>.supabase.co
SUPABASE_ANON_KEY=<chave-anon-public>
```

> **Nunca** use a chave `service_role` no frontend nem em variáveis prefixadas com `NEXT_PUBLIC_` ou `VITE_`. Ela bypassa todo o RLS — use-a apenas em scripts de implantação locais.

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

**Passo 1 — Criar as tabelas e a view** (arquivo `docs/ERD.md`, seção 4 e 5):

```sql
create extension if not exists "pgcrypto";

create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  whatsapp    text not null unique,
  observacoes text,
  criado_em   timestamptz not null default now()
);

create table if not exists public.atendimentos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes(id) on delete cascade,
  servico          text not null,
  data_atendimento date not null default current_date,
  criado_em        timestamptz not null default now()
);

create index if not exists idx_atendimentos_cliente_data
  on public.atendimentos (cliente_id, data_atendimento desc);

create table if not exists public.salao_config (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  nome_salao   text not null,
  cor_primaria text not null default '#ec4899',
  criado_em    timestamptz not null default now()
);

create or replace view public.clientes_status
  with (security_invoker = true)
as
select
  c.id, c.nome, c.whatsapp, c.observacoes,
  max(a.data_atendimento)                              as ultima_visita,
  current_date - max(a.data_atendimento)               as dias_desde_ultima_visita,
  case
    when max(a.data_atendimento) is null        then 'sem_atendimento'
    when current_date - max(a.data_atendimento) <= 30  then 'verde'
    when current_date - max(a.data_atendimento) <= 60  then 'amarelo'
    else 'vermelho'
  end                                                  as status
from public.clientes c
left join public.atendimentos a on a.cliente_id = c.id
group by c.id, c.nome, c.whatsapp, c.observacoes;
```

**Passo 2 — Habilitar RLS e criar as policies** (arquivo `docs/RBAC-RLS.md`, seção 5):

```sql
alter table public.clientes     enable row level security;
alter table public.atendimentos enable row level security;
alter table public.salao_config enable row level security;

-- (cole aqui todas as policies do documento RBAC-RLS.md)
```

**Passo 3 — Criar a conta da dona e vincular ao salão:**

```sql
-- Execute com a service_role key (nunca commitar essa chave)
insert into public.salao_config (user_id, nome_salao, cor_primaria)
values (
  '<uuid-do-usuario-criado-no-auth>',
  '<Nome do Salão>',
  '#ec4899'
);
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

## Modelo de negócio (fase atual)

Serviço replicável — ainda não SaaS. Cada salão recebe seu próprio projeto Supabase e deploy no Vercel.

- Taxa de implantação: R$ 300–600 (cobrada uma vez)
- Mensalidade de suporte: R$ 80–150
- Replicar para um novo salão = trocar nome e cor em `salao_config`
- Gatilho para virar SaaS: 5–8 salões pagando mensalidade

---

## Roadmap resumido

| Fase | Gatilho de entrada | O que entra |
|------|-------------------|-------------|
| **0 — MVP** | — | 3 telas, 2 tabelas, 1 usuário por salão |
| **1 — Consolidação** | Dona usa 2x/semana por hábito | Edição, histórico, templates variados, lembrete semanal |
| **2 — Plataforma** | 5–8 salões pagando | Multi-tenant, onboarding self-service, múltiplos usuários |
| **3 — Expansão** | Onboarding sem intervenção manual | Insights, templates editáveis, agendamento básico, planos |

---

## Documentação

Todos os documentos vivem em `/docs` dentro deste repositório:

| Arquivo | O que contém |
|---------|-------------|
| [`docs/PRD.md`](docs/PRD.md) | Problema, escopo do MVP, métricas de sucesso, modelo de negócio |
| [`docs/ERD.md`](docs/ERD.md) | Diagrama de entidades, SQL das tabelas, view de status |
| [`docs/RBAC-RLS.md`](docs/RBAC-RLS.md) | Políticas de acesso, RLS do Supabase, script de implantação |
| [`docs/UX-Flow.md`](docs/UX-Flow.md) | Jornada da dona, comportamento de cada tela, estados de UI |
| [`docs/TEST-PLAN.md`](docs/TEST-PLAN.md) | 56 casos de teste, checklist de entrega, casos de borda |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Fases de evolução, gatilhos, itens fora do escopo |

---

## Checklist antes de entregar a um salão

- [ ] RLS habilitado nas três tabelas
- [ ] Todas as policies criadas e testadas
- [ ] `salao_config` inserido com o `user_id` correto
- [ ] Chave `anon` no frontend; `service_role` ausente do código
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Testado: acesso anônimo não retorna dados
- [ ] Testado: responsivo em 375px (iPhone SE)
- [ ] Testado: deduplicação por WhatsApp funciona em 4 formatos de número
- [ ] Testado: bordas de status corretas (dias 30/31 e 60/61)
- [ ] Testado: link `wa.me` abre com número e mensagem corretos
