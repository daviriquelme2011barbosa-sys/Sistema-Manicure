# RBAC/RLS — Permissões e Regras de Acesso

**Versão:** 1.0 (MVP)
**Banco:** Supabase (PostgreSQL)
**Última atualização:** 10/06/2026

---

## 1. Contexto e modelo de acesso

### Modelo de implantação do MVP

Cada salão recebe sua **própria instância do sistema** — um projeto Supabase dedicado com banco de dados isolado. Não existe compartilhamento de dados entre salões nesta fase (isso vem com o SaaS multi-tenant, seção 7).

Consequência direta: o problema de isolamento entre salões já está resolvido pela arquitetura (projetos separados), não pelo RLS. O RLS neste MVP tem uma responsabilidade mais simples: **garantir que só a dona autenticada acesse e modifique os dados do seu próprio salão**.

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
6. O RLS usa auth.uid() para validar se o usuário tem acesso à linha
```

O cadastro da conta da dona é feito **por você (implantador)** no momento da entrega do sistema — ela não se auto-cadastra. Isso mantém controle sobre quem tem acesso.

---

## 3. Matriz de permissões

### 3.1 Por operação e tabela

| Operação | `clientes` | `atendimentos` | `clientes_status` (view) |
|----------|:----------:|:--------------:|:------------------------:|
| SELECT | ✅ owner | ✅ owner | ✅ owner |
| INSERT | ✅ owner | ✅ owner | ❌ (view somente leitura) |
| UPDATE | ✅ owner | ✅ owner | ❌ (view somente leitura) |
| DELETE | ✅ owner | ✅ owner | ❌ (view somente leitura) |
| Acesso anônimo | ❌ bloqueado | ❌ bloqueado | ❌ bloqueado |

### 3.2 Regra principal de cada tabela

Toda operação exige que `auth.uid()` seja igual ao `user_id` da dona — armazenado em uma tabela de configuração do salão (ver seção 4). Usuário não autenticado nunca passa.

---

## 4. Tabela de configuração do salão

Para que o RLS funcione com `auth.uid()`, é necessária uma tabela que vincule o projeto ao usuário dono. Ela também guarda as configurações visuais do salão (nome, cor).

```sql
-- =========================
-- Tabela: salao_config
-- =========================
create table if not exists public.salao_config (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  nome_salao  text not null,
  cor_primaria text not null default '#ec4899',  -- rosa padrão
  criado_em   timestamptz not null default now()
);
```

> Essa tabela é inserida com um único registro no momento da implantação, vinculando o `user_id` da dona ao salão. No MVP nunca terá mais de uma linha.

---

## 5. Habilitando RLS e criando as policies

Cole este bloco completo no **SQL Editor** do Supabase após criar as tabelas do ERD.

### 5.1 Habilitar RLS em todas as tabelas

```sql
-- Habilita RLS (nenhum acesso liberado por padrão após este comando)
alter table public.clientes      enable row level security;
alter table public.atendimentos  enable row level security;
alter table public.salao_config  enable row level security;
```

> **Atenção:** após habilitar o RLS, toda query sem policy retorna zero linhas — não retorna erro. Se os dados "sumirerem" durante testes, confirme que as policies estão criadas e que o usuário está autenticado.

---

### 5.2 Policies — tabela `clientes`

```sql
-- SELECT: dona lê todas as suas clientes
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

-- INSERT: dona cadastra novas clientes
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

-- UPDATE: dona edita dados de clientes existentes
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

-- DELETE: dona pode remover uma cliente
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
    exists (
      select 1 from public.salao_config
      where user_id = auth.uid()
    )
  );

-- INSERT: dona registra novo atendimento
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

-- UPDATE: dona corrige um atendimento (ex.: data errada)
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

-- DELETE: dona remove um atendimento lançado por engano
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

A view herda as policies das tabelas base (`clientes` e `atendimentos`). Nenhuma policy extra é necessária. O Supabase avalia o RLS nas tabelas subjacentes quando a view é consultada — se o usuário não tiver acesso às tabelas, não terá acesso à view.

