# RBAC/RLS — Permissões e Regras de Acesso

**Versão:** 1.1
**Banco:** Supabase (PostgreSQL)
**Última atualização:** 12/06/2026

---

## 1. Contexto e modelo de acesso

### Modelo de implantação do MVP

Cada salão recebe sua **própria instância do sistema** — um projeto Supabase dedicado com banco de dados isolado. Não existe compartilhamento de dados entre salões nesta fase (isso vem com o SaaS multi-tenant, seção 8).

O RLS tem duas responsabilidades neste MVP:

1. **Garantir que só a dona autenticada acesse e modifique os dados** — policies por `auth.uid()`
2. **Filtrar por `salao_id`** — preparação para o multi-tenant; garante isolamento correto mesmo que, no futuro, múltiplos salões coexistam no mesmo banco

### Único papel no MVP

| Papel | Quem é | O que pode fazer |
|-------|--------|-----------------|
| `owner` (dona do salão) | A dona/manicure que contratou o sistema | Tudo — ler, criar, editar e excluir clientes e atendimentos |

Não existem outros papéis no MVP. Múltiplos usuários com permissões diferentes está explicitamente fora de escopo (PRD, seção 10).

---

## 2. Fluxo de autenticação

O sistema usa o **Supabase Auth** com login por e-mail e senha. O fluxo é:

```
1. Dona acessa o sistema pelo navegador
2. Insere e-mail + senha cadastrados na implantação
3. Supabase Auth valida e gera um JWT com o user_id da dona
4. O frontend armazena o token de sessão
5. Cada requisição ao banco inclui o JWT no header
6. O RLS usa auth.uid() para resolver o salao_id e validar o acesso à linha
```

O cadastro da conta da dona é feito **por você (implantador)** no momento da entrega do sistema — ela não se auto-cadastra. Isso mantém controle sobre quem tem acesso.

---

## 3. Matriz de permissões

### 3.1 Por operação e tabela

| Operação | `clientes` | `atendimentos` | `salao_config` | `clientes_status` (view) |
|----------|:----------:|:--------------:|:--------------:|:------------------------:|
| SELECT | ✅ owner | ✅ owner | ✅ owner | ✅ owner |
| INSERT | ✅ owner | ✅ owner | ❌ bloqueado | ❌ (view somente leitura) |
| UPDATE | ✅ owner | ✅ owner | ✅ owner | ❌ (view somente leitura) |
| DELETE | ✅ owner | ✅ owner | ❌ bloqueado | ❌ (view somente leitura) |
| Acesso anônimo | ❌ bloqueado | ❌ bloqueado | ❌ bloqueado | ❌ bloqueado |

### 3.2 Regra principal de cada tabela

Toda operação exige que `auth.uid()` corresponda ao `user_id` do `salao_config` cujo `id` é o `salao_id` da linha. Usuário não autenticado nunca passa.

---

## 4. Tabela de configuração do salão

```sql
create table if not exists public.salao_config (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null unique references auth.users(id) on delete cascade,
  nome_salao   text        not null,
  cor_primaria text        not null default '#ec4899',
  criado_em    timestamptz not null default now()
);
```

> Essa tabela é inserida com um único registro no momento da implantação, vinculando o `user_id` da dona ao salão. No MVP nunca terá mais de uma linha.

---

## 5. Habilitando RLS e criando as policies

Cole este bloco completo no **SQL Editor** do Supabase após criar as tabelas do ERD.

### 5.1 Habilitar RLS em todas as tabelas

```sql
alter table public.clientes      enable row level security;
alter table public.atendimentos  enable row level security;
alter table public.salao_config  enable row level security;
```

> **Atenção:** após habilitar o RLS, toda query sem policy retorna zero linhas — não retorna erro. Se os dados "sumirerem" durante testes, confirme que as policies estão criadas e que o usuário está autenticado.

---

### 5.2 Policies — tabela `clientes`

