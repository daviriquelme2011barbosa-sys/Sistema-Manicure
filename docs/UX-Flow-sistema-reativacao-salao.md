# Fluxo UX — Sistema de Gestão e Reativação de Clientes

**Versão:** 1.0 (MVP)
**Última atualização:** 10/06/2026

Este documento descreve a jornada completa da dona do salão dentro do sistema — do login ao clique de reativação. Serve como referência de comportamento esperado para cada tela e estado de interface.

---

## 1. Visão geral da jornada

O fluxo do MVP tem um caminho principal e é intencionalmente linear. Não há menu complexo nem múltiplos caminhos para a mesma ação.

```
[Login]
   ↓
[Tela 2 — Lista de clientes]  ←── ponto de entrada após login
   ├──→ [Tela 1 — Cadastro]   (nova cliente ou novo atendimento)
   └──→ [Tela 3 — Reativação] (clientes sumidas)
         ↓
      [WhatsApp abre com mensagem pronta]
         ↓
      [Cliente volta → próximo cadastro fecha o ciclo]
```

**Ponto de entrada padrão:** a dona cai sempre na Tela 2 (lista) ao fazer login. É ali que ela vê o panorama do dia e decide o que fazer.

---

## 2. Tela de login

### Objetivo
Autenticar a dona antes de qualquer acesso aos dados.

### Comportamento esperado

| Situação | O que acontece |
|----------|---------------|
| Credenciais corretas | Redireciona direto para Tela 2 (lista de clientes) |
| Credenciais incorretas | Mensagem de erro inline: "E-mail ou senha incorretos" — sem revelar qual dos dois está errado |
| Campo vazio ao submeter | Validação inline antes de chamar a API: "Preencha o e-mail" / "Preencha a senha" |
| Sessão ativa (já logada) | Redireciona direto para Tela 2 sem pedir login novamente |
| Sessão expirada | Redireciona para o login com aviso: "Sua sessão expirou, faça login novamente" |

### Notas de implementação
- Usar Supabase Auth com e-mail + senha.
- O token de sessão é gerenciado pelo SDK do Supabase (não implementar manualmente).
- Não há botão de "cadastre-se" — a conta da dona é criada pelo implantador.
- Não há "esqueci minha senha" no MVP — recuperação é feita manualmente pelo implantador via painel Supabase. (Avaliar incluir na próxima versão.)

---

## 3. Tela 1 — Cadastro de atendimento

### Objetivo
Registrar um atendimento em segundos, sem criar duplicatas de clientes.

### Campos do formulário

| Campo | Tipo | Obrigatório | Comportamento |
|-------|------|:-----------:|---------------|
| Nome | texto | Sim | Livre |
| WhatsApp | telefone | Sim | Normalizado antes de comparar (ver abaixo) |
| Serviço | texto ou select | Sim | Sugestões predefinidas + opção livre |
| Data do atendimento | date | Sim | Default: hoje (`current_date`) |
| Observações | textarea | Não | Preferências, alergias, etc. |

### Fluxo de submissão — lógica de deduplicação

```
1. Dona clica em "Salvar"
2. Frontend normaliza o WhatsApp (remove tudo que não seja dígito)
3. Busca em clientes WHERE whatsapp = <número normalizado>
   ├── Encontrou → INSERT em atendimentos (cliente_id existente)
   │              → Toast: "Atendimento adicionado para [Nome]"
   └── Não encontrou → INSERT em clientes + INSERT em atendimentos
                      → Toast: "Cliente [Nome] cadastrada com sucesso"
4. Redireciona para Tela 2 (lista)
```

### Normalização do WhatsApp

Antes de qualquer comparação ou armazenamento, o número passa por strip de caracteres não numéricos:

```
"(38) 99999-1234"  →  "38999991234"
"38 99999 1234"    →  "38999991234"
"+55 38 99999-1234" →  "5538999991234"
```

A regra é simples: guardar e comparar **só os dígitos**. Se duas entradas produzem a mesma string de dígitos, são a mesma pessoa.

### Estados de erro

| Erro | Mensagem exibida |
|------|-----------------|
| Nome vazio | "Informe o nome da cliente" |
| WhatsApp vazio | "Informe o WhatsApp" |
| WhatsApp com menos de 10 dígitos | "Número inválido — confira o WhatsApp" |
| Serviço vazio | "Selecione ou descreva o serviço" |
| Erro de rede / banco | "Não foi possível salvar. Tente novamente." |

