# Reativações + Feed de Movimentação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar reativações no banco ao clicar "Mandar mensagem", criar aba de feed de atividades ("Movimentação") com filtro temporal, e adicionar card de resumo no dashboard.

**Architecture:** A tabela `reativacoes` é inserida pelo usuário ao clicar no botão de WhatsApp. A aba Movimentação faz 3–4 queries em paralelo (clientes formulário, atendimentos+cliente, reativações+cliente, aniversariantes hoje), mescla no frontend e ordena por `criado_em desc`. O dashboard soma essas 3 fontes nas últimas 24h para o card.

**Tech Stack:** Next.js App Router, Supabase (anon key + RLS), Tailwind CSS, TypeScript.

---

## Global Constraints

- Não alterar RLS, policies, schema ou lógica de negócio existentes.
- Não remover nem modificar nenhuma tabela ou coluna existente.
- `salao_id` deve ser passado corretamente em todos os INSERTs novos.
- Mobile-first (375px), botões mínimo 44px de altura.
- Sem bibliotecas de UI externas (sem shadcn, MUI, etc.).
- Todos os arquivos em TypeScript sem `any`.
- Variáveis de domínio em português, infraestrutura em inglês.
- Tratamento de erro obrigatório em toda chamada ao Supabase.

---

## File Map

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Modify | `types/index.ts` | Adicionar `ItemMovimentacao`, `FiltroMovimentacao` |
| Modify | `components/icons.tsx` | Adicionar `IconeMovimentacao` |
| Modify | `app/(dashboard)/reativar/page.tsx` | Carregar `salao_id`; INSERT em `reativacoes` ao clicar |
| Create | `app/(dashboard)/movimentacao/page.tsx` | Feed de atividades com filtro |
| Modify | `app/(dashboard)/layout.tsx` | Item "Movimentação" no menu hambúrguer |
| Modify | `app/(dashboard)/page.tsx` | Card "Movimentações hoje" (24h), clicável |

---

### Task 0 (manual): Rodar SQL no Supabase

**Este passo é manual — execute no editor SQL do Supabase antes de continuar.**

```sql
create table if not exists public.reativacoes (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null references public.salao_config(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.reativacoes enable row level security;

create policy "owner pode ler reativacoes"
  on public.reativacoes for select to authenticated
  using (salao_id = (select id from public.salao_config where user_id = auth.uid()));

create policy "owner pode inserir reativacoes"
  on public.reativacoes for insert to authenticated
  with check (salao_id = (select id from public.salao_config where user_id = auth.uid()));
```

Verifique que a tabela aparece no painel de tables do Supabase antes de prosseguir.

---

### Task 1: Tipos + Ícone

**Files:**
- Modify: `types/index.ts`
- Modify: `components/icons.tsx`

**Interfaces:**
- Produces:
  - `FiltroMovimentacao = '24h' | 'semana' | 'mes'`
  - `ItemMovimentacao = { id: string; tipo: 'cadastro' | 'atendimento' | 'reativacao' | 'aniversario' | 'resumo_mes'; descricao: string; criado_em: string; href?: string }`
  - `IconeMovimentacao` component (SVG, width/height 18)

- [ ] **Step 1: Adicionar tipos em `types/index.ts`**

Abrir `types/index.ts`. Append no final do arquivo:

```ts
export type FiltroMovimentacao = '24h' | 'semana' | 'mes'

export type TipoMovimentacao =
  | 'cadastro'
  | 'atendimento'
  | 'reativacao'
  | 'aniversario'
  | 'resumo_mes'

export type ItemMovimentacao = {
  id: string
  tipo: TipoMovimentacao
  descricao: string
  criado_em: string
  href?: string
}
```

- [ ] **Step 2: Adicionar `IconeMovimentacao` em `components/icons.tsx`**

Append no final de `components/icons.tsx`:

```tsx
export function IconeMovimentacao() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts components/icons.tsx
git commit -m "feat: tipos ItemMovimentacao e ícone de movimentação"
```

---

### Task 2: Registrar reativação ao clicar "Mandar mensagem"

**Files:**
- Modify: `app/(dashboard)/reativar/page.tsx`

