# Roadmap — Sistema de Gestão e Reativação de Clientes

**Versão:** 1.1
**Última atualização:** 12/06/2026
**Referências:** PRD v1.0 · ERD v1.1 · RBAC-RLS v1.1 · UX-Flow v1.0 · TEST-PLAN v1.0

---

## 1. Filosofia deste roadmap

Este documento organiza a evolução do sistema em fases. Cada fase tem um **gatilho de entrada** — uma condição do mundo real que justifica avançar — e um **critério de saída** — o sinal de que a fase cumpriu seu propósito.

Nenhuma fase começa apenas porque o tempo passou. A progressão é puxada por evidência, não empurrada por calendário.

> **Regra de ouro:** não construa a próxima fase enquanto a anterior não tiver o critério de saída confirmado. Adicionar feature sem validar a anterior é o caminho mais rápido para um produto que ninguém usa.

---

## 2. Visão das fases

```
[Fase 0]  Fundação e entrega             ✅ concluída
    ↓  gatilho: dona usa 2x/semana por conta própria
[Fase 1]  Consolidação do produto        🔄 em andamento
    ↓  gatilho: 5–8 salões pagando mensalidade
[Fase 2]  Plataforma (transição para SaaS)
    ↓  gatilho: custo de implantação manual vira gargalo
[Fase 3]  Expansão de valor (SaaS maduro)
```

---

## 3. Fase 0 — Fundação e entrega do MVP

**Status:** ✅ Concluída
**Modelo de negócio:** serviço replicável (implantação manual por salão)

### O que é

O menor sistema que prova valor: 3 telas, 2 tabelas, 1 usuário. Documentado inteiramente no conjunto PRD + ERD + RBAC-RLS + UX-Flow + TEST-PLAN.

### Escopo entregue

- ✅ Tela 1 — cadastro de atendimento com deduplicação por WhatsApp
- ✅ Tela 2 — lista de clientes com status verde/amarelo/vermelho
- ✅ Tela 3 — painel de reativação com link `wa.me` e mensagem pronta
- ✅ Autenticação via Supabase Auth (e-mail + senha, conta criada pelo implantador)
- ✅ RLS com papel único `owner`
- ✅ Deploy por projeto Supabase dedicado por salão
- ✅ Nome e cor do salão via `salao_config`
- ✅ Tema escuro / claro

### Gatilho de saída

A dona abre o sistema pelo menos **2x por semana sem ninguém pedir** — e relata que uma cliente voltou depois de receber a mensagem de reativação. Sem esses dois sinais, nada do que vem depois faz sentido.

---

## 4. Fase 1 — Consolidação do produto

**Status:** 🔄 Em andamento
**Pré-requisito:** critério de saída da Fase 0 confirmado com pelo menos 1 salão
**Modelo de negócio:** ainda serviço replicável — implantação manual, mensalidade por salão

Esta fase não muda a arquitetura. Ela aprofunda o valor do produto nos mesmos salões e reduz o atrito de implantação para novos clientes. O objetivo é chegar a **5–8 salões pagando mensalidade** — o gatilho definido no PRD para avaliar a migração para SaaS.

### 4.1 Edição de registros ✅

**Status:** implementado

**O que foi entregue:**
- Editar nome, WhatsApp e observações de uma cliente existente
- Regra de integridade: editar não duplica — deduplicação por `(whatsapp, salao_id)` mantida

**Impacto no banco:** nenhuma mudança de schema. Operação UPDATE coberta pelas policies do RBAC-RLS.

### 4.2 Recuperação de senha pela interface ✅

**Status:** implementado

**O que foi entregue:**
- Fluxo "Esqueci minha senha" na tela de login com três estados: formulário de e-mail → link enviado → redefinição de nova senha
- Usa `supabase.auth.resetPasswordForEmail()` com redirect para `/login`
- Evento `PASSWORD_RECOVERY` detectado via `onAuthStateChange` — exibe formulário de nova senha automaticamente
- Sempre exibe mensagem de sucesso independente do e-mail existir (não vaza informação)

### 4.3 Formulário público de cadastro ✅

**Status:** implementado (adiantado da Fase 2)

**O que foi entregue:**
- Página pública `/cadastro/[salaoId]` acessível sem autenticação
- A cliente preenche nome, WhatsApp, observações e consentimento LGPD
- API Route `/api/cadastro-publico` valida e insere com `service_role` no servidor
- Deduplicação por `(whatsapp, salao_id)` — cliente já cadastrada não duplica
- Rate limiting por IP (5 tentativas/minuto)
- Campo `origem = 'formulario'` marca clientes que se cadastraram sozinhas

