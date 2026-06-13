# CLAUDE.md — Sistema de Gestão e Reativação de Clientes

> Leia este arquivo inteiro antes de qualquer ação. Ele é o contrato de como este projeto é construído.

---

## 1. O que é este projeto

Sistema web mobile-first para donas de salão/manicure pararem de perder clientes por esquecimento. O produto avisa quem sumiu e deixa um clique entre a dona e a mensagem de reativação no WhatsApp.

**Frase de posicionamento:** um sistema que avisa a dona do salão quem sumiu e deixa um clique entre ela e a mensagem de "saudade, bora marcar?".

---

## 2. Documentação obrigatória — leia antes de implementar qualquer feature

Todos os documentos vivem em `/docs`. Antes de construir qualquer coisa, leia o documento correspondente:

| Documento | Quando ler |
|-----------|-----------|
| `docs/PRD.md` | Antes de qualquer feature — define o problema, escopo e o que está FORA do MVP |
| `docs/ERD.md` | Antes de qualquer query ou migração de banco |
| `docs/RBAC-RLS.md` | Antes de qualquer operação no Supabase ou política de acesso |
| `docs/UX-Flow.md` | Antes de construir ou alterar qualquer tela |
| `docs/ROADMAP.md` | Antes de sugerir novas features — pode já estar planejado ou descartado |
| `docs/TEST-PLAN.md` | Antes de considerar qualquer feature pronta |
| `docs/README.md` | Visão geral do projeto e setup |

---

## 3. Stack — use exatamente isso, sem substituições

| Camada | Tecnologia | Observação |
|--------|-----------|------------|
| Frontend | Next.js (App Router) | Mobile-first obrigatório |
| Banco de dados | Supabase (PostgreSQL) | Com RLS habilitado — ver `docs/RBAC-RLS.md` |
| Autenticação | Supabase Auth | E-mail + senha — sem magic link no MVP |
| Hospedagem | Vercel | Deploy via GitHub |
| Versionamento | GitHub | |
| Estilização | Tailwind CSS | Sem bibliotecas de componentes externas no MVP |

**Não sugira nem instale:** Redux, Prisma, NextAuth, componentes de UI externos (shadcn, MUI, etc.), ORMs, ou qualquer outra camada de abstração não listada acima. Se sentir falta de algo, pergunte antes.

---

## 4. Estrutura de pastas esperada

```
/
├── app/                  # Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── clientes/     # Tela 2 — lista
│   │   ├── cadastro/     # Tela 1 — novo atendimento
│   │   └── reativar/     # Tela 3 — painel de reativação
│   └── layout.tsx
├── components/           # componentes reutilizáveis
├── lib/
│   └── supabase.ts       # cliente Supabase (somente chave anon)
├── docs/                 # todos os documentos do projeto
├── .env.local            # variáveis de ambiente (nunca commitar)
├── .env.example          # template das variáveis (commitar sem valores)
└── CLAUDE.md             # este arquivo
```

---

## 5. Banco de dados — regras críticas

### Tabelas existentes
- `clientes` — identidade da cliente (1 linha por cliente)
- `atendimentos` — histórico de visitas (N por cliente)
- `salao_config` — configuração do salão (1 linha por instância)
- `clientes_status` — VIEW calculada, nunca tabela

### Regras que nunca podem ser violadas

**1. Status nunca é coluna.** Verde/amarelo/vermelho é sempre calculado em tempo de leitura via `MAX(data_atendimento)`. Jamais salvar status no banco — ele ficaria estático e incorreto com o passar dos dias.

**2. WhatsApp sempre normalizado.** Antes de qualquer INSERT ou comparação, remover tudo que não for dígito: `whatsapp.replace(/\D/g, '')`. Isso garante a deduplicação funcionar independente de formatação.

**3. Deduplicação por WhatsApp.** Antes de criar um cliente novo, sempre verificar se já existe um com o mesmo número normalizado. Se existir: INSERT apenas em `atendimentos`. Se não existir: INSERT em `clientes` + INSERT em `atendimentos`.

