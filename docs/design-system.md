design-system.md

> Manual de referência visual e técnico para o desenvolvimento de **todas** as telas do sistema.
> SaaS de gestão multi-nicho (clínicas, salões, barbearias, estúdios, manicures, estética, prestadores de serviço, pequenas empresas).
> Versão do documento: 1.0 · Stack alvo: **Next.js + Tailwind CSS + Supabase + Vercel**.

Este documento não é uma cópia da tela de referência. É a **linguagem de design** por trás dela, transformada em regras reutilizáveis. Tudo aqui é neutro por design: nenhum elemento é "de salão" ou "de clínica". A identidade é *tecnológica, discreta e premium*, para caber em qualquer nicho sem parecer feito para um só.

---

## Índice

- **Parte 1 — Fundamentos e Filosofia** (por que parece software premium)
- **Parte 2 — Cor** (paleta completa, análise e tokens light/dark)
- **Parte 3 — Design Tokens** (tipografia, espaçamento, raio, sombra, elevação, grid, z-index, motion)
- **Parte 4 — Hierarquia Visual e Layout** (onde o olho olha, contraste, respiro)
- **Parte 5 — Componentes** (spec completa de cada um)
- **Parte 6 — Motion Design** (animações, duração, easing, quando usar/evitar)
- **Parte 7 — UX por Tela** (dashboard, clientes, agenda, financeiro, relatórios, área do cliente...)
- **Parte 8 — Mobile e Responsividade** (bottom nav, FAB, bottom sheet, gestos)
- **Anexo — Implementação** (CSS variables + `tailwind.config`)

---

# Parte 1 — Fundamentos e Filosofia

## 1.1 Por que essa tela parece um software premium

Não é uma coisa só. É o acúmulo de várias decisões pequenas e disciplinadas. Vale entender cada uma, porque são elas que você vai repetir em toda tela:

1. **Uma cor de marca, usada com moderação.** O violeta aparece só onde importa: logo, item de menu ativo, botão primário, um sparkline. Software amador espalha a cor da marca em tudo. Software premium a guarda como acento. O olho aprende "violeta = ação principal / onde estou".

2. **Neutros de verdade, não cinzas chapados.** O fundo não é branco puro nem cinza morto — é um cinza levemente frio (`#F6F7F9`) que faz o card branco "flutuar" sem precisar de sombra pesada. No dark, o fundo é quase preto mas com um leve tom frio, não `#000000`. Preto puro é agressivo; quase-preto é sofisticado.

3. **Sombra fraca + borda fina, nunca sombra forte.** Os cards têm 1px de borda quase invisível e uma sombra sutilíssima. A elevação vem do contraste entre o branco do card e o cinza do fundo, não de uma sombra dramática. Sombra pesada = template dos anos 2010.

4. **Espaço em branco generoso e consistente.** Tudo respira com múltiplos de 4px. O padding interno dos cards é constante. Isso cria ritmo — e ritmo é o que o cérebro lê como "caro".

5. **Tipografia com hierarquia clara e números tabulares.** Título do card em peso médio, número do KPI enorme e bold, legenda pequena e apagada. Três pesos, três tamanhos, papéis óbvios. Os números financeiros alinham verticalmente (tabular), o que passa precisão.

6. **Cores de status com significado fixo.** Verde/âmbar/vermelho aparecem sempre com o mesmo sentido (Ativo / Atenção / Sumido). O usuário aprende o código uma vez e nunca mais precisa reler a legenda.

7. **Cantos arredondados médios e consistentes.** Nada de quinas retas nem bolhas exageradas. ~16px nos cards, ~10px nos botões, pill nos badges. Consistência de raio é assinatura visual.

8. **Dados como decoração honesta.** Os sparklines nos KPIs não são enfeite: mostram tendência. Gráfico bonito que também informa = maturidade de produto.

## 1.2 Os cinco princípios do sistema

Toda decisão futura deve passar por estes cinco filtros:

| Princípio | O que significa na prática |
|---|---|
| **Neutro primeiro** | Nada pode denunciar um nicho específico. Ícones, cores e copy são genéricos de gestão. "Cliente", "Agendamento", "Atendimento" — nunca "corte", "consulta", "unha". |
| **Calmo, não vazio** | Interface silenciosa deixa o dado gritar. A cor trabalha a favor da informação, nunca contra. |
| **Consistência > criatividade pontual** | O mesmo botão, o mesmo card, o mesmo badge em toda tela. Previsibilidade é conforto. |
| **Um acento por contexto** | Cada tela tem no máximo uma "coisa violeta" competindo por atenção. Se tudo é destaque, nada é. |
| **Acessível de fábrica** | Contraste AA, foco visível no teclado, alvos de toque ≥ 44px, `prefers-reduced-motion` respeitado. Não é opcional. |

## 1.3 Personalidade da marca em uma frase

> **Profissional e confiável como um banco, leve e moderno como um app de produtividade.**

O violeta traz o "moderno/tech". Os neutros frios trazem o "confiável". A ausência de exageros traz o "profissional". É esse triângulo que você protege em toda tela.

---

# Parte 2 — Cor

## 2.1 Análise da paleta observada

**Cor predominante — Violeta/Índigo.** É a cor da marca e da ação primária. Aparece no logo, no item de menu ativo (com gradiente), no botão `+` do topo, no botão primário e em um dos sparklines. Funciona porque é vibrante o suficiente para chamar atenção, mas frio o bastante para não parecer "brincadeira". Violeta comunica tecnologia e inovação sem o clichê do azul corporativo.

**Cor secundária — Teal/Ciano.** Aparece no botão "Nova reserva" e no acento de "Agendamentos hoje". É o par perfeito do violeta: fresca, ligada a "tempo/agenda", e cria contraste sem brigar. Serve para uma segunda ação de destaque (agendar/reservar).

**Cores de status.**
- **Verde** = positivo, ativo, crescimento (`+12%`, clientes ativos, receita).
- **Âmbar** = atenção, pendente, alerta ameno.
- **Vermelho** = negativo, sumido, cancelado, despesa/queda.
- **Ciano/Azul** = informação neutra.

Funciona porque cada cor tem **um** significado e ele nunca muda de tela para tela. O verde nunca é decorativo; sempre significa "bom".

**Background.** Cinza frio muito claro no light (`#F6F7F9`) e quase-preto frio no dark (`#0B0C0F`). Nunca branco puro nem preto puro. Isso reduz fadiga visual e dá "profundidade" de graça.

**Cards.** Branco puro no light (destacam do fundo cinza) e cinza-escuro elevado no dark (`#16181D`, mais claro que o fundo). O contraste card/fundo é a principal fonte de elevação.

**Bordas.** Hairline (1px) num cinza levemente mais escuro que o card no light; e um branco a ~8% de opacidade no dark. Bordas separam sem gritar.

**Sombras.** Muito sutis no light (mancha difusa de baixa opacidade); praticamente inexistentes no dark, onde a separação vem da borda e de um leve *glow* nos gráficos.

**Textos.** Três níveis: primário (quase preto/quase branco), secundário (cinza médio) e muted (cinza claro, para legendas e metadados). A hierarquia de texto é feita por cor + peso + tamanho, não só por tamanho.

**Ícones.** Herdam a cor de texto secundário quando inertes; ganham a cor de status/marca quando ativos. Traço fino (~1.5px), estilo *outline*, consistente (biblioteca única, ex. Lucide).

**Gráficos.** Cada série usa uma cor semântica (violeta, teal, verde, âmbar). Linhas com preenchimento em gradiente suave que some para transparente. No dark ganham glow leve na linha.

**Botões.** Primário = violeta sólido (ou gradiente). Secundário = agenda/teal. Terciário/ghost = transparente com borda ou só texto. Ação destrutiva = vermelho.

**Hover.** Escurece o preenchimento em ~8–10% (ou clareia no dark), levanta 1px de sombra e/ou muda o fundo do item de menu para um tom bem claro da marca.

**Ativo/inativo.** Item ativo do menu = fundo violeta + texto branco. Inativo = texto secundário + ícone cinza, fundo transparente; no hover ganha fundo cinza-claro.

## 2.2 Escala de cores (primitivos)

Estes são os **valores brutos**. Nunca use um primitivo direto no componente — use os *tokens semânticos* da seção 2.3. Os primitivos existem para alimentar os tokens.

