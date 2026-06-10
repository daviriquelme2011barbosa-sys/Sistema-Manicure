# Plano de Teste — MVP Sistema de Reativação de Clientes

**Versão:** 1.0 (MVP)
**Última atualização:** 10/06/2026
**Referências:** PRD v1.0 · ERD v1.0 · RBAC-RLS v1.0 · UX-Flow v1.0

---

## 1. Objetivo e escopo

Este documento lista todos os casos de teste necessários para validar que o MVP está funcionando corretamente antes de ser entregue a um salão. Os testes cobrem quatro áreas:

- **Autenticação** — login, sessão, proteção de rotas
- **Regras de negócio** — cadastro, deduplicação, lógica de status
- **Segurança (RLS)** — acesso anônimo bloqueado, policies do Supabase
- **Interface (UX)** — validações de formulário, feedback, navegação, responsividade

O que está **fora do escopo** dos testes neste documento (não existe no MVP): editar ou excluir clientes/atendimentos, recuperar senha pela interface, notificações automáticas, múltiplos usuários.

---

## 2. Ambiente e pré-requisitos

Antes de executar qualquer teste, confirme:

- [ ] Projeto Supabase criado e configurado (tabelas `clientes`, `atendimentos`, `salao_config`)
- [ ] RLS habilitado nas três tabelas
- [ ] Todas as policies criadas conforme o documento RBAC-RLS
- [ ] View `clientes_status` criada com `security_invoker = true`
- [ ] Conta da dona criada no Supabase Auth (e-mail + senha conhecidos)
- [ ] Registro em `salao_config` inserido e vinculado ao `user_id` correto
- [ ] Variáveis de ambiente configuradas no Vercel (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- [ ] Chave `service_role` **ausente** de todo o código do frontend
- [ ] Sistema acessível via URL (local ou produção)

---

## 3. Convenções dos casos de teste

Cada caso usa o formato:

```
ID     — identificador único (ex.: AUTH-01)
Dado   — estado inicial / pré-condição
Quando — ação executada
Então  — resultado esperado
Prioridade — P1 (bloqueador) · P2 (importante) · P3 (desejável)
```

**P1 — bloqueador:** o sistema não pode ser entregue com este teste falhando.
**P2 — importante:** deve passar antes da entrega; pode ser corrigido em hotfix imediato.
**P3 — desejável:** melhora a experiência, mas não impede a entrega inicial.

---

## 4. Autenticação

### AUTH-01 — Login com credenciais corretas
- **Prioridade:** P1
- **Dado:** sistema na tela de login, nenhuma sessão ativa
- **Quando:** dona digita e-mail e senha corretos e clica em "Entrar"
- **Então:** é redirecionada para a Tela 2 (lista de clientes) sem mensagem de erro

### AUTH-02 — Login com senha errada
- **Prioridade:** P1
- **Dado:** sistema na tela de login
- **Quando:** dona digita e-mail correto e senha errada
- **Então:** mensagem de erro "E-mail ou senha incorretos" aparece inline; ela permanece na tela de login; a mensagem não revela qual campo está errado

### AUTH-03 — Login com e-mail errado
- **Prioridade:** P1
- **Dado:** sistema na tela de login
- **Quando:** dona digita e-mail inexistente e qualquer senha
- **Então:** mesma mensagem genérica "E-mail ou senha incorretos" — não revela que o e-mail não existe

### AUTH-04 — Submissão com campos vazios
- **Prioridade:** P2
- **Dado:** sistema na tela de login, campos em branco
- **Quando:** dona clica em "Entrar" sem preencher nada
- **Então:** validação inline antes de chamar a API: "Preencha o e-mail" e/ou "Preencha a senha"; nenhuma requisição é feita ao Supabase

### AUTH-05 — Sessão ativa ao reabrir o sistema
- **Prioridade:** P1
- **Dado:** dona já fez login anteriormente e a sessão ainda é válida
- **Quando:** ela acessa a URL do sistema novamente (ex.: após fechar e reabrir o navegador)
- **Então:** é redirecionada direto para a Tela 2 sem ver a tela de login

### AUTH-06 — Acesso direto a rota protegida sem autenticação
- **Prioridade:** P1
- **Dado:** nenhuma sessão ativa
- **Quando:** usuário tenta acessar diretamente `/clientes`, `/cadastro` ou `/reativar` pela URL
- **Então:** é redirecionado para a tela de login; não vê nenhum dado

### AUTH-07 — Não existe botão "Cadastre-se"
- **Prioridade:** P2
- **Dado:** tela de login
- **Quando:** inspeção visual da tela
- **Então:** não há link nem botão de auto-cadastro; o único fluxo disponível é entrar com e-mail e senha

---

## 5. Cadastro de atendimento (Tela 1)

### CAD-01 — Cadastro completo de cliente nova
- **Prioridade:** P1
- **Dado:** nenhuma cliente com o número `38999991234` no banco
- **Quando:** dona preenche nome "Ana Silva", WhatsApp `(38) 99999-1234`, serviço "Manicure", data hoje, e clica em "Salvar"
- **Então:**
  - uma linha é criada em `clientes` com `whatsapp = '38999991234'` (normalizado)
  - uma linha é criada em `atendimentos` com `cliente_id` correto e `data_atendimento = hoje`
  - toast verde: "Cliente Ana Silva cadastrada com sucesso"
  - sistema redireciona para Tela 2

### CAD-02 — Atendimento de cliente já existente (deduplicação)
- **Prioridade:** P1
- **Dado:** cliente "Ana Silva" com `whatsapp = '38999991234'` já existe em `clientes`
- **Quando:** dona preenche WhatsApp `38 99999-1234` (formato diferente), nome "Ana", serviço "Pedicure", data hoje
- **Então:**
  - **nenhuma nova linha** é criada em `clientes` (conta permanece 1)
  - uma nova linha é criada em `atendimentos` com o `cliente_id` da Ana existente
  - toast verde: "Atendimento adicionado para Ana Silva" (com o nome que já estava no banco)
  - histórico anterior da cliente é mantido intacto

### CAD-03 — Normalização de WhatsApp — múltiplos formatos
- **Prioridade:** P1
- **Dado:** banco vazio
- **Quando:** os seguintes números são cadastrados em sequência para clientes diferentes (nomes distintos):

  | Entrada | Esperado normalizado |
  |---------|---------------------|
  | `(38) 99999-1234` | `38999991234` |
  | `38 99999 1234` | `38999991234` |
  | `+55 38 99999-1234` | `5538999991234` |
  | `38999991234` | `38999991234` |

- **Então:** apenas os números que produzem strings de dígitos idênticas geram duplicata; os demais criam clientes separadas

### CAD-04 — Campo nome obrigatório
- **Prioridade:** P1
- **Dado:** formulário de cadastro aberto
- **Quando:** dona deixa o campo "Nome" em branco e clica em "Salvar"
- **Então:** mensagem "Informe o nome da cliente" aparece no campo; nenhuma requisição é feita ao banco

### CAD-05 — Campo WhatsApp obrigatório
- **Prioridade:** P1
- **Dado:** formulário de cadastro aberto
- **Quando:** dona preenche nome mas deixa WhatsApp em branco e clica em "Salvar"
- **Então:** mensagem "Informe o WhatsApp" aparece; nenhuma requisição ao banco

### CAD-06 — WhatsApp com menos de 10 dígitos
- **Prioridade:** P1
- **Dado:** formulário de cadastro aberto
- **Quando:** dona digita `99999` (5 dígitos) no campo WhatsApp e tenta salvar
- **Então:** mensagem "Número inválido — confira o WhatsApp"; nenhuma requisição ao banco

### CAD-07 — Campo serviço obrigatório
- **Prioridade:** P1
- **Dado:** formulário de cadastro aberto
- **Quando:** dona preenche nome e WhatsApp mas deixa serviço em branco e clica em "Salvar"
- **Então:** mensagem "Selecione ou descreva o serviço"; nenhuma requisição ao banco

### CAD-08 — Data padrão é hoje
- **Prioridade:** P2
- **Dado:** formulário de cadastro aberto
- **Quando:** formulário é carregado sem nenhuma ação da dona
- **Então:** o campo "Data do atendimento" já vem preenchido com a data de hoje

### CAD-09 — Observações são opcionais
- **Prioridade:** P2
- **Dado:** formulário de cadastro aberto
- **Quando:** dona preenche nome, WhatsApp e serviço, deixa observações em branco, e clica em "Salvar"
- **Então:** cadastro é realizado com sucesso; `observacoes` fica `null` no banco

### CAD-10 — Botão "Salvar" desabilitado durante envio
- **Prioridade:** P2
- **Dado:** formulário preenchido corretamente
- **Quando:** dona clica em "Salvar" (antes da resposta do banco chegar)
- **Então:** botão muda para "Salvando…" e fica desabilitado para evitar duplo envio

### CAD-11 — Status atualizado após cadastro
- **Prioridade:** P1
- **Dado:** cliente "Maria" está com status vermelho (último atendimento há 90 dias)
- **Quando:** dona cadastra um novo atendimento para Maria com data de hoje
- **Então:** ao voltar para a Tela 2, Maria aparece com status verde

---

## 6. Lógica de status (Tela 2)

### STA-01 — Status verde (exatamente 30 dias)
- **Prioridade:** P1
- **Dado:** cliente com `data_atendimento = hoje - 30 dias`
- **Quando:** Tela 2 é carregada
- **Então:** cliente aparece com badge verde ("Ativa")

### STA-02 — Status amarelo (exatamente 31 dias)
- **Prioridade:** P1
- **Dado:** cliente com `data_atendimento = hoje - 31 dias`
- **Quando:** Tela 2 é carregada
- **Então:** cliente aparece com badge amarelo ("Atenção")

### STA-03 — Status amarelo (exatamente 60 dias)
- **Prioridade:** P1
- **Dado:** cliente com `data_atendimento = hoje - 60 dias`
- **Quando:** Tela 2 é carregada
- **Então:** cliente aparece com badge amarelo ("Atenção") — **não vermelho**

### STA-04 — Status vermelho (exatamente 61 dias)
- **Prioridade:** P1
- **Dado:** cliente com `data_atendimento = hoje - 61 dias`
- **Quando:** Tela 2 é carregada
- **Então:** cliente aparece com badge vermelho ("Sumida")

### STA-05 — Status sem atendimento
- **Prioridade:** P2
- **Dado:** cliente cadastrada em `clientes` mas sem nenhuma linha em `atendimentos`
- **Quando:** Tela 2 é carregada
- **Então:** cliente aparece com badge cinza (ou marcação `sem_atendimento`); **não entra** na lista de reativação da Tela 3

### STA-06 — Ordenação padrão da lista
- **Prioridade:** P2
- **Dado:** lista com clientes de status misto (verde, amarelo, vermelho)
- **Quando:** Tela 2 é carregada sem nenhum filtro ativo
- **Então:** vermelhas aparecem no topo, depois amarelas, depois verdes; dentro de cada grupo, ordenado por mais dias sem aparecer primeiro

### STA-07 — Status calculado dinamicamente (não é coluna)
- **Prioridade:** P1
- **Dado:** cliente com último atendimento há 29 dias (status verde hoje)
- **Quando:** a verificação é feita 2 dias depois (data vira 31 dias)
- **Então:** cliente passa automaticamente para status amarelo sem nenhuma ação da dona ou atualização manual no banco

---

## 7. Lista e filtros (Tela 2)

### LST-01 — Busca por parte do nome
- **Prioridade:** P1
- **Dado:** lista com clientes "Ana Costa", "Ana Lima", "Maria Ana", "Beatriz"
- **Quando:** dona digita "ana" no campo de busca
- **Então:** lista exibe "Ana Costa", "Ana Lima" e "Maria Ana"; "Beatriz" desaparece; filtragem ocorre em tempo real sem nova requisição ao banco

### LST-02 — Busca case-insensitive
- **Prioridade:** P2
- **Dado:** cliente "Ana Costa" cadastrada
- **Quando:** dona digita "ANA" ou "Ana" ou "ana"
- **Então:** cliente aparece em todos os casos

### LST-03 — Filtro "Sumidas"
- **Prioridade:** P1
- **Dado:** lista com clientes de todos os status
- **Quando:** dona seleciona o filtro "Sumidas"
- **Então:** apenas clientes com status vermelho são exibidas; o contador mostra o número correto

### LST-04 — Filtro substitui o anterior
- **Prioridade:** P2
- **Dado:** filtro "Sumidas" ativo
- **Quando:** dona clica em "Atenção"
- **Então:** apenas clientes amarelas são exibidas; vermelhas somem — os filtros não se acumulam

### LST-05 — Filtro "Todos" restaura a lista completa
- **Prioridade:** P2
- **Dado:** filtro "Sumidas" ativo
- **Quando:** dona clica em "Todos"
- **Então:** todas as clientes voltam a aparecer

### LST-06 — Busca + filtro combinados
- **Prioridade:** P2
- **Dado:** lista com "Ana" vermelha, "Ana" amarela e "Bia" vermelha
- **Quando:** filtro "Sumidas" ativo + dona digita "ana" na busca
- **Então:** apenas "Ana" vermelha é exibida (interseção dos dois critérios)

### LST-07 — Performance com 500 clientes
- **Prioridade:** P2
- **Dado:** banco com 500 clientes cadastradas
- **Quando:** Tela 2 é carregada
- **Então:** lista renderiza em menos de 1 segundo

---

## 8. Reativação via WhatsApp (Tela 3)

### REA-01 — Link wa.me com número e mensagem corretos
- **Prioridade:** P1
- **Dado:** cliente "Joana" com `whatsapp = '38999990001'` e status vermelho
- **Quando:** dona clica em "Mandar mensagem" para Joana na Tela 3
- **Então:** o browser abre uma nova aba/app com URL no formato `https://wa.me/38999990001?text=...`; a mensagem contém o nome "Joana" substituído no template

### REA-02 — Mensagem com encodeURIComponent
- **Prioridade:** P1
- **Dado:** qualquer cliente na Tela 3
- **Quando:** dona clica em "Mandar mensagem"
- **Então:** a URL não contém espaços nem caracteres especiais não codificados (ex.: `%20` no lugar de espaço, `%F0%9F%92%85` para o emoji); o WhatsApp recebe a mensagem correta

### REA-03 — Nome substituído no template
- **Prioridade:** P1
- **Dado:** cliente com nome "Fernanda"
- **Quando:** dona clica em "Mandar mensagem"
- **Então:** a mensagem pré-preenchida começa com "Oi Fernanda!" — o placeholder `{nome}` foi substituído corretamente

### REA-04 — Tela 3 exibe vermelhas no topo
- **Prioridade:** P2
- **Dado:** clientes com status vermelho e amarelo
- **Quando:** Tela 3 é aberta
- **Então:** vermelhas aparecem antes das amarelas; dentro de cada grupo, ordenado por mais dias sem aparecer

### REA-05 — Estado vazio — nenhuma cliente sumida
- **Prioridade:** P2
- **Dado:** todas as clientes têm status verde
- **Quando:** Tela 3 é aberta
- **Então:** mensagem "Nenhuma cliente sumida no momento 🎉" é exibida; nenhum botão de reativação aparece

### REA-06 — Clientes sem atendimento não aparecem na Tela 3
- **Prioridade:** P1
- **Dado:** cliente com status `sem_atendimento` (nunca foi atendida)
- **Quando:** Tela 3 é aberta
- **Então:** essa cliente não aparece na lista de reativação

### REA-07 — Tela 3 acessível diretamente pelo nav
- **Prioridade:** P2
- **Dado:** dona está em qualquer tela do sistema
- **Quando:** ela clica no botão "Reativar" da navegação
- **Então:** vai direto para a Tela 3 sem precisar passar pela lista

---

## 9. Segurança e RLS

### SEC-01 — Acesso anônimo à tabela `clientes` bloqueado
- **Prioridade:** P1
- **Dado:** nenhum usuário autenticado (sem token de sessão)
- **Quando:** requisição `SELECT * FROM clientes` é feita com a chave `anon` sem JWT
- **Então:** retorna zero linhas (RLS bloqueia silenciosamente — não é erro 403, é lista vazia)

### SEC-02 — Acesso anônimo à tabela `atendimentos` bloqueado
- **Prioridade:** P1
- **Dado:** nenhum usuário autenticado
- **Quando:** requisição `SELECT * FROM atendimentos` com chave `anon` sem JWT
- **Então:** retorna zero linhas

### SEC-03 — Acesso anônimo à view `clientes_status` bloqueado
- **Prioridade:** P1
- **Dado:** nenhum usuário autenticado
- **Quando:** requisição `SELECT * FROM clientes_status` com chave `anon` sem JWT
- **Então:** retorna zero linhas

### SEC-04 — Dona autenticada lê os próprios dados
- **Prioridade:** P1
- **Dado:** dona autenticada com sessão válida
- **Quando:** requisição `SELECT * FROM clientes` com JWT da dona
- **Então:** retorna todas as clientes do salão corretamente

### SEC-05 — Dona autenticada insere cliente
- **Prioridade:** P1
- **Dado:** dona autenticada
- **Quando:** `INSERT INTO clientes (nome, whatsapp) VALUES ('Teste', '11999990000')`
- **Então:** linha inserida com sucesso; `id` gerado automaticamente

### SEC-06 — INSERT na view `clientes_status` bloqueado
- **Prioridade:** P1
- **Dado:** dona autenticada
- **Quando:** tenta fazer `INSERT INTO clientes_status ...`
- **Então:** operação rejeitada (view é somente leitura)

### SEC-07 — `service_role` ausente do código do frontend
- **Prioridade:** P1
- **Dado:** código-fonte do projeto (repositório GitHub + bundle gerado no Vercel)
- **Quando:** busca por `service_role` em todo o código publicado
- **Então:** nenhuma ocorrência encontrada — a chave não está exposta

### SEC-08 — Variáveis de ambiente públicas não contêm `service_role`
- **Prioridade:** P1
- **Dado:** configuração do Vercel
- **Quando:** inspeção das variáveis de ambiente prefixadas com `NEXT_PUBLIC_` ou `VITE_`
- **Então:** nenhuma dessas variáveis contém a chave `service_role`

### SEC-09 — Acesso anônimo bloqueado em `salao_config`
- **Prioridade:** P1
- **Dado:** nenhum usuário autenticado
- **Quando:** `SELECT * FROM salao_config` sem JWT
- **Então:** retorna zero linhas

---

## 10. Interface e UX

### UX-01 — Toast de sucesso some em 3 segundos
- **Prioridade:** P3
- **Dado:** atendimento salvo com sucesso
- **Quando:** toast verde aparece
- **Então:** desaparece automaticamente após 3 segundos sem nenhuma ação da dona

### UX-02 — Toast não bloqueia a interface
- **Prioridade:** P3
- **Dado:** toast visível na tela
- **Quando:** dona tenta interagir com outros elementos da tela
- **Então:** consegue clicar normalmente; o toast é decorativo e não é modal

### UX-03 — Skeleton na lista durante carregamento
- **Prioridade:** P3
- **Dado:** Tela 2 sendo carregada
- **Quando:** dados ainda não chegaram do Supabase
- **Então:** skeleton de 3 a 5 linhas é exibido; tela não fica em branco

### UX-04 — Responsividade mobile (375px)
- **Prioridade:** P1
- **Dado:** sistema aberto em viewport de 375px de largura (iPhone SE)
- **Quando:** todas as três telas são navegadas
- **Então:** nenhum elemento ultrapassa a largura da tela; botões têm pelo menos 44px de altura; textos são legíveis sem zoom

### UX-05 — Navegação inferior no mobile
- **Prioridade:** P2
- **Dado:** sistema aberto no celular
- **Quando:** inspeção da interface
- **Então:** barra de navegação fixa na parte inferior com três botões: Lista, Cadastrar, Reativar

### UX-06 — Tela ativa indicada no nav
- **Prioridade:** P3
- **Dado:** dona está na Tela 2 (lista)
- **Quando:** inspeção da barra de navegação
- **Então:** o botão "Lista" está visualmente destacado (cor ou sublinhado diferente dos outros)

### UX-07 — Voltar da Tela 1 atualiza a lista
- **Prioridade:** P1
- **Dado:** dona cadastrou um atendimento na Tela 1
- **Quando:** é redirecionada de volta para a Tela 2
- **Então:** a lista já exibe o status atualizado da cliente recém-atendida (sem precisar recarregar a página manualmente)

### UX-08 — Mensagem de erro ao salvar sem conexão
- **Prioridade:** P2
- **Dado:** dona sem conexão com a internet tenta salvar um atendimento
- **Quando:** clica em "Salvar"
- **Então:** toast vermelho "Não foi possível salvar. Tente novamente." aparece; nenhum dado parcial é gravado

### UX-09 — Linguagem sem jargão técnico
- **Prioridade:** P2
- **Dado:** qualquer tela do sistema
- **Quando:** inspeção de todos os textos visíveis
- **Então:** não há termos como "inativar", "reengajamento", "status vermelho" ou "registro"; linguagem usada: "sumida", "mandar mensagem", "última visita"

---

## 11. Fluxo de implantação

### IMP-01 — Script de implantação cria config corretamente
- **Prioridade:** P1
- **Dado:** novo projeto Supabase criado (banco vazio)
- **Quando:** script de implantação é executado com `user_id`, `nome_salao` e `cor_primaria` corretos
- **Então:** tabela `salao_config` contém exatamente uma linha vinculada ao `user_id` da dona

### IMP-02 — Sistema funciona do zero após implantação
- **Prioridade:** P1
- **Dado:** implantação recém-executada, banco sem dados de clientes
- **Quando:** dona faz login pela primeira vez e cadastra a primeira cliente
- **Então:** cliente aparece na lista com status correto (verde, pois foi atendida hoje)

### IMP-03 — Nome e cor do salão aparecem na interface
- **Prioridade:** P2
- **Dado:** `salao_config` com `nome_salao = 'Salão da Carla'` e `cor_primaria = '#9333ea'`
- **Quando:** dona faz login e visualiza a interface
- **Então:** o nome "Salão da Carla" aparece na barra superior; a cor primária da interface reflete o roxo `#9333ea`

---

## 12. Checklist de entrega (gate final)

Use esta lista como critério de aprovação antes de entregar o sistema ao salão. **Todos os itens P1 precisam estar marcados.**

### Segurança
- [ ] SEC-01 ao SEC-09 — todos passando
- [ ] `service_role` ausente do código (SEC-07) confirmado manualmente

### Regras de negócio críticas
- [ ] CAD-01 — cadastro de nova cliente funciona
- [ ] CAD-02 — deduplicação por WhatsApp funciona
- [ ] CAD-03 — normalização de número funciona nos quatro formatos
- [ ] STA-01 ao STA-04 — bordas de status corretas (especialmente 30/31 e 60/61)
- [ ] STA-07 — status calculado dinamicamente (não é coluna fixa)
- [ ] REA-01 ao REA-03 — link WhatsApp abre com número e mensagem corretos
- [ ] REA-06 — clientes sem atendimento não aparecem na Tela 3

### Autenticação
- [ ] AUTH-01 — login funciona
- [ ] AUTH-05 — sessão persiste ao reabrir
- [ ] AUTH-06 — rotas protegidas redirecionam sem sessão

### UX mobile
- [ ] UX-04 — responsivo em 375px
- [ ] UX-07 — lista atualizada ao voltar do cadastro

### Implantação
- [ ] IMP-01 — script de implantação executado sem erro
- [ ] IMP-02 — sistema funciona do zero com banco limpo

---

## 13. Casos de borda que merecem atenção especial

Estes pontos têm histórico de causar bugs sutis — vale testar com cuidado extra:

**Borda do status no dia exato.** O caso `dias = 30` deve ser verde, `dias = 31` deve ser amarelo. O operador correto é `<= 30`, não `< 30`. Testar os dois lados do limite é obrigatório (STA-01 e STA-02).

**Deduplicação com `+55` no número.** `(38) 99999-1234` normaliza para `38999991234`, mas `+55 38 99999-1234` normaliza para `5538999991234` — são strings diferentes, portanto clientes diferentes. Confirmar que o sistema trata isso consistentemente (CAD-03).

**RLS retorna vazio, não erro.** Quando o RLS bloqueia, a query retorna zero linhas — não um erro 403. Durante desenvolvimento, isso pode parecer "bug de dados" quando na verdade é "usuário não autenticado". Validar que o sistema trata lista vazia de forma diferente de "erro de conexão" (SEC-01).

**`encodeURIComponent` na mensagem do WhatsApp.** Nomes com caracteres especiais (acentos, ç) precisam estar codificados para o link `wa.me` funcionar. Testar com o nome "Fernanda Gonçalves" ou "Iná" (REA-02).

**Status dinâmico sem coluna.** Confirmar que não há nenhum campo `status` persistido no banco — o status é sempre calculado na leitura. Um bug comum é salvar o status no momento do cadastro, o que o torna estático e incorreto com o passar dos dias (STA-07).