**Interfaces:**
- Consumes: `ClienteReativar` de `types/index.ts` (já existe); `supabase` de `@/lib/supabase`
- Produces: INSERT em `reativacoes(salao_id, cliente_id)` a cada clique no botão de WhatsApp

**Context:** O arquivo atual carrega clientes da view `clientes_status`. Não tem `salao_id`. Precisamos:
1. Buscar `salao_id` em paralelo com os clientes.
2. Ao clicar no link do WhatsApp, fazer INSERT em `reativacoes` antes de abrir o link.

Como o link é uma tag `<a>`, converter para `<button>` que chama uma função `handleReativar(cliente)`.

- [ ] **Step 1: Substituir o conteúdo completo de `app/(dashboard)/reativar/page.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { textoSemAparecer } from '@/lib/formatters'
import { SkeletonLista } from '@/components/SkeletonLista'
import { IconeVoltar, IconeWhatsApp } from '@/components/icons'
import type { ClienteReativar } from '@/types'

function BadgeStatus({ status }: { status: 'vermelho' | 'amarelo' }) {
  return (
    <span
      className={`mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full ${
        status === 'vermelho' ? 'bg-red-500' : 'bg-yellow-400'
      }`}
    />
  )
}

function montarLinkWhatsApp(cliente: ClienteReativar): string {
  const primeiroNome = cliente.nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! 💅 Senti sua falta aqui no salão. Faz um tempinho que você não aparece — bora marcar um horário pra deixar essas unhas em dia? 😊`
  return `https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(mensagem)}`
}