### Marca — Violet (primary)
| Token | Hex |
|---|---|
| `violet-50`  | `#F3F0FF` |
| `violet-100` | `#E9E3FF` |
| `violet-200` | `#D4C7FF` |
| `violet-300` | `#B39DFF` |
| `violet-400` | `#957AFF` |
| `violet-500` | `#7C5CFF` ← base |
| `violet-600` | `#6B45F0` |
| `violet-700` | `#5A34D6` |
| `violet-800` | `#4A2BB0` |
| `violet-900` | `#3D258C` |

**Gradiente da marca:** `linear-gradient(135deg, #7C5CFF 0%, #6D3BEE 100%)` — usado no logo, item de menu ativo e, com muita parcimônia, em headers/heros.

### Secundária — Teal
| Token | Hex |
|---|---|
| `teal-50`  | `#E6FBF7` |
| `teal-100` | `#C6F5EC` |
| `teal-300` | `#5EE7D2` |
| `teal-400` | `#2DD4BF` |
| `teal-500` | `#14B8A6` ← base |
| `teal-600` | `#0D9488` |
| `teal-700` | `#0F766E` |

### Status — Green (success)
| Token | Hex |
|---|---|
| `green-50`  | `#E9FBF0` |
| `green-100` | `#CFF7DE` |
| `green-400` | `#4ADE80` |
| `green-500` | `#22C55E` ← base |
| `green-600` | `#16A34A` |
| `green-700` | `#15803D` |

### Status — Amber (warning)
| Token | Hex |
|---|---|
| `amber-50`  | `#FEF6E7` |
| `amber-100` | `#FCEBC4` |
| `amber-400` | `#FBBF24` |
| `amber-500` | `#F59E0B` ← base |
| `amber-600` | `#D97706` |
| `amber-700` | `#B45309` |

### Status — Red (danger)
| Token | Hex |
|---|---|
| `red-50`  | `#FDECEC` |
| `red-100` | `#FBD5D5` |
| `red-400` | `#F87171` |
| `red-500` | `#EF4444` ← base |
| `red-600` | `#DC2626` |
| `red-700` | `#B91C1C` |

### Status — Blue (info)
| Token | Hex |
|---|---|
| `blue-50`  | `#EAF2FE` |
| `blue-400` | `#60A5FA` |
| `blue-500` | `#3B82F6` ← base |
| `blue-600` | `#2563EB` |

### Neutros — Slate (frio, tom de fundo do sistema)
| Token | Hex |
|---|---|
| `slate-0`   | `#FFFFFF` |
| `slate-50`  | `#F9FAFB` |
| `slate-100` | `#F6F7F9` |
| `slate-150` | `#EEF0F3` |
| `slate-200` | `#E5E7EB` |
| `slate-300` | `#D1D5DB` |
| `slate-400` | `#98A2B3` |
| `slate-500` | `#667085` |
| `slate-600` | `#4B5563` |
| `slate-700` | `#374151` |
| `slate-800` | `#1F2430` |
| `slate-850` | `#171A21` |
| `slate-900` | `#16181D` |
| `slate-950` | `#0B0C0F` |

## 2.3 Tokens semânticos (o que você realmente usa)

Regra de ouro: **componentes referenciam tokens semânticos, tokens semânticos referenciam primitivos.** Trocar o tema = trocar o mapeamento, sem tocar nos componentes.

> **Paleta canônica dark — navy (não neutro):** o dark theme deste projeto usa um fundo **navy profundo**, não o near-black neutro genérico descrito na Parte 1/2 como filosofia geral de "cinza frio". Os valores desta tabela são a fonte da verdade; onde a Parte 2 mencionar hex antigo (`#0B0C0F`, `#7C5CFF`), prevalece o valor abaixo.

| Token semântico | Light | Dark | Uso |
|---|---|---|---|
| `--color-primary`        | `#7C3AE3` | `#7C3AE3` | Ação principal, marca |
| `--color-primary-hover`  | `#6B27D4` | `#BB5CF6` | Hover do primário |
| `--color-primary-pressed`| `#5A16BA` | `#7C3AE3` | Estado pressionado |
| `--color-primary-soft`   | `#F3EAFE`  | `rgba(124,58,227,.16)` | Fundo suave (ícone ativo, tag) |
| `--color-secondary`      | `teal-500`   | `teal-400`   | Segunda ação (agendar/reservar) |
| `--color-secondary-hover`| `teal-600`   | `teal-300`   | Hover secundário |
| `--color-bg`             | `slate-100` `#F6F7F9` | **navy** `#0B1220` | Fundo do app |
| `--color-surface`        | `slate-0` `#FFFFFF` | **navy** `#111827` | Card, painel |
| `--color-surface-2`      | `slate-50` `#F9FAFB` | **navy** `#1A2333` | Fundo interno, modal, disabled |
| `--color-hover`          | `slate-150` `#EEF0F3` | **navy** `#202B3E` | Hover de item/linha (camada acima do surface-2) |
| `--color-sidebar`        | `#FFFFFF` | `#0D1524` | Fundo da sidebar |
| `--color-topbar`         | `#FFFFFF` | `#0E1728` | Fundo da topbar |
| `--color-border`         | `#E8EAEE` | `rgba(148,163,184,.12)` | Borda hairline padrão |
| `--color-border-strong`  | `slate-200` `#E5E7EB` | `rgba(148,163,184,.20)` | Borda de ênfase |
| `--color-divider`        | `#EEF0F3` | `rgba(148,163,184,.08)` | Separadores internos |
| `--color-text`           | `#16181D` | `#F8FAFC` | Texto primário |
| `--color-text-secondary` | `slate-500` `#667085` | `#94A3B8` | Texto de apoio |
| `--color-text-muted`     | `slate-400` `#98A2B3` | `#64748B` | Legendas, metadados |
| `--color-text-on-primary`| `#FFFFFF` | `#FFFFFF` | Texto sobre botão/marca |
| `--color-icon`           | `slate-500` | `#94A3B8` | Ícone inerte |
| `--color-icon-active`    | `--color-primary` | `--color-primary` | Ícone ativo |
| `--color-success`        | `green-500` | `green-400` | Positivo |
| `--color-success-soft`   | `green-50`  | `rgba(34,197,94,.14)` | Fundo de badge sucesso |
| `--color-warning`        | `amber-500` | `amber-400` | Atenção |
| `--color-warning-soft`   | `amber-50`  | `rgba(245,158,11,.14)` | Fundo badge atenção |
| `--color-danger`         | `red-500`   | `red-400`   | Negativo/destrutivo |
| `--color-danger-soft`    | `red-50`    | `rgba(239,68,68,.14)` | Fundo badge erro |
| `--color-info`           | `blue-500`  | `blue-400`  | Informação neutra |
| `--color-overlay`        | `rgba(16,18,29,.48)` | `rgba(0,0,0,.64)` | Fundo de modal |
| `--color-glass`          | `rgba(255,255,255,.72)` | `rgba(17,24,39,.72)` | Vidro (blur, tingido de navy) |
| `--color-focus`          | `rgba(124,58,227,.45)` | `rgba(124,58,227,.55)` | Anel de foco |
| `--glow-primary` (só dark)| — | `0 0 0 1px rgba(124,58,227,.35), 0 0 28px rgba(124,58,227,.25)` | Elevação de card no hover (substitui sombra escura) |

### Mapa de status → semântica de negócio
Fixe isto e nunca mude:

| Cor | Status de cliente | Status de agendamento | Financeiro |
|---|---|---|---|
| Verde | Ativo | Confirmado | Receita / alta |
| Âmbar | Atenção | Pendente | Em aberto / neutro |
| Vermelho | Sumido | Cancelado | Despesa / queda |
| Ciano | — | Reagendado / info | Recebimento previsto |

## 2.4 Regras de contraste (obrigatórias)

- Texto primário sobre surface: sempre ≥ 7:1 (AAA).
- Texto secundário/muted: ≥ 4.5:1 (AA). Muted nunca abaixo disso — se ficar ilegível, é bug, não estilo.
- Texto sobre cor de status: use o texto escuro do próprio matiz (ex. `green-700` sobre `green-50`), nunca branco sobre pastel.
- Foco: anel de 2–3px em `--color-focus`, sempre visível, nunca removido (`outline: none` sem substituto é proibido).

---