O filtro `salao_id = (SELECT id FROM public.salao_config WHERE user_id = auth.uid())` garante que a dona só enxerga e modifica as clientes do próprio salão.

```sql
-- SELECT: dona lê todas as suas clientes
create policy "owner pode ler clientes"
  on public.clientes
  for select
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

-- INSERT: dona cadastra novas clientes
create policy "owner pode inserir clientes"
  on public.clientes
  for insert
  to authenticated
  with check (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

-- UPDATE: dona edita dados de clientes existentes
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

-- DELETE: dona pode remover uma cliente
create policy "owner pode deletar clientes"
  on public.clientes
  for delete
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );
```

---

### 5.3 Policies — tabela `atendimentos`

```sql
-- SELECT: dona lê todos os atendimentos
create policy "owner pode ler atendimentos"
  on public.atendimentos
  for select
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

-- INSERT: dona registra novo atendimento
create policy "owner pode inserir atendimentos"
  on public.atendimentos
  for insert
  to authenticated
  with check (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );

-- UPDATE: dona corrige um atendimento (ex.: data errada)
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

-- DELETE: dona remove um atendimento lançado por engano
create policy "owner pode deletar atendimentos"
  on public.atendimentos
  for delete
  to authenticated
  using (
    salao_id = (select id from public.salao_config where user_id = auth.uid())
  );
```

---

### 5.4 Policies — tabela `salao_config`

```sql
-- SELECT: dona lê a config do próprio salão
create policy "owner pode ler sua config"
  on public.salao_config
  for select
  to authenticated
  using (user_id = auth.uid());

-- UPDATE: dona pode atualizar nome ou cor do salão
create policy "owner pode atualizar sua config"
  on public.salao_config
  for update
  to authenticated
  using    (user_id = auth.uid())
  with check (user_id = auth.uid());

-- INSERT e DELETE: bloqueados via policy (só o implantador insere, via service_role)
-- Não criar policies de insert/delete aqui é suficiente — RLS bloqueia por padrão.
```

---

### 5.5 Policy — view `clientes_status`

A view usa `security_invoker = true`, então o RLS das tabelas base (`clientes` e `atendimentos`) é avaliado no contexto de quem consulta — não do criador da view. Nenhuma policy extra é necessária.

```sql
-- Já declarado na criação da view (ver ERD.md seção 5):
create or replace view public.clientes_status
  with (security_invoker = true)
as
-- ...
```

---

### 5.6 Policy — formulário público (`/api/cadastro-publico`)

O formulário público usa a **chave `service_role`** no servidor (API Route do Next.js) para bypassar o RLS e inserir clientes sem autenticação. O isolamento é garantido pelo código da API:

1. Valida o `salaoId` recebido contra `salao_config` — garante que só salões existentes recebam cadastros
2. Insere `salao_id` explicitamente — sem defaultar ao primeiro salão
3. Deduplica por `(whatsapp, salao_id)` antes de inserir

> A `service_role` key **nunca vai para o frontend** — fica apenas em `process.env.SUPABASE_SERVICE_ROLE_KEY` (sem prefixo `NEXT_PUBLIC_`), acessível somente pelas API Routes no servidor.

---

## 6. Chaves de API — o que usar onde

| Chave | Nome no painel | Onde usar | O que pode fazer |
|-------|---------------|-----------|-----------------|
| `anon` | `anon public` | **Frontend** (código público) | Só o que as policies permitem para `authenticated` ou `anon` |
| `service_role` | `service_role secret` | **Servidor** — API Routes do Next.js | Bypassa o RLS completamente — acesso irrestrito |

### Regras obrigatórias

- A `service_role` key **jamais** deve aparecer em variáveis de ambiente públicas (`NEXT_PUBLIC_*`) ou no repositório GitHub.
- O frontend usa **exclusivamente a chave `anon`** combinada com o token de sessão do usuário autenticado.
- A `service_role` é usada nos API Routes do servidor (ex.: `/api/cadastro-publico`) e no script de implantação.