> Confirme que a view foi criada com `security_invoker = true` (padrão no Supabase). Isso garante que o RLS das tabelas base seja aplicado ao contexto de quem consulta, não ao contexto de quem criou a view.

```sql
-- Opcional mas recomendado: declarar explicitamente security_invoker
create or replace view public.clientes_status
  with (security_invoker = true)
as
-- ... (mesmo SQL do ERD)
```

---

## 6. Chaves de API — o que usar onde

O Supabase gera duas chaves para cada projeto. Usá-las errado é a vulnerabilidade mais comum.

| Chave | Nome no painel | Onde usar | O que pode fazer |
|-------|---------------|-----------|-----------------|
| `anon` | `anon public` | **Frontend** (código público) | Só o que as policies permitem para `authenticated` ou `anon` |
| `service_role` | `service_role secret` | **Nunca no frontend** — só em scripts de implantação ou funções server-side | Bypassa o RLS completamente — acesso irrestrito |

### Regras obrigatórias

- A `service_role` key **jamais** deve aparecer no código do frontend, em variáveis de ambiente públicas (`NEXT_PUBLIC_*`, `VITE_*`) ou no repositório GitHub.
- O frontend usa **exclusivamente a chave `anon`** combinada com o token de sessão do usuário autenticado.
- A `service_role` é usada apenas no momento da implantação para criar o registro inicial em `salao_config` (vincular o `user_id` da dona ao salão).

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
```

---

## 8. Preparação para multi-tenant (pós-MVP)

Quando o sistema evoluir para SaaS, o modelo de RLS precisará mudar. Esta seção documenta a direção para facilitar a migração futura — não é necessário implementar agora.

### O que muda no banco

As tabelas `clientes` e `atendimentos` precisarão de uma coluna `salao_id` (FK para uma tabela `saloes`), e as policies passam a filtrar por ela:

```sql
-- Exemplo de policy futura (não implementar agora)
create policy "owner lê clientes do próprio salão"
  on public.clientes
  for select
  to authenticated
  using (
    salao_id in (
      select id from public.saloes
      where owner_id = auth.uid()
    )
  );
```

### O que não muda

A lógica de autenticação (Supabase Auth + JWT), a estrutura de `clientes` e `atendimentos` e o mecanismo de `auth.uid()` são os mesmos. A migração é incremental: adicionar coluna → backfill → trocar policies.

---

## 9. Checklist de segurança — antes de entregar o sistema

Use esta lista antes de entregar cada implantação para um salão.

- [ ] RLS habilitado nas três tabelas (`clientes`, `atendimentos`, `salao_config`)
- [ ] Todas as policies criadas e testadas com o usuário da dona
- [ ] Registro em `salao_config` inserido com o `user_id` correto
- [ ] Chave `anon` usada no frontend; chave `service_role` ausente do código
- [ ] Variáveis de ambiente do Vercel configuradas (`SUPABASE_URL` e `SUPABASE_ANON_KEY`)
- [ ] Nenhuma variável de ambiente prefixada com `NEXT_PUBLIC_` ou `VITE_` contém a `service_role`
- [ ] Testado: usuário não autenticado não consegue ler nenhuma tabela
- [ ] Testado: usuário autenticado (a dona) consegue criar cliente, registrar atendimento e ver a lista com status

---

## 10. Resumo das decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Isolamento entre salões | Projetos Supabase separados | MVP sem complexidade de multi-tenant; mais simples de implantar e manter |
| Número de papéis | 1 (`owner`) | MVP tem apenas um usuário por salão; múltiplos papéis fora de escopo |
| Mecanismo de auth | Supabase Auth e-mail + senha | Já integrado ao Supabase; sem dependência externa |
| Quem cria a conta da dona | Implantador (você) | Controle sobre quem tem acesso; dona não precisa entender o processo |
| Acesso à view `clientes_status` | Herança das policies das tabelas base | Sem duplicação de policies; `security_invoker = true` garante a herança |
| Proteção da `service_role` | Nunca no frontend | Chave bypassa RLS — exposição seria vulnerabilidade crítica |
