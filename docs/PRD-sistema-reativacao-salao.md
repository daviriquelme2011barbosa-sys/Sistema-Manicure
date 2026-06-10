# PRD — Sistema de Gestão e Reativação de Clientes para Salões/Manicures

**Versão:** 1.0 (MVP)
**Status:** Rascunho para validação
**Última atualização:** 10/06/2026

---

## 1. Visão geral

Sistema web simples para que donas de salão e manicures parem de perder clientes por esquecimento. O produto centraliza o cadastro de atendimentos, mostra visualmente quem está sumindo e facilita a reativação via WhatsApp com um clique.

O foco do MVP não é "ser um sistema completo de gestão de salão". É resolver **uma dor específica e cara**: cliente que some sem ninguém perceber. Tudo que não serve diretamente a esse fluxo fica fora do escopo desta versão.

### Frase de posicionamento

> Um sistema que avisa a dona do salão **quem sumiu** e deixa **um clique** entre ela e a mensagem de "saudade, bora marcar?".

---

## 2. O problema

A dona de salão/manicure perde clientes porque não tem visibilidade de quem deixou de aparecer e não tem um jeito organizado de retomar contato.

Hoje ela gerencia tudo no **WhatsApp e no caderno**. Isso gera três falhas:

- **Sem histórico confiável** — não dá pra saber quando foi a última vez que a cliente veio.
- **Sem visibilidade** — não existe nenhuma sinalização de "essa cliente está sumindo".
- **Sem reativação** — mesmo querendo chamar a cliente de volta, o contato é manual, desorganizado e por isso quase nunca acontece.

A raiz do problema é **esquecimento e desorganização — não falta de vontade**. A dona quer reter clientes; ela só não tem a ferramenta que transforma vontade em ação no dia a dia corrido do salão.

---

## 3. Objetivos e métricas de sucesso

O sucesso deste MVP é comportamental, não de funcionalidades. O produto venceu se a dona **usar sozinha, por hábito**.

| Nível | Sinal de sucesso | Como medir |
|-------|------------------|------------|
| **Primário** | A dona abre o sistema pelo menos **2x por semana** sem ninguém pedir | Logins/acessos por semana |
| **Secundário** | Ela manda mensagem para **pelo menos 1 cliente sumida** usando o sistema | Cliques no botão de reativação |
| **Forte (validação real)** | Ela relata: *"fulana voltou depois que eu mandei mensagem"* | Feedback qualitativo / cliente que volta ao status verde |

**Anti-métrica (cuidado):** número de telas ou de funcionalidades. Adicionar feature que não serve ao fluxo cadastro → ver quem sumiu → mandar mensagem é sinal de desvio de foco.

---

## 4. Usuários

### Persona principal — A dona do salão / manicure autônoma

- Gerencia o próprio negócio, atende durante o dia, tem pouco tempo.
- Não é técnica. Usa WhatsApp com fluência, mas não quer "aprender um sistema complicado".
- Trabalha muitas vezes pelo celular.
- Decisão de compra é dela mesma. Sensível a preço, mas paga por algo que comprovadamente traz cliente de volta.

### Implicações de design

- Interface tem que ser **óbvia em 5 segundos**. Sem treinamento.
- **Mobile-first** é obrigatório (ela vai usar muito pelo celular).
- Toques grandes, textos legíveis, fluxo curto.
- Linguagem do dia a dia ("sumida", "voltou"), não jargão técnico.

---

## 5. Escopo do MVP — as 3 telas

O MVP é o menor conjunto que prova valor. Três telas resolvem o fluxo completo.

### Fluxo principal

```
Atendimento acontece
   │
   ▼
[Tela 1] Dona cadastra a cliente / atualiza o atendimento
   │
   ▼ (durante a semana)
[Tela 2] Dona abre a lista e vê quem está sumindo (status colorido)
   │
   ▼
[Tela 3] Painel de reativação: clica → abre WhatsApp com mensagem pronta
   │
   ▼
Cliente volta → próximo atendimento volta pra Tela 1
```

---

### Tela 1 — Cadastro do cliente

**Objetivo:** registrar um atendimento em segundos, sem duplicar clientes.

**Campos:**

| Campo | Tipo | Obrigatório | Observação |
|-------|------|:-----------:|------------|
| Nome | texto | Sim | |
| WhatsApp | texto/telefone | Sim | Serve como identificador único da cliente |
| Serviço feito | texto ou seleção | Sim | Ex.: manicure, pé, alongamento |
| Data do atendimento | data | Sim | Default: hoje |
| Observações | texto longo | Não | Preferências, alergias, etc. |