---

## 7. Script completo de implantação

Execute este script uma única vez ao entregar o sistema para um novo salão. Substitua os valores em `< >`.

```sql
-- Passo 1: criar o usuário no Supabase Auth
-- (via painel do Supabase → Authentication → Add user)
-- ou via script usando a service_role key na API de admin

-- Passo 2: inserir a config do salão
-- (execute com a service_role key no SQL Editor)
insert into public.salao_config (user_id, nome_salao, cor_primaria)
values (
  '<uuid-do-usuario-criado-no-auth>',
  '<Nome do Salão>',
  '<#hexcor-primaria>'   -- ex.: '#ec4899' para rosa
);

-- O id gerado automaticamente é o salao_id que será usado em
-- todas as policies e no formulário público (URL: /cadastro/<salao_id>)
```

---

## 8. Preparação para multi-tenant (pós-MVP)

> **Nota:** a coluna `salao_id` já foi adicionada em `clientes` e `atendimentos` durante a Fase 1 como parte do hardening de segurança do RLS. Isso adianta parte do trabalho da Fase 2.

Quando o sistema evoluir para SaaS, as policies já estão no padrão correto. O que muda na Fase 2:

```
Adicionar tabela saloes (substitui salao_config)
  → migrar dados de salao_config para saloes
  → trocar FK de salao_id de salao_config para saloes
  → adicionar onboarding self-service (criar salão sem implantador)
  → desativar projetos individuais e migrar dados para projeto central
```

As policies **não precisam mudar de padrão** — já usam `salao_id` como filtro. Apenas a subquery muda de `salao_config` para `saloes`.

---

## 9. Checklist de segurança — antes de entregar o sistema

Use esta lista antes de entregar cada implantação para um salão.

- [ ] RLS habilitado nas três tabelas (`clientes`, `atendimentos`, `salao_config`)
- [ ] Todas as policies criadas e testadas com o usuário da dona
- [ ] Registro em `salao_config` inserido com o `user_id` correto
- [ ] Chave `anon` usada no frontend; chave `service_role` ausente de variáveis `NEXT_PUBLIC_*`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada no Vercel (sem prefixo `NEXT_PUBLIC_`) para o `/api/cadastro-publico`
- [ ] Variáveis de ambiente do Vercel configuradas (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Testado: usuário não autenticado não consegue ler nenhuma tabela
- [ ] Testado: usuário autenticado (a dona) consegue criar cliente, registrar atendimento e ver a lista com status
- [ ] Testado: formulário público (`/cadastro/<salao_id>`) insere cliente com `salao_id` correto

---

## 10. Resumo das decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Isolamento entre salões | Projetos Supabase separados + `salao_id` nas tabelas | Deploy isolado no MVP; `salao_id` prepara multi-tenant sem big-bang |
| Padrão das policies | `salao_id = (SELECT id FROM salao_config WHERE user_id = auth.uid())` | Filtra a linha diretamente, sem JOIN — mais performático e correto |
| Número de papéis | 1 (`owner`) | MVP tem apenas um usuário por salão; múltiplos papéis fora de escopo |
| Mecanismo de auth | Supabase Auth e-mail + senha | Já integrado ao Supabase; sem dependência externa |
| Quem cria a conta da dona | Implantador (você) | Controle sobre quem tem acesso; dona não precisa entender o processo |
| Acesso à view `clientes_status` | Herança via `security_invoker = true` | Sem duplicação de policies; RLS das tabelas base aplicado automaticamente |
| Proteção da `service_role` | Nunca em variáveis `NEXT_PUBLIC_*` | Chave bypassa RLS — exposição seria vulnerabilidade crítica |
| Formulário público | API Route com `service_role` no servidor | Clientes se cadastram sem conta; segurança garantida pela validação do `salaoId` no servidor |