### Critérios de aceite
- Cadastrar cliente nova em menos de 30 segundos (do primeiro campo ao toast de sucesso).
- Cadastrar atendimento de cliente existente não duplica a linha em `clientes`.
- A data default é sempre hoje — a dona só altera se quiser corrigir um registro retroativo.
- Após salvar, o status da cliente na Tela 2 já reflete o novo atendimento.

---

## 4. Tela 2 — Lista de clientes

### Objetivo
Dar visibilidade imediata de quem está em dia e quem está sumindo.

### Estrutura da tela

```
[Barra superior]
  Nome do salão · Botão "+ Novo atendimento" · Botão "Reativar"

[Campo de busca]
  Busca por nome em tempo real

[Filtros rápidos]
  Todos · Ativas (verde) · Atenção (amarelo) · Sumidas (vermelho)

[Lista de clientes]
  ● [badge cor] Nome da cliente
    Última visita: dd/mm/aaaa · X dias atrás · Serviço: manicure
```

### Lógica de status (calculado, nunca armazenado)

| Dias desde último atendimento | Status | Badge |
|-------------------------------|--------|-------|
| 0 a 30 | Ativa | 🟢 verde |
| 31 a 60 | Atenção | 🟡 amarelo |
| 61 ou mais | Sumida | 🔴 vermelho |
| Sem nenhum atendimento | — | cinza (não entra na reativação) |

**Importante:** o status é recalculado a cada carregamento de página ou atualização da lista. Nunca é um campo salvo no banco.

### Ordenação padrão
Sumidas (vermelho) → Atenção (amarelo) → Ativas (verde). Dentro de cada grupo, ordenar por `dias_desde_ultima_visita` decrescente (a que sumiu há mais tempo aparece primeiro).

### Comportamento da busca
- Filtra em tempo real enquanto a dona digita (client-side, sem nova request ao banco).
- Busca por qualquer parte do nome (não precisa começar do início).
- Busca e filtro de status funcionam juntos (ex.: filtro "sumidas" + busca "ana" mostra só Anas com status vermelho).

### Comportamento dos filtros rápidos
- Filtro "Todos" mostra todas as clientes.
- Selecionar um filtro substitui o anterior (não acumula múltiplos filtros de status).
- O contador em cada tab mostra o número de clientes naquele grupo (ex.: "Sumidas (4)").

### Ações disponíveis em cada linha
- Toque/clique na linha → abre modal ou página de detalhe da cliente (histórico de atendimentos + botão de reativação).
- Botão rápido "Mandar mensagem" → leva para Tela 3 com essa cliente em destaque.

### Critérios de aceite
- A lista carrega em menos de 1 segundo para até 500 clientes.
- A cor de cada cliente reflete corretamente os dias desde o último atendimento.
- Buscar por parte do nome filtra instantaneamente, sem delay perceptível.
- Ao voltar da Tela 1 após um cadastro, a lista já mostra o status atualizado.

---

## 5. Tela 3 — Painel de reativação

### Objetivo
Transformar "essa cliente sumiu" em "mensagem enviada" com um clique.

### Estrutura da tela

```
[Cabeçalho]
  "Clientes para reativar"
  Subtítulo: "X clientes estão sumidas há mais de 60 dias"

[Lista — vermelhas no topo, amarelas abaixo]
  ● [badge] Nome · X dias sem aparecer · Último serviço: manicure
    [Botão "Mandar mensagem" →]
```

### Mecanismo do botão

O botão constrói um link `wa.me` e abre no navegador/WhatsApp:

```
https://wa.me/<whatsapp>?text=<mensagem_codificada>
```

**Template padrão da mensagem:**
```
Oi {nome}! 💅 Senti sua falta aqui no salão.
Faz um tempinho que você não aparece — bora marcar um horário
pra deixar essas unhas em dia? 😊
```

O `{nome}` é substituído pelo nome da cliente antes de montar o link. A mensagem é codificada com `encodeURIComponent()` antes de ir na URL.