**Regra crítica — deduplicação:**
Se já existe uma cliente com aquele **número de WhatsApp**, o sistema **atualiza o histórico** dela (adiciona um novo atendimento) em vez de criar uma cliente duplicada. O número é a chave de identidade.

**Critérios de aceite:**
- Cadastrar uma cliente nova em menos de 30 segundos.
- Cadastrar um atendimento de cliente já existente atualiza a "última visita" e mantém o histórico anterior.
- Telefone é normalizado (remove espaços, traços, parênteses) antes de comparar, para não criar duplicata por causa de formatação.

---

### Tela 2 — Lista de clientes

**Objetivo:** dar visibilidade imediata de quem está em dia e quem está sumindo.

**Conteúdo:**
- Lista de **todas** as clientes.
- Cada cliente exibe **status visual por cor** (ver seção 6).
- **Busca por nome.**
- **Filtros rápidos** por status (ex.: "só ver sumidas").

**Ordenação sugerida:** sumidas (vermelho) no topo por padrão, para que a ação de reativação salte aos olhos.

**Critérios de aceite:**
- A cor de cada cliente reflete corretamente os dias desde o último atendimento.
- Buscar por parte do nome filtra a lista em tempo real.
- Filtro de status mostra só o grupo escolhido.

---

### Tela 3 — Painel de reativação

**Objetivo:** transformar "essa cliente sumiu" em "mensagem enviada" com um clique.

**Conteúdo:**
- Lista das clientes **sumidas (vermelho) no topo**, como prioridade.
- Botão que **abre o WhatsApp já com uma mensagem personalizada e pronta** (nome da cliente preenchido).

**Mecanismo:** o botão usa link `https://wa.me/<numero>?text=<mensagem>` para abrir a conversa direto no WhatsApp da dona, com o texto pré-escrito. A dona só revisa e aperta enviar.

**Exemplo de mensagem template:**
> Oi {nome}! 💅 Senti sua falta aqui no salão. Faz um tempinho que você não aparece — bora marcar um horário pra deixar essas unhas em dia? 😊

**Critérios de aceite:**
- Clicar no botão abre o WhatsApp com o número certo e o texto preenchido com o nome da cliente.
- A mensagem é editável antes de enviar (o envio final é manual, dentro do WhatsApp).

---

## 6. Lógica de status das clientes

O status é calculado pelo número de dias desde o **último atendimento**.

| Status | Cor | Regra | Significado |
|--------|-----|-------|-------------|
| Ativa | 🟢 Verde | Atendida nos **últimos 30 dias** | Em dia, tudo certo |
| Atenção | 🟡 Amarelo | **31 a 60 dias** sem aparecer | Começando a sumir — fique de olho |
| Sumida | 🔴 Vermelho | **Mais de 60 dias** | Prioridade de reativação |

**Notas de implementação:**
- O status é **derivado** (calculado na hora a partir da data do último atendimento), não armazenado fixo — assim ele se atualiza sozinho com a passagem do tempo.
- Recomenda-se calcular `dias = hoje - data_ultimo_atendimento` e mapear para a faixa.
- Cuidado com os limites: 30 dias exatos = verde; 31 = amarelo; 60 = amarelo; 61 = vermelho. (Defina e documente a borda para não dar ambiguidade.)

---

## 7. Requisitos não-funcionais

- **Mobile-first:** a dona usa muito pelo celular. Layout responsivo é prioridade, não enfeite.
- **Simplicidade:** zero curva de aprendizado. Se precisa de manual, falhou.
- **Performance:** lista e busca instantâneas para volumes realistas (centenas de clientes por salão).
- **Multi-tenant simples (por enquanto):** no modelo atual cada salão tem sua própria instância/deploy com nome e cores próprios. Não precisa de isolamento de múltiplos salões no mesmo banco ainda.
- **Personalização visual:** nome e cores do salão configuráveis (mesmo que seja via variáveis/config no deploy nesta fase).
- **Confiabilidade dos dados:** não perder histórico; deduplicação correta por telefone.

---

## 8. Modelo de dados (proposta para Supabase)

Modelo mínimo que sustenta as 3 telas e o cálculo de status.

### Tabela `clientes`

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | uuid (PK) | gerado automaticamente |
| `nome` | text | obrigatório |
| `whatsapp` | text | **único** — chave de deduplicação (armazenar normalizado, só dígitos) |
| `observacoes` | text | opcional |
| `criado_em` | timestamptz | default now() |