**4. RLS habilitado sempre.** Nunca desabilitar RLS para "facilitar o desenvolvimento". Use o usuário autenticado correto nos testes.

**5. Chave `service_role` nunca no frontend.** Só a chave `anon` vai no código. A `service_role` é usada apenas em scripts de implantação locais, nunca no repositório.

### Variáveis de ambiente
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```
Nunca prefixar com `NEXT_PUBLIC_`. Nunca commitar valores reais.

---

## 6. Lógica de status — implementar exatamente assim

```
dias = hoje - MAX(data_atendimento) da cliente

dias <= 30        → verde   (ativa)
31 <= dias <= 60  → amarelo (atenção)
dias >= 61        → vermelho (sumida)
sem atendimento   → sem_atendimento (não entra na tela de reativação)
```

**Bordas críticas (testar sempre):**
- `dias = 30` → verde
- `dias = 31` → amarelo
- `dias = 60` → amarelo
- `dias = 61` → vermelho

---

## 7. Tela de reativação — como o link do WhatsApp funciona

```typescript
const diasSemVir = // calcular conforme seção 6
const mensagem = `Oi ${cliente.nome.split(' ')[0]}! 💅 Senti sua falta aqui no salão. Faz um tempinho que você não aparece — bora marcar um horário pra deixar essas unhas em dia? 😊`
const link = `https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(mensagem)}`
```

- Sempre usar `encodeURIComponent` — nomes com ç, acentos quebram o link sem isso.
- O número vai com `55` (DDI Brasil) prefixado.
- O envio é sempre manual (a dona aperta enviar dentro do WhatsApp).

---

## 8. Fora de escopo do MVP — não implementar

Se alguma dessas features for solicitada, recuse e mencione que está documentada no `docs/PRD.md` seção 10:

- Editar ou excluir clientes/atendimentos
- Agendamento ou calendário
- Controle financeiro
- Disparo automático de mensagens
- Múltiplos usuários por salão
- Relatórios/dashboards
- App nativo

---

## 9. Convenções de código

- **TypeScript** em todos os arquivos `.ts` e `.tsx`
- **Sem `any`** — tipar tudo corretamente
- **Funções pequenas** — uma responsabilidade por função
- **Nomes em português** para variáveis de domínio (`cliente`, `atendimento`, `ultimaVisita`), inglês para infraestrutura (`useEffect`, `useState`, `router`)
- **Comentários só quando necessário** — código legível dispensa comentário óbvio
- **Tratamento de erro obrigatório** em toda chamada ao Supabase — nunca deixar erro silencioso

---

## 10. UX — princípios inegociáveis

- **Mobile-first:** projetar para 375px primeiro, desktop depois
- **Botões com mínimo 44px de altura** (toque)
- **Linguagem do dia a dia:** "sumida", "mandar mensagem", "última visita" — nunca "inativar", "reengajamento", "status"
- **Feedback imediato:** toast em menos de 200ms após salvar
- **Nunca tela em branco:** skeleton enquanto carrega
- **Botão de salvar desabilitado durante envio** para evitar duplo clique
- **Toasts somem em 3 segundos** e não bloqueiam a interface

---

## 11. Antes de considerar qualquer tarefa pronta

Verifique no `docs/TEST-PLAN.md`:
- Os casos P1 da funcionalidade estão passando?
- As bordas de status (dias 30/31 e 60/61) foram testadas?
- A deduplicação foi testada com pelo menos dois formatos de número?
- O link do WhatsApp foi testado com nome que tem acento ou ç?
- RLS foi testado com usuário não autenticado (deve retornar lista vazia)?

---

## 12. Modelo de negócio (contexto para decisões)

Fase atual: serviço replicável, não SaaS. Cada salão tem seu próprio projeto Supabase e deploy no Vercel. O sistema é replicado manualmente para cada novo cliente. A transição para SaaS multi-tenant está documentada no `docs/ROADMAP.md` como Fase 2, com gatilho de 5–8 salões pagando mensalidade.

**Não arquitetar para multi-tenant agora.** As decisões do MVP foram tomadas conscientemente para não travar a migração futura — ver `docs/ROADMAP.md` seção 8.