export default function ReativarPage() {
  const [clientes, setClientes] = useState<ClienteReativar[]>([])
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      const [{ data: statusData, error: statusError }, { data: configData }] =
        await Promise.all([
          supabase
            .from('clientes_status')
            .select('id, nome, whatsapp, dias_desde_ultima_visita, status')
            .or('status.eq.vermelho,status.eq.amarelo'),
          supabase.from('salao_config').select('id').single(),
        ])

      try {
        if (statusError) throw statusError
        const ordenados = ((statusData ?? []) as ClienteReativar[]).sort((a, b) => {
          if (a.status !== b.status) return a.status === 'vermelho' ? -1 : 1
          return b.dias_desde_ultima_visita - a.dias_desde_ultima_visita
        })
        setClientes(ordenados)
        if (configData) setSalaoId(configData.id)
      } catch {
        setErro('Não foi possível carregar. Tente novamente.')
      }

      setCarregando(false)
    }

    carregar()
  }, [])

  async function handleReativar(cliente: ClienteReativar) {
    if (salaoId) {
      setEnviando(cliente.id)
      await supabase
        .from('reativacoes')
        .insert({ salao_id: salaoId, cliente_id: cliente.id })
      setEnviando(null)
    }
    window.open(montarLinkWhatsApp(cliente), '_blank', 'noopener,noreferrer')
  }

  const totalSumidas = clientes.filter((c) => c.status === 'vermelho').length

  function subtitulo(): string {
    if (carregando || erro) return ''
    if (totalSumidas === 0) return 'Nenhuma sumida — só atenção'
    if (totalSumidas === 1) return '1 cliente sumida há mais de 60 dias'
    return `${totalSumidas} clientes sumidas há mais de 60 dias`
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Link
            href="/clientes"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Voltar para lista de clientes"
          >
            <IconeVoltar />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Clientes para reativar
            </h1>
            {!carregando && !erro && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitulo()}</p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={4} comBotao />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : clientes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl" aria-hidden="true">
              🎉
            </span>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Nenhuma cliente sumida no momento
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Todas as suas clientes estão em dia!
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {clientes.map((cliente) => (
              <li
                key={cliente.id}
                className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-800"
              >
                <div className="flex gap-3">
                  <BadgeStatus status={cliente.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {cliente.nome}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {textoSemAparecer(cliente.dias_desde_ultima_visita)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleReativar(cliente)}
                  disabled={enviando === cliente.id}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-500 text-sm font-semibold text-white transition hover:bg-green-600 active:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <IconeWhatsApp />
                  {enviando === cliente.id ? 'Abrindo…' : 'Mandar mensagem'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/reativar/page.tsx"
git commit -m "feat: registrar reativação no banco ao clicar Mandar mensagem"
```

---

### Task 3: Página de Movimentação

**Files:**
- Create: `app/(dashboard)/movimentacao/page.tsx`

**Interfaces:**
- Consumes: `ItemMovimentacao`, `FiltroMovimentacao` de `types/index.ts`
- Consumes: `supabase` de `@/lib/supabase`
- Consumes: `SkeletonLista` de `@/components/SkeletonLista`

**Logic overview:**
- Estado: `filtro: FiltroMovimentacao` (default `'24h'`)
- Ao montar e ao mudar filtro: buscar `salao_id` + queries paralelas
- Cutoff calculado como: `24h` = agora − 24h; `semana` = agora − 7d; `mes` = agora − 30d
- Queries paralelas (todas com `.gte('criado_em', cutoff.toISOString())`):
  1. `clientes` where `origem = 'formulario'` — selects `id, nome, criado_em`
  2. `atendimentos` — selects `id, servico, criado_em, clientes(nome)`
  3. `reativacoes` — selects `id, criado_em, clientes(nome)`
- Query separada (sem cutoff): `clientes` where `data_nascimento` não nulo → filtrar client-side para hoje (mesmo mês e dia)
- Se hoje é dia 1 do mês: contar aniversariantes do mês atual para card especial
- Montar array de `ItemMovimentacao`, `sort((a,b) => b.criado_em.localeCompare(a.criado_em))`
- Renderizar cada item com `formatarDataHora(criado_em)` (helper local) + ícone + descrição

**Helpers locais no arquivo:**

```ts
function calcularCutoff(filtro: FiltroMovimentacao): Date {
  const agora = new Date()
  if (filtro === '24h') return new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  if (filtro === 'semana') return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function iconeParaTipo(tipo: TipoMovimentacao): string {
  if (tipo === 'cadastro') return '👤'
  if (tipo === 'atendimento') return '✂️'
  if (tipo === 'reativacao') return '💬'
  if (tipo === 'aniversario') return '🎂'
  return '📅'
}
```

- [ ] **Step 1: Criar `app/(dashboard)/movimentacao/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SkeletonLista } from '@/components/SkeletonLista'
import type { FiltroMovimentacao, ItemMovimentacao, TipoMovimentacao } from '@/types'

function calcularCutoff(filtro: FiltroMovimentacao): Date {
  const agora = new Date()
  if (filtro === '24h') return new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  if (filtro === 'semana') return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
}

function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function iconeParaTipo(tipo: TipoMovimentacao): string {
  const mapa: Record<TipoMovimentacao, string> = {
    cadastro: '👤',
    atendimento: '✂️',
    reativacao: '💬',
    aniversario: '🎂',
    resumo_mes: '📅',
  }
  return mapa[tipo]
}

const OPCOES_FILTRO: { valor: FiltroMovimentacao; rotulo: string }[] = [
  { valor: '24h', rotulo: 'Últimas 24h' },
  { valor: 'semana', rotulo: 'Última semana' },
  { valor: 'mes', rotulo: 'Último mês' },
]

export default function MovimentacaoPage() {
  const [filtro, setFiltro] = useState<FiltroMovimentacao>('24h')
  const [itens, setItens] = useState<ItemMovimentacao[]>([])
  const [cardResumoMes, setCardResumoMes] = useState<ItemMovimentacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')

    try {
      const { data: configData, error: configError } = await supabase
        .from('salao_config')
        .select('id')
        .single()

      if (configError) throw configError
      const salaoId = configData.id

      const cutoff = calcularCutoff(filtro).toISOString()
      const agora = new Date()
      const mesAtual = agora.getMonth() + 1
      const diaAtual = agora.getDate()

      const [
        { data: cadastrosData, error: cadastrosError },
        { data: atendimentosData, error: atendimentosError },
        { data: reativacoesData, error: reativacoesError },
        { data: aniversariantesData, error: aniversariantesError },
      ] = await Promise.all([
        supabase
          .from('clientes')
          .select('id, nome, criado_em')
          .eq('salao_id', salaoId)
          .eq('origem', 'formulario')
          .gte('criado_em', cutoff),
        supabase
          .from('atendimentos')
          .select('id, servico, criado_em, clientes(nome)')
          .eq('salao_id', salaoId)
          .gte('criado_em', cutoff),
        supabase
          .from('reativacoes')
          .select('id, criado_em, clientes(nome)')
          .eq('salao_id', salaoId)
          .gte('criado_em', cutoff),
        supabase
          .from('clientes')
          .select('id, nome, data_nascimento')
          .eq('salao_id', salaoId)
          .not('data_nascimento', 'is', null),
      ])

      if (cadastrosError) throw cadastrosError
      if (atendimentosError) throw atendimentosError
      if (reativacoesError) throw reativacoesError
      if (aniversariantesError) throw aniversariantesError

      const resultado: ItemMovimentacao[] = []

      for (const c of cadastrosData ?? []) {
        const row = c as { id: string; nome: string; criado_em: string }
        resultado.push({
          id: `cadastro-${row.id}`,
          tipo: 'cadastro',
          descricao: `${row.nome} se cadastrou pelo formulário`,
          criado_em: row.criado_em,
        })
      }

      for (const a of atendimentosData ?? []) {
        const row = a as {
          id: string
          servico: string
          criado_em: string
          clientes: { nome: string } | null
        }
        const nomeCliente = row.clientes?.nome ?? 'Cliente'
        resultado.push({
          id: `atendimento-${row.id}`,
          tipo: 'atendimento',
          descricao: `Atendimento de ${nomeCliente} registrado — ${row.servico}`,
          criado_em: row.criado_em,
        })
      }

      for (const r of reativacoesData ?? []) {
        const row = r as {
          id: string
          criado_em: string
          clientes: { nome: string } | null
        }
        const nomeCliente = row.clientes?.nome ?? 'Cliente'
        resultado.push({
          id: `reativacao-${row.id}`,
          tipo: 'reativacao',
          descricao: `Reativação enviada para ${nomeCliente}`,
          criado_em: row.criado_em,
        })
      }

      const aniversariantesHoje = ((aniversariantesData ?? []) as {
        id: string
        nome: string
        data_nascimento: string
      }[]).filter((c) => {
        const partes = c.data_nascimento.split('-')
        return (
          parseInt(partes[1], 10) === mesAtual &&
          parseInt(partes[2], 10) === diaAtual
        )
      })

      for (const a of aniversariantesHoje) {
        resultado.push({
          id: `aniversario-${a.id}`,
          tipo: 'aniversario',
          descricao: `Hoje é aniversário de ${a.nome}!`,
          criado_em: agora.toISOString(),
          href: '/aniversariantes',
        })
      }

      resultado.sort((a, b) => b.criado_em.localeCompare(a.criado_em))
      setItens(resultado)

      if (diaAtual === 1) {
        const totalAnivers = ((aniversariantesData ?? []) as {
          data_nascimento: string
        }[]).filter((c) => parseInt(c.data_nascimento.split('-')[1], 10) === mesAtual).length

        setCardResumoMes({
          id: 'resumo-mes',
          tipo: 'resumo_mes',
          descricao: `Este mês tem ${totalAnivers} ${totalAnivers === 1 ? 'aniversariante' : 'aniversariantes'}`,
          criado_em: agora.toISOString(),
          href: '/aniversariantes',
        })
      } else {
        setCardResumoMes(null)
      }
    } catch {
      setErro('Não foi possível carregar. Tente novamente.')
    }

    setCarregando(false)
  }, [filtro])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Movimentação
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Atividades recentes do seu salão
        </p>
      </header>

      {/* Filtro de período */}
      <div className="border-b border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-2">
          {OPCOES_FILTRO.map((opcao) => (
            <button
              key={opcao.valor}
              onClick={() => setFiltro(opcao.valor)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                filtro === opcao.valor
                  ? 'bg-pink-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={5} />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : itens.length === 0 && !cardResumoMes ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl" aria-hidden="true">🔍</span>
            <p className="font-medium text-zinc-700 dark:text-zinc-300">
              Nenhuma atividade neste período
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Registre um atendimento ou reative uma cliente para aparecer aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cardResumoMes && (
              <CardMovimentacao item={cardResumoMes} />
            )}
            {itens.map((item) => (
              <CardMovimentacao key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function CardMovimentacao({ item }: { item: ItemMovimentacao }) {
  const conteudo = (
    <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm transition dark:bg-zinc-800">
      <span className="flex-shrink-0 text-xl" aria-hidden="true">
        {iconeParaTipo(item.tipo)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {item.descricao}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          {formatarDataHora(item.criado_em)}
        </p>
      </div>
      {item.href && (
        <span className="flex-shrink-0 text-xs font-medium text-pink-500 dark:text-pink-400">
          Ver →
        </span>
      )}
    </div>
  )

  if (item.href) {
    return <Link href={item.href}>{conteudo}</Link>
  }
  return conteudo
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/movimentacao/page.tsx"
git commit -m "feat: página de movimentação com feed de atividades e filtro temporal"
```

---

### Task 4: Item "Movimentação" no menu hambúrguer

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `IconeMovimentacao` de `@/components/icons` (criado na Task 1)

- [ ] **Step 1: Importar `IconeMovimentacao` no layout**

Em `app/(dashboard)/layout.tsx`, na linha de import de ícones (linha ~9–25), adicionar `IconeMovimentacao` à lista já importada:

```tsx
import {
  IconeEngrenagem,
  IconeFechar,
  IconeSol,
  IconeLua,
  IconeSair,
  IconeLista,
  IconePessoa,
  IconeMais,
  IconeCoracao,
  IconeRelogio,
  IconeHamburguer,
  IconeVoltar,
  IconeCasa,
  IconeBolo,
  IconeEstrela,
  IconeMovimentacao,
} from '@/components/icons'
```

- [ ] **Step 2: Adicionar item de menu após "Histórico"**

Na `<nav>` do menu lateral, após o `MenuItem` de Histórico (linha ~251) e antes do de Changelog:

```tsx
<MenuItem href="/movimentacao" label="Movimentação" ativo={pathname === '/movimentacao'}>
  <IconeMovimentacao />
</MenuItem>
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat: item Movimentação no menu hambúrguer"
```

---

### Task 5: Card de movimentações no Dashboard

**Files:**
- Modify: `app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: `salao_id` já disponível via `supabase` com RLS
- Produces: card "Movimentações hoje" mostrando contagem, clicável para `/movimentacao`

**Logic:**
- Buscar em paralelo, com cutoff = agora − 24h, `salao_id` via `salao_config`:
  - `clientes` where `origem = 'formulario'` and `criado_em >= cutoff`
  - `atendimentos` where `criado_em >= cutoff`
  - `reativacoes` where `criado_em >= cutoff`
- Somar os counts dos 3 resultados → `movimentacoesHoje`
- Adicionar à interface `DadosDashboard`: `movimentacoesHoje: number`
- Adicionar `CartaoDado` na grade (7° card) com href `/movimentacao`

- [ ] **Step 1: Adicionar campo `movimentacoesHoje` na interface local**

Em `app/(dashboard)/page.tsx`, na definição de `DadosDashboard` (linha ~7):

```ts
type DadosDashboard = {
  clientesAtivas: number
  clientesSumidas: number
  aniversariantesDoMes: number
  atendimentosDoMes: number
  faturamentoDoMes: number
  totalClientes: number
  movimentacoesHoje: number
}
```

- [ ] **Step 2: Buscar movimentações 24h no `useEffect`**

No `useEffect` de `carregar()`, calcular o cutoff e adicionar 3 queries ao `Promise.all`. O `Promise.all` atual tem 4 queries; adicionar mais 3:

```ts
const cutoff24h = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10) // apenas data, para checar com criado_em

// Usar a versão ISO completa para comparação correta com timestamptz:
const cutoff24hISO = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()
```

Substituir o `Promise.all` existente por:

```ts
const [
  { data: config },
  { data: statusList },
  { data: todosClientes },
  { data: atendimentosList },
  { data: cadastros24h },
  { data: atendimentos24h },
  { data: reativacoes24h },
] = await Promise.all([
  supabase.from('salao_config').select('nome_salao, nome_manicure, id').single(),
  supabase.from('clientes_status').select('status'),
  supabase.from('clientes').select('data_nascimento').not('data_nascimento', 'is', null),
  supabase.from('atendimentos').select('preco').gte('data_atendimento', inicioMes),
  supabase
    .from('clientes')
    .select('id')
    .eq('origem', 'formulario')
    .gte('criado_em', cutoff24hISO),
  supabase.from('atendimentos').select('id').gte('criado_em', cutoff24hISO),
  supabase.from('reativacoes').select('id').gte('criado_em', cutoff24hISO),
])
```

Nota: `salao_config` agora inclui `id` para a query de reativacoes ter RLS correto (as policies usam `auth.uid()` automaticamente — não é necessário filtrar por `salao_id` manualmente).

- [ ] **Step 3: Calcular e salvar `movimentacoesHoje`**

Após calcular `ativas`, `sumidas`, `total` etc., adicionar:

```ts
const movimentacoesHoje =
  (cadastros24h?.length ?? 0) +
  (atendimentos24h?.length ?? 0) +
  (reativacoes24h?.length ?? 0)
```

E no `setDados({...})` adicionar:

```ts
movimentacoesHoje,
```

- [ ] **Step 4: Adicionar ícone e card no JSX**

No topo do arquivo (após as funções de ícone existentes), adicionar:

```tsx
function IcMovimentacao() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
```

E na grade de cards (após o último `CartaoDado` existente):

```tsx
<CartaoDado
  icone={<IcMovimentacao />}
  numero={dados.movimentacoesHoje}
  rotulo="Movimentações hoje"
  href="/movimentacao"
  classeIcone="text-teal-500 dark:text-teal-400"
  classeFundo="bg-teal-50 ring-1 ring-teal-100 dark:bg-teal-950/30 dark:ring-teal-900/50"
/>
```

- [ ] **Step 5: Ajustar o `Promise.all` para obter `cutoff24hISO`**

No início do `useEffect`, antes do `Promise.all`, adicionar:

```ts
const cutoff24hISO = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()
```

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/page.tsx"
git commit -m "feat: card de movimentações das últimas 24h no dashboard"
```

---

## Self-Review

### Spec coverage check

| Requisito | Task |
|-----------|------|
| SQL — criar tabela reativacoes | Task 0 (manual) |
| INSERT em reativacoes ao clicar "Mandar mensagem" | Task 2 |
| salao_id passado corretamente no INSERT | Task 2 (buscado via salao_config) |
| Nova aba "Movimentação" no menu hambúrguer | Task 4 |
| Feed com filtro: 24h / semana / mês | Task 3 |
| Clientes formulario → "👤 [nome] se cadastrou pelo formulário" | Task 3 |
| Atendimentos → "✂️ Atendimento de [nome] registrado — [serviço]" | Task 3 |
| Reativações → "💬 Reativação enviada para [nome]" | Task 3 |
| Aniversário hoje → "🎂 Hoje é aniversário de [nome]!" clicável | Task 3 |
| Dia 1 do mês: card "📅 Este mês tem X aniversariantes" | Task 3 |
| Ordenar por criado_em desc | Task 3 |
| Dashboard — card movimentações 24h, clicável para /movimentacao | Task 5 |
| Não alterar RLS nem policies existentes | nenhuma task toca em SQL além do Task 0 |

### Placeholder scan

Nenhum placeholder encontrado — todos os steps contêm código completo.

### Type consistency

- `ItemMovimentacao` definido em Task 1, consumido em Task 3 — ✅
- `FiltroMovimentacao` definido em Task 1, consumido em Task 3 — ✅
- `TipoMovimentacao` definido em Task 1, usado em `iconeParaTipo` em Task 3 — ✅
- `IconeMovimentacao` criado em Task 1, importado no layout em Task 4, usado como `IcMovimentacao` inline no dashboard em Task 5 — ✅
- `DadosDashboard.movimentacoesHoje` adicionado e preenchido na mesma task — ✅