### Tabela `atendimentos`

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | uuid (PK) | |
| `cliente_id` | uuid (FK → clientes.id) | |
| `servico` | text | |
| `data_atendimento` | date | |
| `criado_em` | timestamptz | default now() |

**Por que separar `clientes` e `atendimentos`:**
Permite manter **histórico** (vários atendimentos por cliente) e calcular a "última visita" como `MAX(data_atendimento)` — que alimenta o status colorido. Cadastrar um atendimento de cliente existente vira simplesmente inserir uma linha em `atendimentos`.

**Status como view/cálculo:**
O status (verde/amarelo/vermelho) **não vira coluna**. Calcule a partir de `MAX(data_atendimento)` por cliente, seja numa view SQL, seja no frontend. Assim ele nunca fica desatualizado.

> Observação de segurança: ao habilitar RLS (Row Level Security) no Supabase, defina as policies de acordo com como a autenticação será feita por salão. Para o modelo de uma instância por salão, isso pode ser simples, mas vale decidir cedo.

---

## 9. Stack técnica

Alinhada ao que você já planejou:

- **Editor / IDE:** VS Code
- **Assistente de código:** Claude Code
- **Backend / Banco / Auth:** Supabase (Postgres)
- **Versionamento:** GitHub
- **Deploy / Hospedagem:** Vercel
- **Frontend:** (a definir — sugestão: framework que integra bem com Vercel + Supabase, com foco em mobile-first)

Este PRD em Markdown deve viver **dentro do repositório** (ex.: `/docs/PRD.md`) para servir de contexto ao Claude Code durante o desenvolvimento.

---

## 10. Fora de escopo (MVP)

Explicitamente **não** entra nesta versão — registrar aqui evita "scope creep":

- Agendamento / calendário de horários.
- Controle financeiro, caixa, comissões.
- Disparo automático de mensagens (o envio é sempre manual, dentro do WhatsApp).
- App nativo (iOS/Android). É web responsivo.
- Múltiplos usuários/funcionários por salão com permissões.
- Relatórios e dashboards analíticos avançados.
- SaaS multi-tenant de verdade (vem depois — ver seção 12).

Cada item acima pode ser ótimo no futuro. Colocá-los agora atrasaria a prova de valor.

---

## 11. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Dona não cria o hábito de cadastrar atendimentos | Sem dados, status fica errado e o sistema perde valor | Cadastro ultra-rápido; possível lembrete; acompanhamento próximo nas primeiras semanas |
| Duplicação de clientes por telefone mal formatado | Histórico fragmentado, status incorreto | Normalizar telefone (só dígitos) antes de salvar/comparar |
| Mensagem de reativação parecer "robótica" | Cliente não responde | Template editável e com tom humano; nome preenchido |
| Excesso de funcionalidades pedidas pela dona | Perda de foco | Manter este PRD como referência do escopo |

---

## 12. Modelo de negócio

Fase atual: **serviço replicável**, ainda **não SaaS**.

- **Taxa de implantação:** R$ 300–600 (cobrada uma vez por salão).
- **Mensalidade de suporte e manutenção:** R$ 80–150.
- **Replicação:** cada cliente novo é basicamente o mesmo sistema com **nome e cores do salão** diferentes.
- **Gatilho para virar SaaS:** quando houver **5 a 8 clientes pagando mensalidade**, aí sim avaliar construir um SaaS multi-tenant de verdade.

Essa abordagem reduz risco: você valida demanda e fluxo de caixa antes de investir na complexidade de um produto SaaS.

---

## 13. Roadmap pós-MVP (direcional)

Não comprometido — apenas direção, a ser confirmada pela validação:

1. **Templates de mensagem variados** (aniversário, promoção, retorno).
2. **Configuração visual self-service** (a dona escolhe nome/cores sem precisar de você).
3. **Multi-tenant** (vários salões na mesma base) — pré-requisito do SaaS.
4. **Histórico/insights** (qual serviço traz mais retorno, frequência média).
5. **Lembretes automáticos** para a dona ("3 clientes ficaram vermelhas esta semana").

---

## Apêndice — Glossário

- **Cliente sumida:** quem está há mais de 60 dias sem atendimento (status vermelho).
- **Reativação:** ação de chamar de volta uma cliente sumida via WhatsApp.
- **Última visita:** data do atendimento mais recente da cliente; base do cálculo de status.
- **Multi-tenant:** arquitetura em que vários salões compartilham a mesma aplicação/base de dados com isolamento de dados.