# Parte 3 — Design Tokens

Base do sistema: **grade de 4px**. Todo espaçamento, tamanho e raio é múltiplo de 4.

## 3.1 Tipografia

**Família recomendada:** `Inter` (primária) — humanista-geométrica, neutra, excelente em telas, com *tabular numbers* nativo. Alternativa premium: `Geist`. Fallback: `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.

- Números de KPI e financeiro: ativar `font-variant-numeric: tabular-nums` para alinhamento vertical perfeito.
- Sem fonte serifada em nenhum lugar do produto. Serifa = editorial, não SaaS de gestão.

### Escala tipográfica
| Token | Tamanho | Line-height | Peso padrão | Uso |
|---|---|---|---|---|
| `text-2xs` | 11px | 14px | 500 | Micro-labels, `⌘K` |
| `text-xs`  | 12px | 16px | 500 | Legendas, metadados, badge |
| `text-sm`  | 13px | 20px | 400/500 | Texto de apoio, meta de lista |
| `text-base`| 14px | 22px | 400 | Corpo padrão do sistema |
| `text-md`  | 16px | 24px | 600 | Título de card, nome em lista |
| `text-lg`  | 18px | 26px | 600 | Título de seção, topbar |
| `text-xl`  | 20px | 28px | 600 | Título de página ("Resumo geral") |
| `text-2xl` | 24px | 32px | 700 | Número de KPI menor |
| `text-3xl` | 28px | 36px | 700 | Número de KPI / financeiro |
| `text-4xl` | 34px | 42px | 700 | Hero / big number (raro) |

### Pesos
| Nome | Valor | Uso |
|---|---|---|
| Regular | 400 | Corpo, descrições |
| Medium  | 500 | Labels, meta, badge, nav inativo |
| Semibold| 600 | Títulos, nav ativo, botões |
| Bold    | 700 | Números de destaque (KPI, valores) |

Nunca use 800/900 — pesado demais para a linguagem calma do sistema.

### Regras de tracking (letter-spacing)
- Títulos ≥ 20px: `-0.01em` (aperta levemente, ar premium).
- Labels em caixa alta (evitar; se usar): `+0.04em`.
- Corpo: `0`.

## 3.2 Espaçamento

| Token | px | Uso típico |
|---|---|---|
| `space-1`  | 4  | Gap ícone↔texto interno |
| `space-2`  | 8  | Padding de badge, gap de chips |
| `space-3`  | 12 | Gap entre linha de lista |
| `space-4`  | 16 | Padding interno de item, gap pequeno |
| `space-5`  | 20 | Gap entre cards |
| `space-6`  | 24 | Padding interno de card, gutter |
| `space-8`  | 32 | Padding de seção, margem de bloco |
| `space-10` | 40 | Respiro entre grandes blocos |
| `space-12` | 48 | Topo de seção principal |
| `space-16` | 64 | Espaçamento hero / vazio grande |

**Padrões fixos:** padding interno de card = `space-6` (24). Gap da grade do dashboard = `space-5`/`space-6` (20–24). Padding do conteúdo principal = `space-8` (32) no desktop.

## 3.3 Raio de borda (radius)

| Token | px | Uso |
|---|---|---|
| `radius-sm` | 8  | Input, botão pequeno, chip |
| `radius-md` | 10 | Botão padrão, dropdown item |
| `radius-lg` | 12 | Card interno, tooltip, menu |
| `radius-xl` | 16 | Card principal, painel, modal |
| `radius-2xl`| 20 | Card hero, bottom sheet |
| `radius-full`| 9999 | Avatar, badge/pill, toggle |

Regra: **card externo sempre com raio maior que o elemento interno** (16 fora, 8–10 dentro). Isso cria o efeito de "aninhamento" premium.

## 3.4 Sombra e elevação

Filosofia: elevação vem de **contraste + borda**, e a sombra só *confirma*. Sombra sempre difusa, baixa opacidade, cor fria (não preto puro).

### Light
| Token | Valor |
|---|---|
| `shadow-xs`  | `0 1px 2px rgba(16,24,40,.05)` |
| `shadow-sm`  | `0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)` |
| `shadow-md`  | `0 4px 12px rgba(16,24,40,.08)` |
| `shadow-lg`  | `0 12px 28px rgba(16,24,40,.12)` |
| `shadow-xl`  | `0 24px 48px rgba(16,24,40,.16)` |

### Dark
Sombra quase não aparece; use borda + um leve halo.
| Token | Valor |
|---|---|
| `shadow-sm`  | `0 1px 2px rgba(0,0,0,.40)` |
| `shadow-md`  | `0 6px 20px rgba(0,0,0,.45)` |
| `shadow-lg`  | `0 16px 40px rgba(0,0,0,.55)` |
| `glow-primary` | `0 0 0 1px rgba(124,92,255,.35), 0 0 24px rgba(124,92,255,.28)` |
| `glow-chart`   | linha do gráfico com `filter: drop-shadow(0 0 6px currentColor)` a 40% |

### Escala de elevação (combinação semântica)
| Nível | Onde | Light | Dark |
|---|---|---|---|
| 0 | Fundo do app | nenhuma | nenhuma |
| 1 | Card em repouso | `shadow-sm` + `border` | `border` apenas |
| 2 | Card em hover | `shadow-md`, +1px translateY(-1px) | `border-strong` + `shadow-sm` |
| 3 | Dropdown/menu/tooltip | `shadow-lg` + `border` | `shadow-md` + `border` |
| 4 | Modal/drawer | `shadow-xl` + `overlay` | `shadow-lg` + `overlay` |

## 3.5 Grid e container

- **Sidebar:** largura fixa `248px` (expandida) / `76px` (colapsada, só ícones).
- **Conteúdo:** ocupa o restante, com padding `space-8` (32) laterais no desktop.
- **Grade do dashboard:** 12 colunas, gap `24px`. Os 4 KPIs = 3 colunas cada. Blocos maiores usam 4/4/4 ou 8/4.
- **Container máximo de conteúdo:** `1440px` centralizado (o app pode ir full-width, mas o conteúdo não estica além disso em telas ultra-wide).
- **Topbar:** altura `64px`, fixa (sticky).

## 3.6 Breakpoints

| Token | min-width | Alvo |
|---|---|---|
| `sm` | 640px  | Celular grande / paisagem |
| `md` | 768px  | Tablet retrato |
| `lg` | 1024px | Tablet paisagem / laptop pequeno |
| `xl` | 1280px | Desktop |
| `2xl`| 1536px | Desktop grande |

Regra de layout: sidebar vira drawer/bottom-nav abaixo de `lg`. Grade de 4 KPIs vira 2×2 no `md` e 1 coluna no `sm`.

## 3.7 Z-index

| Token | Valor | Camada |
|---|---|---|
| `z-base`     | 0    | Conteúdo |
| `z-sticky`   | 100  | Cabeçalho de tabela sticky |
| `z-sidebar`  | 200  | Sidebar |
| `z-topbar`   | 300  | Topbar |
| `z-dropdown` | 1000 | Dropdown, popover, menu |
| `z-drawer`   | 1100 | Drawer lateral, bottom sheet |
| `z-overlay`  | 1200 | Backdrop de modal |
| `z-modal`    | 1300 | Modal |
| `z-toast`    | 1400 | Toast/notificação |
| `z-tooltip`  | 1500 | Tooltip (sempre por cima) |

## 3.8 Motion tokens

| Token | Valor | Uso |
|---|---|---|
| `duration-instant` | 100ms | Feedback de toque, cor de hover |
| `duration-fast`    | 150ms | Botão, chip, ícone |
| `duration-base`    | 200ms | Card hover, dropdown, tab |
| `duration-slow`    | 300ms | Modal, drawer, page transition |
| `duration-slower`  | 500ms | Skeleton, gráficos entrando |
| `ease-standard`    | `cubic-bezier(.4,0,.2,1)` | Padrão geral |
| `ease-out`         | `cubic-bezier(0,0,.2,1)` | Entradas (aparecer) |
| `ease-in`          | `cubic-bezier(.4,0,1,1)` | Saídas (sumir) |
| `ease-spring`      | `cubic-bezier(.34,1.56,.64,1)` | Micro-bounce (badge, toggle) — usar com parcimônia |

Regra transversal: **tudo respeita `prefers-reduced-motion: reduce`** → animações caem para `duration-instant` ou 0, sem parallax, sem bounce.

---

# Parte 4 — Hierarquia Visual e Layout

## 4.1 O caminho do olho (por ordem)

1. **Título da página + KPIs no topo.** É a primeira coisa que se lê: "Resumo geral" e os 4 números grandes. Números em `text-3xl` bold são âncoras — o olho pousa neles antes de qualquer texto.
2. **Cor da variação (verde/vermelho).** Logo abaixo do número, o `+12%` verde puxa o olhar como confirmação: "está indo bem?".
3. **O gráfico donut / bloco central.** Formas circulares e cores saturadas atraem depois dos números.
4. **Listas laterais (clientes recentes, agenda).** Ritmo de linhas + avatares. Lidas em varredura vertical.
5. **Ações rápidas e rodapé.** Último nível, periférico.

O layout força essa ordem por **tamanho** (números grandes primeiro), **cor** (acentos guiam), **posição** (topo-esquerda ganha) e **densidade** (blocos densos vêm depois dos esparsos).

## 4.2 Como o contraste foi construído

- **Contraste de tamanho:** número 28px vs. label 12px. Salto grande = hierarquia óbvia.
- **Contraste de peso:** bold (número) vs. medium (label) vs. regular (descrição).
- **Contraste de cor:** texto primário quase-preto vs. secundário cinza vs. muted apagado. Três degraus.
- **Contraste de fundo:** card branco sobre fundo cinza. Sutil, mas suficiente para "recortar" o card.
- **Contraste de acento:** violeta/verde só onde há ação ou status. O resto é neutro, então o acento nunca compete.

## 4.3 Espaço em branco e "respiro"

- **Respiro externo:** 24–32px entre cards. Nunca cards colados.
- **Respiro interno:** 24px de padding dentro do card; 12–16px entre linhas de lista.
- **Respiro de agrupamento:** título de seção separado do conteúdo por 16–20px; grupos relacionados ficam mais próximos entre si do que de grupos vizinhos (lei da proximidade).
- **Vazio proposital:** o gráfico financeiro tem margem generosa em volta da linha. O vazio faz o dado parecer importante.

## 4.4 Distribuição de cards (dashboard de referência)

```
┌──────────── Topbar (sticky, 64px) ─────────────┐
├─Side─┬──────────────────────────────────────────┤
│ nav  │  Título + filtros (Este mês / Personalizar)
│ 248  │  ┌ KPI ┐┌ KPI ┐┌ KPI ┐┌ KPI ┐   (4 × 3col)
│  px  │  └─────┘└─────┘└─────┘└─────┘
│      │  ┌ Donut(4) ┐┌ Recentes(4) ┐┌ Agenda(4) ┐
│      │  └──────────┘└─────────────┘│  + botão   │
│      │  ┌ Financeiro (8col) ───────┐└───────────┘
│      │  │ mini-KPIs + área chart   │┌ Ações(4) ┐
│      │  └──────────────────────────┘└──────────┘
│ plano│  ──────── footer ────────
└──────┴──────────────────────────────────────────┘
```

Princípio: **grade de 12 colunas, blocos de 4/4/4 e 8/4.** O olho lê em Z (topo → laterais → base). Informação de decisão (KPIs, financeiro) domina; informação de operação (listas) fica ao lado; ações ficam no canto de menor peso visual.

## 4.5 Organização da informação

- **Regra do "número, delta, tendência":** todo KPI mostra o valor, a variação (%) e uma mini-tendência (sparkline). Três camadas de leitura na mesma altura de olho.
- **Agrupamento por tema:** clientes (donut + recentes), tempo (agenda), dinheiro (financeiro), atalhos (ações). Cada card responde a uma pergunta.
- **Progressão de granularidade:** do resumo (KPI) → ao detalhe (lista) → à ação (botão). Nunca o contrário.

---

# Parte 5 — Componentes

Convenção: cada componente lista **tamanho, padding, raio, borda, sombra, espaçamento, alinhamento** e os **estados** (default, hover, active/pressed, focus, disabled, loading) + animação. Cores sempre via tokens da Parte 2.

## 5.1 Sidebar

- **Largura:** 248px expandida / 76px colapsada. Altura: 100vh, sticky.
- **Fundo:** `--color-sidebar`. Borda direita: `1px --color-border`.
- **Padding:** 16px lateral, 20px topo. Gap entre itens: 4px.
- **Logo:** topo, ícone gradiente 32px + wordmark 18px/600.
- **Item de nav:** altura 44px, padding 10px 12px, `radius-md` (10), gap ícone↔label 12px. Ícone 20px outline.
- **Rodapé:** card "Plano" (surface-2, radius-lg, padding 16) com barra de progresso + botão ghost; link "Ajuda e suporte" abaixo.

| Estado | Aparência |
|---|---|
| Default (inativo) | texto `--color-text-secondary`, ícone `--color-icon`, fundo transparente |
| Hover | fundo `--color-surface-2` (ou `--color-primary-soft` no dark), texto `--color-text` |
| Ativo | fundo gradiente da marca (ou `--color-primary`), texto branco, ícone branco; opcional barra de 3px à esquerda |
| Focus (teclado) | anel `--color-focus` 2px |
| Disabled | opacidade 45%, sem hover |

**Animação:** fundo e cor em `duration-fast` `ease-standard`. Colapso da sidebar: largura em `duration-base`; labels somem com fade `duration-instant`.

## 5.2 Topbar

- **Altura:** 64px, sticky, `z-topbar`. Fundo `--color-topbar` + borda inferior `1px`.
- **Layout:** [hamburger] [título da página] · · · [busca centralizada] · · · [+ ação] [sino c/ badge] [avatar + nome/cargo + chevron].
- **Busca:** input 380–460px, `radius-md`, ícone lupa à esquerda, atalho `⌘K` num chip à direita (`text-2xs`, `--color-surface-2`).
- **Botão +:** 40×40, `--color-primary`, `radius-md`, ícone branco. Abre menu de "criar".
- **Sino:** ícone ghost 40×40; badge vermelho pill no canto superior direito com contagem.
- **Avatar:** 36px circular + bloco de nome (14/600) e cargo (12/muted); chevron abre dropdown de conta.

**Estados:** botão `+` e sino seguem o padrão de botão-ícone (5.5). Busca: focus = borda `--color-primary` + anel de foco.

## 5.3 Card (contêiner base)

- **Fundo:** `--color-surface`. Borda: `1px --color-border`. Raio: `radius-xl` (16). Sombra: elevação 1.
- **Padding:** 24px. Título do card: `text-md` (16/600); ação/atalho no canto (ex. "Ver todos") em `text-sm` + `--color-primary`.
- **Header do card:** título à esquerda, link/ação à direita, alinhados na baseline. Divisória opcional abaixo (`--color-divider`).

| Estado | Aparência |
|---|---|
| Default | elevação 1 |
| Hover (se clicável) | elevação 2, `translateY(-1px)` |
| Focus (se link) | anel de foco no card inteiro |
| Loading | skeleton interno (5.20) |

**Animação:** hover em `duration-base` `ease-out`. Entrada do card (page load): fade + `translateY(8px→0)`, stagger de 40ms entre cards.

## 5.4 KPI Card

Variação do card, com anatomia própria:
- **Topo:** ícone em quadrado arredondado (40×40, fundo `*-soft` da cor semântica, ícone na cor cheia) + label (13/500 muted).
- **Meio:** número grande (`text-3xl` bold, tabular-nums).
- **Delta:** `+12%` na cor de status (verde/vermelho) + "vs mês anterior" em muted.
- **Base:** sparkline de 40–48px de altura, cor semântica, gradiente suave até transparente.
- **Opcional:** chevron `→` no canto (drill-down), como no card "Em aberto".

**Estados:** hover eleva (2) e revela chevron. Loading: número vira barra skeleton, sparkline vira retângulo shimmer. Sparkline desenha da esquerda p/ direita em `duration-slower` no primeiro load.

## 5.5 Botões

**Tamanhos**
| Size | Altura | Padding X | Fonte | Ícone |
|---|---|---|---|---|
| sm | 32px | 12px | 13/600 | 16px |
| md | 40px | 16px | 14/600 | 18px |
| lg | 48px | 20px | 15/600 | 20px |
Raio: `radius-md` (10). Gap ícone↔texto: 8px. Botão-ícone: quadrado do mesmo altura, ícone centralizado.

**Variantes**
| Variante | Repouso | Hover | Pressed | Disabled |
|---|---|---|---|---|
| **Primary** | `--color-primary`, texto branco, `shadow-xs` | `--color-primary-hover` + `shadow-sm` | `--color-primary-pressed`, `scale(.98)` | `--color-primary` @ 40%, sem sombra, cursor not-allowed |
| **Secondary** | `--color-secondary`, texto branco | `--color-secondary-hover` | escurece + `scale(.98)` | 40% |
| **Ghost/Tonal** | fundo `--color-surface-2`, texto `--color-text` | fundo `--color-border` | idem + scale | 40% |
| **Outline** | transparente, borda `--color-border-strong`, texto `--color-text` | fundo `--color-surface-2` | idem | borda apagada |
| **Text/Link** | só texto `--color-primary` | sublinhado ou `--color-primary-hover` | — | 40% |
| **Danger** | `--color-danger`, texto branco | `red-600` | escurece | 40% |

**Focus:** anel `--color-focus` 3px em todas as variantes.
**Loading:** spinner 16px substitui o ícone; label permanece; botão fica não-clicável (não muda de largura).
**Animação:** cor em `duration-fast`; `scale(.98)` no pressed em `duration-instant`. Nunca animar largura.

## 5.6 Inputs (texto, select, textarea)

- **Altura:** 40px (md) / 44px (lg em mobile). Padding: 10px 12px. Raio: `radius-sm` (8). Borda `1px --color-border`. Fundo `--color-surface`.
- **Label:** acima, 13/500, `--color-text-secondary`. Placeholder: `--color-text-muted`.
- **Ícone opcional:** à esquerda/direita, 18px, `--color-icon`.
- **Helper/erro:** abaixo, 12px; erro em `--color-danger`.

| Estado | Aparência |
|---|---|
| Default | borda `--color-border` |
| Hover | borda `--color-border-strong` |
| Focus | borda `--color-primary` + anel `--color-focus` 3px |
| Filled | idem default, texto `--color-text` |
| Error | borda `--color-danger` + anel vermelho suave + mensagem |
| Success | borda `--color-success` (usar com moderação) |
| Disabled | fundo `--color-surface-2`, texto muted, 60% |
| Loading | spinner à direita |

**Animação:** borda/anel em `duration-fast`. Label flutuante (se usar) sobe em `duration-base`.

## 5.7 Calendário

- **Container:** card, padding 24. Header: mês/ano (16/600) + setas ‹ › (botão-ícone ghost) + botão "Hoje" (outline sm).
- **Grade:** 7 colunas, células ~40px, gap 4. Cabeçalho de dias da semana em `text-xs` muted.
- **Dia:** número centralizado; hoje = círculo `--color-primary-soft` com número na cor da marca; selecionado = círculo `--color-primary` sólido, texto branco; dias fora do mês = muted 50%.
- **Evento no dia:** ponto/pílula na cor de status; até 3 visíveis, "+N" para o resto.

**Estados de dia:** hover = fundo `--color-surface-2`; disabled (bloqueado) = riscado/muted; range (seleção de período) = faixa `--color-primary-soft` contínua.
**Animação:** troca de mês = slide horizontal `duration-base` + fade; seleção = `scale` spring leve.

## 5.8 Agenda (timeline de horários)

Como no card "Agenda de hoje":
- **Linha:** hora (13/600, tabular) à esquerda com largura fixa (~48px) + barra/ponto de status + bloco de conteúdo (título 14/600 + subtítulo muted 13) + badge de status à direita.
- **Barra de acento:** 3px vertical à esquerda de cada item, na cor do status.
- **Espaçamento:** 12–16px entre itens; divisória fina opcional.
- **Rodapé:** botão primário/secundário "Nova reserva" full-width.

**Estados:** hover na linha = fundo `--color-surface-2`, revela ações (editar/cancelar). Item cancelado = título com opacidade 60% e badge vermelho. Arrastar (reagendar) = item ganha `shadow-lg` e segue o cursor.
**Animação:** entrada de itens em stagger; reordenação com FLIP (posição anima em `duration-base`).

## 5.9 Tabela

- **Header:** fundo `--color-surface-2`, texto `text-xs`/600 muted, sticky (`z-sticky`). Padding célula 12px 16px. Alinhamento: texto à esquerda, números à direita (tabular).
- **Linha:** altura ~52px, borda inferior `--color-divider`. Zebra opcional (`surface-2` alternado) — preferir sem zebra, só divisória.
- **Célula de ação:** botões-ícone ghost à direita, aparecem no hover da linha.
- **Seleção:** checkbox à esquerda; linha selecionada = fundo `--color-primary-soft`.
- **Paginação/rodapé:** contagem + controles à direita.

| Estado | Aparência |
|---|---|
| Hover linha | fundo `--color-surface-2`, ações visíveis |
| Selecionada | `--color-primary-soft` + checkbox marcado |
| Ordenação | seta no header + label da coluna em `--color-text` |
| Loading | 5–8 linhas skeleton |
| Vazia | empty state centralizado (ilustração leve + CTA) |

**Animação:** hover instant; ordenar = fade rápido do conteúdo; remover linha = colapso de altura `duration-base`.

## 5.10 Badges / Status pills

- **Formato:** pill (`radius-full`), altura 22–24px, padding 2px 10px, `text-xs`/600.
- **Cor:** fundo `*-soft`, texto na cor de status escura (ex. `green-50` + `green-700`). Ponto opcional 6px à esquerda na cor cheia.
- **Variantes:** Ativo/Confirmado (verde), Atenção/Pendente (âmbar), Sumido/Cancelado (vermelho), Info (ciano), Neutro (cinza).

**Estados:** estático por padrão; se clicável (filtro), hover escurece o soft em ~4%. Sem sombra, sem borda.
**Animação:** ao mudar de status, cross-fade de cor em `duration-base` + micro `scale` spring.

## 5.11 Avatar

- **Tamanhos:** 24 / 32 / 36 / 40 / 48px, circular.
- **Fallback:** iniciais sobre fundo derivado do nome (hash → cor de uma paleta suave), texto branco 600.
- **Status dot:** 8–10px no canto inferior direito, borda 2px na cor do surface (verde=online, cinza=offline).
- **Grupo:** avatares sobrepostos com -8px de margem + "+N" ao final.

**Estados:** hover em avatar clicável = anel `--color-border`; foco = anel de foco.

## 5.12 Dropdown / Menu / Popover

- **Container:** `--color-surface`, `radius-lg` (12), borda `1px`, elevação 3, padding 6px.
- **Item:** altura 36–40px, padding 8px 10px, `radius-md`, gap ícone↔texto 10px, `text-sm`.
- **Separador:** linha `--color-divider` com 4px de margem vertical.
- **Item destrutivo:** texto `--color-danger`, ícone idem; hover fundo `--color-danger-soft`.

| Estado | Aparência |
|---|---|
| Item hover/focus | fundo `--color-surface-2` |
| Item selecionado | check à direita + texto `--color-text` |
| Item disabled | 45%, sem hover |

**Animação:** abre com fade + `scale(.96→1)` a partir da origem (canto do gatilho), `duration-base` `ease-out`; fecha em `ease-in` `duration-fast`. Ancorado ao gatilho, com colisão de borda de tela.

## 5.13 Modal / Dialog

- **Overlay:** `--color-overlay` + `backdrop-filter: blur(2px)`.
- **Painel:** `--color-surface`, `radius-xl` (16–20), elevação 4, largura 420–560px (conteúdo), padding 24–32.
- **Estrutura:** header (título 18/600 + botão fechar ✕) · corpo · footer (ações alinhadas à direita: ghost "Cancelar" + primary "Confirmar").
- **Foco:** trap de foco dentro do modal; `Esc` fecha; foco inicial no primeiro campo ou no botão seguro.

**Animação:** overlay fade `duration-base`; painel entra com `translateY(12px→0)` + `scale(.98→1)` + fade `duration-slow` `ease-out`; sai em `ease-in` mais rápido. Respeita reduced-motion (só fade).

## 5.14 Drawer (painel lateral)

- **Posição:** direita (detalhes/edição) ou esquerda (nav mobile). Largura 380–480px (desktop) / 90vw (mobile).
- **Fundo:** `--color-surface`, borda do lado interno, elevação 4, overlay atrás.
- **Estrutura:** header sticky (título + fechar) · corpo scrollável · footer sticky com ações.

**Animação:** slide horizontal `duration-slow` `ease-out` (entra) / `ease-in` (sai) + overlay fade. Mobile: pode ter "arrastar para fechar".

## 5.15 Tooltip

- **Container:** `--color-text` como fundo (invertido) ou `--color-surface` + borda; `radius-md` (10); padding 6px 8px; `text-xs`; elevação 3; seta 6px.
- **Delay:** aparecer 400ms, sumir 100ms.
- **Alinhamento:** acima por padrão, com flip automático se colidir.

**Animação:** fade + `translateY(4px→0)` `duration-fast`. Sem tooltip em touch (usar press-and-hold ou dispensar).

## 5.16 Toast / Notification

- **Posição:** canto inferior direito (desktop) / topo (mobile), empilháveis, `z-toast`.
- **Container:** `--color-surface`, `radius-lg`, borda, elevação 3, padding 12px 16px, largura 320–380px.
- **Anatomia:** ícone de status à esquerda (cor semântica) + título 14/600 + descrição 13/muted + ✕ opcional + barra de progresso de auto-dismiss.
- **Tipos:** success / warning / error / info — cor no ícone e numa faixa de 3px à esquerda.

**Comportamento:** auto-dismiss 4–6s (erros não somem sozinhos), pausa no hover, ação opcional ("Desfazer").
**Animação:** entra por slide + fade da borda da tela `duration-base` `ease-out`; sai por fade + colapso; stack reposiciona com FLIP.

## 5.17 Menu / Tabs

**Tabs:**
- Underline style: label 14/500, ativo 600 `--color-text` com barra 2px `--color-primary` embaixo; inativo muted; hover = texto `--color-text`.
- Altura 40px, gap 24px entre tabs, borda inferior `--color-divider` na régua.
- **Animação:** a barra desliza de uma tab para a outra em `duration-base` `ease-standard` (indicador compartilhado). Conteúdo troca com fade rápido.

**Segmented control (alternativa):** fundo `--color-surface-2`, `radius-md`, item ativo = pílula `--color-surface` + sombra xs que desliza.

## 5.18 Timeline

- **Eixo:** linha vertical 2px `--color-border` à esquerda; nós circulares 12px na cor de status, com anel do surface.
- **Item:** hora/data muted + título 14/600 + descrição 13. Padding esquerdo 24px (após o eixo).
- **Agrupamento por dia:** cabeçalho "Hoje / Ontem / 12 mai".

**Animação:** nós e linhas revelam de cima para baixo com stagger no primeiro load.

## 5.19 Breadcrumb

- **Formato:** `Início / Clientes / Juliana Martins`. Separador chevron 14px muted. Último item = `--color-text` 500 (atual, não clicável); anteriores = `--color-text-secondary`, hover `--color-primary`.
- **Tamanho:** `text-sm`. Colapsa o meio em `…` quando muito longo.

## 5.20 Footer

- **Conteúdo:** copyright à esquerda (`© 2024 GestorPro...`, `text-xs` muted) + versão à direita.
- **Separação:** borda superior `--color-divider`, padding 24px. Discreto, nunca compete.

## 5.21 Quick Actions

- **Grade:** 2–3 colunas de botões-card. Cada card: ícone 24px em quadrado `*-soft` no topo + label 13/500 embaixo, centralizado.
- **Tamanho:** ~96px altura, `radius-lg`, borda, fundo `--color-surface`.
- **Estados:** hover = elevação 2 + ícone ganha cor cheia; active = `scale(.98)`.
- **Animação:** hover `duration-base`; ícone muda de cor `duration-fast`.

## 5.22 Skeleton / Loading (transversal)

- **Skeleton:** blocos `--color-surface-2` com shimmer (gradiente que atravessa) em `duration-slower` loop. Raio igual ao do conteúdo real. Preserva o layout (mesma altura/largura) para evitar "pulo".
- **Spinner:** anel 16/20/24px, 2px de traço, `--color-primary`, rotação 700ms linear infinita.
- **Progress bar:** trilha `--color-surface-2` + preenchimento `--color-primary`, altura 6px, `radius-full`.
- **Regra:** conteúdo abaixo de ~300ms não mostra loader (evita flicker). Acima disso, skeleton > spinner sempre que possível.

## 5.23 Empty state

- Ilustração leve/linear ou ícone grande muted + título 16/600 + descrição 13/muted + CTA primário. Centralizado, com respiro generoso. Voz de direção, não de desculpa: *"Nenhum cliente ainda. Cadastre o primeiro para começar."* + botão "Novo cliente".

## 5.24 Charts (padrões visuais)

- **Linha/área:** traço 2px na cor semântica, preenchimento em gradiente da cor a 12% → transparente. Pontos só no hover. Grade horizontal fina `--color-divider`, sem grade vertical. Eixos em `text-xs` muted.
- **Donut:** anel espesso, gap 2px entre fatias, cores de status; total no centro (número bold + label). Legenda ao lado com valor + %.
- **Comparação temporal:** série atual sólida colorida + série anterior tracejada cinza.
- **Dark:** linhas ganham `glow-chart` leve; grade mais fraca.
- **Tooltip de chart:** card pequeno (surface, radius-md, elevação 3) com data + valor formatado.
- **Animação:** linhas desenham da esquerda p/ direita `duration-slower` no load; donut preenche por rotação; hover destaca a série (as outras caem para 40% de opacidade).

---

# Parte 6 — Motion Design

Filosofia: **movimento confirma, não entretém.** Cada animação tem um propósito funcional (dar feedback, mostrar origem/destino, guiar o olho). Excesso de movimento é a maior denúncia de interface amadora — então quando na dúvida, faça menos e mais rápido.

Tabela mestre (duração · easing · intensidade · objetivo · quando usar · quando evitar):

| Animação | Duração | Easing | Intensidade | Objetivo | Quando usar | Quando evitar |
|---|---|---|---|---|---|---|
| **Hover (botão/link)** | 100–150ms | standard | baixa | feedback de que é clicável | sempre em elementos interativos | em elementos não-interativos |
| **Card hover** | 200ms | ease-out | baixa (`-1px` + sombra) | sugerir clique/profundidade | cards clicáveis | cards estáticos (não levantar) |
| **Page transition** | 250–300ms | ease-out | média (fade + `8px` slide) | continuidade entre telas | troca de rota principal | dentro da mesma tela |
| **Sidebar colapso** | 200ms | standard | média (width) | mostrar mudança de estado | toggle de menu | — |
| **Modal** | 300ms in / 200ms out | ease-out/in | média (`scale .98→1` + fade) | foco, origem no centro | abrir diálogo | conteúdo trivial |
| **Dropdown/Popover** | 150–200ms | ease-out | baixa (`scale .96→1`) | mostrar de onde veio | menus, popovers | — |
| **Tooltip** | 150ms (delay 400ms) | ease-out | mínima (fade + `4px`) | informação sob demanda | ícones/ações ambíguas | touch |
| **Accordion** | 200ms | standard | média (altura) | revelar conteúdo | FAQ, seções | listas longas (usar página) |
| **Skeleton shimmer** | 500ms loop | linear | baixa | indicar carregamento | fetch > 300ms | dados instantâneos |
| **Spinner** | 700ms loop | linear | baixa | processo indeterminado | ação sem progresso mensurável | quando há % (usar barra) |
| **Dashboard load (stagger)** | 200ms, +40ms/card | ease-out | média | entrada organizada | primeiro render do dashboard | re-render de dado |
| **Charts entrando** | 500ms | ease-out | média (draw/preencher) | dar vida ao dado | primeira exibição do gráfico | atualização em tempo real |
| **Calendário troca mês** | 200ms | standard | média (slide + fade) | direção temporal | navegar meses | — |
| **Agenda reorder / drag** | 200ms | standard | média (FLIP) | mostrar reposicionamento | reagendar arrastando | — |
| **Botão pressed** | 100ms | standard | baixa (`scale .98`) | tato | todo botão | — |
| **Micro-interação badge** | 200ms | spring | baixa (`scale` pulse) | comemorar mudança de status | mudança de status pontual | em massa (várias ao vez) |
| **Scroll reveal** | 400ms | ease-out | baixa (fade + `12px`) | hierarquia progressiva | landing page | dentro do app (distrai) |
| **Parallax** | — | — | mínima | profundidade sutil | hero da landing | no app/dashboard (nunca) |
| **Mouse glow / cursor** | — | — | mínima | requinte na landing | landing hero | no app (nunca) |

## 6.1 Onde cada tecnologia entra

- **CSS transitions/animations:** 90% dos casos — hover, foco, cor, sombra, `scale`, skeleton, spinner. É o padrão. Mais leve, sem JS.
- **Framer Motion (React/Next):** entradas/saídas com `AnimatePresence` (modal, drawer, toast), `layout`/FLIP (reorder de agenda, stack de toasts), stagger de dashboard, transições de página. É a ferramenta principal do app.
- **GSAP:** reservado para a **landing page** (sequências orquestradas, scroll-trigger, draw de SVG do hero). Dentro do produto, evitar — Framer + CSS bastam e são mais previsíveis.

## 6.2 Regras invioláveis de motion

1. Nunca anime `width`/`height`/`top`/`left` quando `transform` (`translate`/`scale`) resolve — performance.
2. Nunca anime a largura de um botão ao trocar para loading — troque o conteúdo, mantenha a caixa.
3. `prefers-reduced-motion: reduce` → tudo vira fade curto ou nada. Sem slide, sem bounce, sem parallax.
4. Um "momento" orquestrado (load do dashboard) vale mais que dez efeitos espalhados. Gaste o movimento em um lugar.
5. Saídas são ~30% mais rápidas que entradas (o usuário já decidiu; não faça esperar).

---

# Parte 7 — UX por Tela

Princípio comum: **resumo no topo, ação à mão, detalhe sob demanda.** Toda tela responde primeiro "como estão as coisas?" e depois "o que faço agora?".

## 7.1 Dashboard
- Topo: 4 KPIs (o resumo de decisão). Escolha os 4 mais acionáveis do nicho, mas com rótulos neutros.
- Meio: um bloco de "distribuição" (donut de status), um de "operação" (listas: recentes / agenda) e um de "dinheiro" (financeiro com tendência).
- Canto de menor peso: ações rápidas.
- Filtro de período global (Este mês / Personalizar) afeta todos os cards.
- **Regra:** dashboard é leitura, não formulário. Nenhuma edição pesada aqui — só atalhos que abrem drawers/modais.

## 7.2 Clientes
- **Lista:** tabela com busca + filtros (status, período, tag). Colunas: avatar+nome, contato, último atendimento, status (badge), ações. Ordenável.
- **Perfil do cliente:** drawer ou página com header (avatar, nome, status, ações) + tabs (Visão geral · Histórico · Financeiro · Notas).
- **Ação primária:** "Novo cliente" (botão primário fixo no topo direito).
- Estado de reativação (o seu caso de uso): destacar clientes "Atenção/Sumido" com CTA de reengajar.

## 7.3 Agenda
- **Visões:** dia / semana / mês (tabs ou segmented). Padrão: dia (timeline da 5.8).
- **Criar:** botão "Nova reserva" (secundário/teal) abre modal com cliente, serviço, horário.
- **Drag-to-reschedule** na visão semana. Conflitos = destaque vermelho.
- Filtro por profissional/recurso (neutro: "responsável").

## 7.4 Financeiro
- KPIs no topo (Receita, Despesas, Lucro, A receber).
- Gráfico de tendência (atual vs. anterior, tracejado).
- Tabela de lançamentos com filtro por tipo/período; entrada/saída em verde/vermelho; badge de status (pago/pendente/atrasado).
- Ação: "Lançar receita/despesa" via modal.

## 7.5 Relatórios
- Seletor de relatório + período. Cada relatório = header com KPIs-resumo + 1–2 gráficos + tabela detalhada.
- Botão "Exportar" (PDF/CSV) discreto (outline).
- Empty state quando não há dado no período.

## 7.6 Área do Cliente (portal externo)
- Visual mais leve/limpo, mesmo sistema de tokens mas com menos densidade.
- Cliente vê: próximos agendamentos, histórico, botão "Agendar" (secundário), dados de contato.
- Sem sidebar administrativa — nav simplificada (topbar + poucas seções).

## 7.7 Perfil / Conta
- Tabs: Dados · Segurança · Preferências · Notificações.
- Formulários em cards, um assunto por card, botão "Salvar alterações" sticky no rodapé do card (aparece só quando há mudança).

## 7.8 Configurações
- Layout de duas colunas: nav de seções à esquerda (dentro do conteúdo) + painel à direita.
- Seções: Empresa, Equipe/Permissões (RBAC), Serviços, Integrações, Faturamento/Plano, Aparência (tema claro/escuro).
- Toggle de tema aqui + respeito ao `prefers-color-scheme` do sistema por padrão.

## 7.9 Landing Page
- É o único lugar onde o movimento pode ser mais expressivo (GSAP, scroll-reveal, mouse glow, parallax sutil no hero).
- Hero = a coisa mais característica do produto (um print real do dashboard com glow, ou um número forte de resultado).
- Mesmos tokens de cor/tipo → coerência entre marketing e produto. O usuário que clica em "Entrar" sente que já conhece o app.

## 7.10 Desktop / Tablet / Mobile (resumo de adaptação)
- **Desktop (≥1280):** layout completo, sidebar expandida, grade 12 col.
- **Tablet (768–1024):** sidebar colapsa para ícones (76px); KPIs 2×2; listas empilham.
- **Mobile (<768):** sidebar → drawer/bottom-nav; tudo em 1 coluna; ver Parte 8.

---

# Parte 8 — Mobile e Responsividade

Princípio: **mesma linguagem, densidade menor, polegar no comando.** Nada de "espremer o desktop" — reorganizar para o toque.

## 8.1 Navegação

- **Sidebar → Bottom Navigation:** barra fixa inferior com 4–5 itens principais (Dashboard, Clientes, Agenda, Financeiro + "Mais"). Ícone 24px + label 11px. Ativo = ícone/label na cor da marca; inativo muted. Altura 56–64px + safe-area do iOS. Fundo `--color-surface` + borda superior.
- **"Mais":** abre bottom sheet com o resto do menu (Relatórios, Config, etc.).
- **Topbar mobile:** simplificada — título + busca (ícone que expande) + avatar. Sem breadcrumb.

## 8.2 FAB (Floating Action Button)

- Botão circular 56px, `--color-primary`, ícone `+` branco, sombra `shadow-lg`, canto inferior direito (acima do bottom-nav, com margem 16px).
- Ação: criar (cliente/agendamento/venda). Toque pode abrir mini-speed-dial (2–4 opções que sobem com stagger).
- Some/reaparece ao rolar (esconde no scroll down, mostra no scroll up) — `duration-base`.

## 8.3 Bottom Sheet

- Substitui dropdowns e modais grandes no mobile. Sobe de baixo, `radius-2xl` só no topo, "grabber" (barra 36×4 muted) no topo.
- Alturas: peek (25%), half (50%), full (90%). Arrasta para expandir/fechar.
- Overlay atrás; toque fora fecha.
- **Animação:** slide-up `duration-slow` `ease-out`; fechar por arraste segue o dedo (física), solta abaixo do limiar → fecha.

## 8.4 Gestos

- **Swipe horizontal em item de lista:** revela ações (editar / arquivar / excluir) — cores neutra/vermelha.
- **Pull-to-refresh:** no topo de listas/dashboard — spinner da marca.
- **Swipe entre tabs/dias da agenda:** troca com slide.
- **Long-press:** seleção múltipla / menu contextual.
- Regra: todo gesto tem também um caminho por toque visível (gesto é atalho, não a única via).

## 8.5 Responsividade de componentes

| Componente | Adaptação mobile |
|---|---|
| **KPIs** | 1 coluna (empilhados) ou carrossel horizontal com snap; número mantém `text-2xl` |
| **Cards** | full-width, padding 16 (não 24), gap 12 |
| **Calendário** | visão de mês compacta; toque no dia → bottom sheet com eventos |
| **Tabela** | vira lista de cards (cada linha = card com label:valor) — tabelas não rolam bem no toque |
| **Agenda** | timeline full-width, badges menores, hora à esquerda estreita |
| **Charts** | altura reduzida, menos labels de eixo, tooltip por toque |
| **Modal** | vira bottom sheet |
| **Dropdown** | vira bottom sheet ou action sheet |
| **Botões** | altura 44–48px (alvo de toque), largura full em ações primárias de formulário |

## 8.6 Regras de toque

- Alvo mínimo: **44×44px** (48 preferível). Espaço mínimo entre alvos: 8px.
- Respeitar `safe-area-inset` (notch/home bar do iOS) em topbar, bottom-nav e FAB.
- Sem hover-dependente: toda informação de hover tem equivalente por toque (press, sheet, ou sempre visível).

---

# Anexo — Implementação

## A.1 CSS Variables (base do tema)

```css
/* globals.css */
:root {
  /* radius */
  --radius-sm: 8px;  --radius-md: 10px; --radius-lg: 12px;
  --radius-xl: 16px; --radius-2xl: 20px; --radius-full: 9999px;

  /* spacing (px) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
  --space-12: 48px; --space-16: 64px;

  /* motion */
  --dur-instant: 100ms; --dur-fast: 150ms; --dur-base: 200ms;
  --dur-slow: 300ms; --dur-slower: 500ms;
  --ease-standard: cubic-bezier(.4,0,.2,1);
  --ease-out: cubic-bezier(0,0,.2,1);
  --ease-in: cubic-bezier(.4,0,1,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);

  /* brand gradient */
  --gradient-primary: linear-gradient(135deg,#7C3AE3 0%,#6423BE 100%);
}

/* LIGHT (default) */
:root {
  --color-primary:#7C3AE3; --color-primary-hover:#6B27D4; --color-primary-pressed:#5A16BA;
  --color-primary-soft:#F3EAFE;
  --color-secondary:#14B8A6; --color-secondary-hover:#0D9488;
  --color-bg:#F6F7F9; --color-surface:#FFFFFF; --color-surface-2:#F9FAFB;
  --color-sidebar:#FFFFFF; --color-topbar:#FFFFFF; --color-hover:#EEF0F3;
  --color-border:#E8EAEE; --color-border-strong:#E5E7EB; --color-divider:#EEF0F3;
  --color-text:#16181D; --color-text-secondary:#667085; --color-text-muted:#98A2B3;
  --color-text-on-primary:#FFFFFF; --color-icon:#667085;
  --color-success:#22C55E; --color-success-soft:#E9FBF0;
  --color-warning:#F59E0B; --color-warning-soft:#FEF6E7;
  --color-danger:#EF4444;  --color-danger-soft:#FDECEC;
  --color-info:#3B82F6;
  --color-overlay:rgba(16,18,29,.48); --color-glass:rgba(255,255,255,.72);
  --color-focus:rgba(124,58,227,.45);
  --shadow-sm:0 1px 3px rgba(16,24,40,.06),0 1px 2px rgba(16,24,40,.04);
  --shadow-md:0 4px 12px rgba(16,24,40,.08);
  --shadow-lg:0 12px 28px rgba(16,24,40,.12);
  --shadow-xl:0 24px 48px rgba(16,24,40,.16);
}

/* DARK — navy canônico (não neutro genérico) */
:root[data-theme="dark"], .dark {
  --color-primary:#7C3AE3; --color-primary-hover:#BB5CF6; --color-primary-pressed:#7C3AE3;
  --color-primary-soft:rgba(124,58,227,.16);
  --color-secondary:#2DD4BF; --color-secondary-hover:#5EE7D2;
  --color-bg:#0B1220; --color-surface:#111827; --color-surface-2:#1A2333;
  --color-sidebar:#0D1524; --color-topbar:#0E1728; --color-hover:#202B3E;
  --color-border:rgba(148,163,184,.12); --color-border-strong:rgba(148,163,184,.20);
  --color-divider:rgba(148,163,184,.08);
  --color-text:#F8FAFC; --color-text-secondary:#94A3B8; --color-text-muted:#64748B;
  --color-text-on-primary:#FFFFFF; --color-icon:#94A3B8;
  --color-success:#4ADE80; --color-success-soft:rgba(34,197,94,.14);
  --color-warning:#FBBF24; --color-warning-soft:rgba(245,158,11,.14);
  --color-danger:#F87171;  --color-danger-soft:rgba(239,68,68,.14);
  --color-info:#60A5FA;
  --color-overlay:rgba(0,0,0,.64); --color-glass:rgba(17,24,39,.72);
  --color-focus:rgba(124,58,227,.55);
  --shadow-sm:0 1px 2px rgba(0,0,0,.40);
  --shadow-md:0 6px 20px rgba(0,0,0,.45);
  --shadow-lg:0 16px 40px rgba(0,0,0,.55);
  --shadow-xl:0 24px 56px rgba(0,0,0,.6);
  --glow-primary:0 0 0 1px rgba(124,58,227,.35), 0 0 28px rgba(124,58,227,.25);
}

@media (prefers-reduced-motion: reduce) {
  * { animation-duration:.01ms !important; transition-duration:.01ms !important; }
}
```

## A.2 tailwind.config.ts (mapeando os tokens)

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          pressed: "var(--color-primary-pressed)",
          soft: "var(--color-primary-soft)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          hover: "var(--color-secondary-hover)",
        },
        bg: "var(--color-bg)",
        surface: { DEFAULT: "var(--color-surface)", 2: "var(--color-surface-2)" },
        sidebar: "var(--color-sidebar)",
        topbar: "var(--color-topbar)",
        hover: "var(--color-hover)",
        border: { DEFAULT: "var(--color-border)", strong: "var(--color-border-strong)" },
        divider: "var(--color-divider)",
        text: {
          DEFAULT: "var(--color-text)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          onPrimary: "var(--color-text-on-primary)",
        },
        success: { DEFAULT: "var(--color-success)", soft: "var(--color-success-soft)" },
        warning: { DEFAULT: "var(--color-warning)", soft: "var(--color-warning-soft)" },
        danger:  { DEFAULT: "var(--color-danger)",  soft: "var(--color-danger-soft)"  },
        info: "var(--color-info)",
      },
      borderRadius: {
        sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)",
        xl: "var(--radius-xl)", "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)", md: "var(--shadow-md)",
        lg: "var(--shadow-lg)", xl: "var(--shadow-xl)",
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      fontSize: {
        "2xs": ["11px", "14px"], xs: ["12px", "16px"], sm: ["13px", "20px"],
        base: ["14px", "22px"], md: ["16px", "24px"], lg: ["18px", "26px"],
        xl: ["20px", "28px"], "2xl": ["24px", "32px"], "3xl": ["28px", "36px"],
        "4xl": ["34px", "42px"],
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.4,0,.2,1)",
        "ease-out-soft": "cubic-bezier(0,0,.2,1)",
        spring: "cubic-bezier(.34,1.56,.64,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

## A.3 Como usar isto no Claude Code

Coloque este arquivo no repo (ex. `docs/design-system.md`) e referencie no seu `CLAUDE.md`:

```md
## Design System
Toda UI deve seguir docs/design-system.md.
Use SEMPRE tokens semânticos (bg-surface, text-secondary, text-primary,
shadow-sm, rounded-xl...), nunca hex direto. Componentes referenciam
tokens; tokens referenciam primitivos. Suportar light e dark via
data-theme. Respeitar prefers-reduced-motion. Alvo de toque ≥ 44px.
```

Assim, quando você pedir "cria a tela de Clientes", o Claude Code já parte deste vocabulário e as telas saem consistentes sem você ter que repetir as regras toda vez.

---

## Checklist de conformidade (cole no fim de cada PR de tela)

- [ ] Usa só tokens semânticos (nenhum hex solto).
- [ ] Funciona em light **e** dark.
- [ ] Card = `rounded-xl` + `border` + `shadow-sm`; interno com raio menor.
- [ ] Um único acento de marca por contexto.
- [ ] Status seguem o mapa fixo de cores.
- [ ] Foco de teclado visível em todo interativo.
- [ ] Alvos de toque ≥ 44px no mobile.
- [ ] Animações ≤ 300ms, com propósito, respeitando reduced-motion.
- [ ] Empty state e loading (skeleton) previstos.
- [ ] Números com `tabular-nums`.

---

*Fim do manual. Mantenha este documento como fonte única da verdade visual do GestorPro. Ao evoluir, versione (1.1, 1.2...) e registre o que mudou.*