**Nota técnica:** o `salao_id` foi adicionado em `clientes` e `atendimentos` como parte desta feature, adiantando o isolamento de dados previsto para a Fase 2. As policies de RLS foram reescritas para filtrar por `salao_id` em vez de apenas verificar autenticação.

### 4.4 Templates de mensagem variados

**Status:** pendente

**O que entra:**
- 3 a 5 templates predefinidos com diferentes tons (reativação, aniversário, promoção relâmpago)
- Seleção do template no painel de reativação antes de abrir o WhatsApp
- O `{nome}` continua sendo substituído automaticamente em todos os templates
- Templates não são editáveis pela dona nesta fase (isso vem na Fase 3)

**Impacto no banco:** nenhuma mudança de schema. Templates vivem no frontend como constantes configuráveis.

### 4.5 Histórico de atendimentos por cliente

**Status:** pendente

**O que entra:**
- Página de detalhe da cliente: lista cronológica de todos os atendimentos com data, serviço, horário e preço
- Botão "Novo atendimento" já pré-preenchido com o nome da cliente

**Impacto no banco:** nenhuma mudança de schema. É uma query `SELECT WHERE cliente_id = X ORDER BY data_atendimento DESC`.

### 4.6 Lembretes semanais para a dona

**Status:** pendente

**O que entra:**
- E-mail automático toda segunda-feira com o resumo: "Você tem X clientes sumidas"
- Link direto para a Tela 3 no e-mail
- Implementado via Supabase Edge Function + cron job semanal

**O que não entra:** push notification ou SMS — o e-mail é suficiente e mais simples de implementar e manter.

### Critério de saída da Fase 1

**5 a 8 salões** com mensalidade ativa e pelo menos 3 deles com uso consistente (abertura 2x/semana por 30 dias seguidos). Esse é o gatilho do PRD para avaliar a transição para SaaS.

---

## 5. Fase 2 — Plataforma (transição para SaaS)

**Pré-requisito:** 5–8 salões pagando mensalidade (critério de saída da Fase 1)
**Modelo de negócio:** início da transição de serviço replicável para SaaS multi-tenant

Esta é a fase de maior risco técnico. A arquitetura muda de "um projeto Supabase por salão" para "todos os salões no mesmo projeto".

### 5.1 Migração para multi-tenant

**Nota:** `salao_id` já foi adicionado em `clientes` e `atendimentos` na Fase 1. As policies já filtram por `salao_id`. O que resta na Fase 2:

```
Criar tabela saloes (substitui salao_config)
  → migrar dados de salao_config para saloes
  → trocar FK de salao_id para referenciar saloes em vez de salao_config
  → reescrever policies trocando a subquery de salao_config para saloes
  → desativar projetos individuais e migrar dados para projeto central
```

**Estratégia de migração:** incremental e reversível. Nunca migração big-bang.

**O que não muda:** lógica de autenticação (Supabase Auth + JWT), estrutura das tabelas `clientes` e `atendimentos`, mecanismo de `auth.uid()`, padrão das policies.

### 5.2 Onboarding self-service

**O que entra:**
- Tela de cadastro de novo salão (nome, cor primária, e-mail, senha)
- Criação automática de conta no Supabase Auth + inserção em `saloes`
- Tela de boas-vindas com orientação de primeiros passos
- Cobrança integrada (link para pagamento recorrente — Stripe ou similar)

### 5.3 Configuração visual self-service

**O que entra:**
- Tela de configurações do salão: alterar nome e cor primária pela interface (sem implantador)
- Preview em tempo real da cor antes de salvar

### 5.4 Múltiplos usuários por salão (papéis básicos)

**O que entra:**
- Papel `staff` (funcionária): pode cadastrar atendimentos (Tela 1), mas não acessa reativação (Tela 3) nem configurações
- Papel `owner` (dona): acesso total — sem mudança em relação ao MVP
- Convite por e-mail para adicionar funcionária ao salão

**Impacto no banco:**
- Nova tabela `salao_membros (salao_id, user_id, papel)`
- Policies reescritas para considerar `papel` além de `owner_id`

### Critério de saída da Fase 2

Novo salão consegue se cadastrar, configurar e fazer o primeiro cadastro de cliente **sem nenhuma intervenção manual** do implantador. Tempo de onboarding < 10 minutos.

---

## 6. Fase 3 — Expansão de valor

**Pré-requisito:** onboarding self-service funcionando (critério de saída da Fase 2)
**Modelo de negócio:** SaaS maduro com planos diferenciados

### 6.1 Insights e relatórios básicos