**O que acontece ao clicar:**
1. Abre o WhatsApp (app ou web) com o número pré-preenchido.
2. A mensagem já aparece digitada na caixa de texto da conversa.
3. A dona lê, edita se quiser, e aperta enviar manualmente.
4. O sistema **não confirma** se a mensagem foi enviada — o envio acontece fora do sistema.

### Estados da tela

| Situação | O que exibir |
|----------|-------------|
| Há clientes sumidas | Lista normal com botões |
| Nenhuma cliente sumida | Mensagem: "Nenhuma cliente sumida no momento 🎉" |
| Lista só com amarelas | Exibe as amarelas com destaque menor, botão disponível |

### Critérios de aceite
- Clicar no botão abre o WhatsApp com o número correto e o nome da cliente no texto.
- A mensagem é editável antes de enviar (o envio final é sempre manual).
- Clientes sem nenhum atendimento (`sem_atendimento`) **não aparecem** nesta tela.
- A tela é acessível diretamente da navegação principal, sem precisar passar pela lista.

---

## 6. Navegação entre telas

### Estrutura de navegação (mobile-first)

```
Barra inferior fixa (mobile) / Menu lateral ou superior (desktop)
  [Lista]  ·  [+ Cadastrar]  ·  [Reativar]
```

- Três destinos, três botões. Sem menus aninhados.
- O botão "+ Cadastrar" leva direto ao formulário em branco.
- O ícone de cada seção usa linguagem visual simples: lista, mais (+), coração/mensagem.
- A tela ativa é indicada visualmente (cor ou sublinhado no nav).

### Comportamento do botão voltar
- Da Tela 1 → volta para Tela 2 (lista), com a lista atualizada.
- Da Tela 3 → volta para Tela 2 (lista).
- Do WhatsApp → o sistema fica em segundo plano; a dona pode voltar e continuar.

---

## 7. Estados globais de interface

### Loading
- Lista de clientes: skeleton de 3–5 linhas enquanto carrega.
- Salvamento no formulário: botão "Salvar" vira "Salvando…" e fica desabilitado até a resposta.
- Nunca mostrar tela em branco — sempre skeleton ou spinner.

### Feedback de ações

| Ação | Feedback |
|------|---------|
| Atendimento salvo (cliente nova) | Toast verde: "Cliente cadastrada com sucesso" |
| Atendimento salvo (cliente existente) | Toast verde: "Atendimento adicionado para [Nome]" |
| Erro ao salvar | Toast vermelho: "Não foi possível salvar. Tente novamente." |
| Botão de reativação clicado | Nenhum feedback necessário — o WhatsApp já abre |

### Toasts
- Aparecem no topo da tela (mobile) ou canto superior direito (desktop).
- Somem automaticamente após 3 segundos.
- Não bloqueiam a interface.

### Tela offline / sem conexão
- Exibir banner discreto: "Sem conexão — verifique sua internet."
- Não tentar salvar dados sem conexão (o Supabase não tem modo offline no MVP).

---

## 8. Princípios de UX aplicados ao MVP

| Princípio | Como se aplica |
|-----------|---------------|
| **Mobile-first** | Tudo projetado para toque. Botões com mínimo de 44px de altura. |
| **Zero treinamento** | Cada tela tem uma ação principal óbvia. Nenhum modal de ajuda. |
| **Linguagem do dia a dia** | "Sumida", "voltou", "mandar mensagem" — nunca "inativar", "status vermelho", "reengajamento". |
| **Ação em um clique** | Do painel de reativação ao WhatsApp aberto: 1 toque. |
| **Feedback imediato** | Toast em menos de 200ms após salvar. Lista atualizada sem recarregar a página. |
| **Erros gentis** | Mensagens de erro em primeira pessoa ("Informe o nome") sem jargão técnico. |

---

## 9. Fora de escopo deste fluxo (MVP)

Estas ações **não existem** no MVP e não devem ser implementadas:

- Editar dados de uma cliente já cadastrada (nome, WhatsApp, observações).
- Excluir uma cliente ou um atendimento específico.
- Configurar o template da mensagem de reativação pela interface.
- Ver histórico completo de atendimentos de uma cliente em tela dedicada.
- Recuperar senha pelo próprio sistema.
- Notificações push ou lembretes automáticos.

Cada um desses itens pode entrar no roadmap pós-MVP, mas não deve ser construído agora.