**O que entra:**
- Painel com métricas simples: total de clientes ativas/atenção/sumidas, serviço mais realizado no mês, taxa de retorno após reativação
- Exportação da lista de clientes em CSV

### 6.2 Templates de mensagem editáveis pela dona

**O que entra:**
- Tela de gerenciamento de templates: criar, editar e excluir mensagens personalizadas
- Variáveis disponíveis: `{nome}`, `{servico}`, `{dias}` (dias sem aparecer)
- Preview da mensagem com valores reais antes de salvar

**Impacto no banco:** nova tabela `templates (id, salao_id, titulo, corpo, criado_em)`.

### 6.3 Agendamento básico

**O que entra:**
- Campo opcional "próximo agendamento" no cadastro de atendimento
- Alerta na lista quando o agendamento está chegando (3 dias antes)
- Não é um calendário completo — é só um lembrete de data futura vinculado à cliente

### 6.4 Planos diferenciados

| Plano | Público | Diferenciais |
|-------|---------|-------------|
| **Basic** | Manicure autônoma | Funcionalidades da Fase 0 + 1 |
| **Profissional** | Salão pequeno (até 3 funcionárias) | + Múltiplos usuários + Insights + Templates editáveis |
| **Master** | Salão médio | + Agendamento + Exportação + Suporte prioritário |

---

## 7. Itens fora do roadmap (decisão consciente)

Os itens abaixo foram considerados e deliberadamente excluídos de todas as fases. Revisitar apenas se houver demanda comprovada de múltiplos salões:

| Item | Motivo da exclusão |
|------|-------------------|
| App nativo (iOS/Android) | Web responsivo resolve o caso de uso; custo de manutenção de app nativo é alto demais para o estágio atual |
| Disparo automático de mensagens via WhatsApp API | Requer aprovação de conta Business e custo por mensagem; o envio manual preserva o tom humano que converte melhor |
| Controle financeiro e caixa | Fora do problema central (reativação); existem ferramentas dedicadas melhores para isso |
| Calendário completo de agendamentos | Alto custo de UX e desenvolvimento; o campo de "próximo agendamento" (Fase 3.3) resolve 80% do valor com 20% do esforço |
| Integração com Instagram / redes sociais | Distração do core; não resolve o problema de reativação |

---

## 8. Dependências técnicas entre fases

Algumas decisões tomadas na Fase 0/1 foram feitas conscientemente para não travar as fases seguintes:

| Decisão | Por que facilita as fases seguintes |
|---------|-------------------------------------|
| Status calculado como view (não coluna) | Sem migração de dados ao mudar regra de negócio de status |
| `whatsapp` normalizado só dígitos | Deduplicação robusta que não quebra ao adicionar campo de país |
| `salao_config` com `user_id` FK | Estrutura análoga à tabela `saloes` do multi-tenant — migração incremental |
| `salao_id` em `clientes` e `atendimentos` (adiantado da Fase 2) | Policies já no padrão multi-tenant; migração será só trocar FK de `salao_config` para `saloes` |
| Policies filtram por `salao_id` diretamente | Isolamento correto desde agora; nenhuma reescrita de lógica na Fase 2 |
| Chave `anon` no frontend | Política de segurança já correta para ambiente multi-tenant |
| `origem` em `clientes` | Dados de canal já coletados; permite segmentação futura sem migração |

---

## 9. Resumo visual das fases

```
FASE 0 — MVP ✅ concluída
├── 3 telas: cadastro · lista · reativação
├── Tema escuro / claro
├── 1 usuário por salão
├── 1 projeto Supabase por salão
└── Implantação manual

    ↓ gatilho: hábito de uso + cliente voltou

FASE 1 — Consolidação (serviço replicável) 🔄 em andamento
├── ✅ Edição de clientes
├── ✅ Recuperação de senha pela interface
├── ✅ Formulário público de cadastro (QR code)
├── ⏳ Templates variados de mensagem
├── ⏳ Histórico de atendimentos por cliente
└── ⏳ Lembrete semanal por e-mail

    ↓ gatilho: 5–8 salões pagando mensalidade

FASE 2 — Plataforma (SaaS)
├── Migração multi-tenant (salao_id já pronto — só trocar FK)
├── Onboarding self-service
├── Configuração visual pela dona
└── Múltiplos usuários por salão (owner + staff)

    ↓ gatilho: onboarding sem intervenção manual

FASE 3 — Expansão (SaaS maduro)
├── Insights e relatórios
├── Templates editáveis pela dona
├── Agendamento básico
└── Planos diferenciados (Basic · Profissional · Master)
```
