# Onboarding por Token — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página pública `/onboarding?token=TOKEN` que valida um convite de uso único, coleta dados do profissional, cria conta Supabase Auth, insere `salao_config` e redireciona para o sistema autenticado.

**Architecture:** Server Component lê o token de `searchParams` e passa para um Client Component que gerencia os estados de UI. A submissão chama uma API Route server-side que usa `SUPABASE_SERVICE_ROLE_KEY` para operações de banco (seguindo padrão já estabelecido em `app/api/cadastro-publico/route.ts`) e `SUPABASE_ANON_KEY` para `auth.signUp()` (retorna sessão utilizável no client).

**Tech Stack:** Next.js 16 App Router, Supabase JS v2, TypeScript, Tailwind CSS

## Global Constraints

- Sem alterar RLS, policies, schema ou tabelas existentes
- `SUPABASE_SERVICE_ROLE_KEY` apenas em server-side (API routes e Server Components) — nunca em client components
- Mobile-first — botões mínimo 44px, layout em `max-w-sm` centralizado
- Sem bibliotecas de componentes externas (zero shadcn/MUI/etc)
- TypeScript estrito — sem `any`
- Mensagens de erro ao usuário em português, sem vazar erros técnicos do Supabase

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `app/onboarding/page.tsx` | Criar | Server Component — lê `searchParams.token`, passa para formulário |
| `app/onboarding/formulario.tsx` | Criar | Client Component — toda a lógica de UI, validação, modal de termos |
| `app/api/onboarding/route.ts` | Criar | POST handler — valida token, cria Auth user, insere salao_config, marca convite usado |

---

## Task 1: API Route POST /api/onboarding

**Files:**
- Criar: `app/api/onboarding/route.ts`

**Interfaces:**
- Consome: `POST` com body `{ token: string, nomeSalao: string, email: string, senha: string }`
- Produz (sucesso): `{ sessao: { access_token: string, refresh_token: string } }` — HTTP 200
- Produz (erro): `{ erro: string }` — HTTP 400/409/500

---

- [ ] **Step 1: Criar o arquivo `app/api/onboarding/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function criarClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

function criarClienteAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(request: NextRequest) {
  let token: string, nomeSalao: string, email: string, senha: string
  try {
    ;({ token, nomeSalao, email, senha } = await request.json())
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!token || !nomeSalao?.trim() || !email?.trim() || !senha) {
    return NextResponse.json({ erro: 'Preencha todos os campos.' }, { status: 400 })
  }

  const admin = criarClienteAdmin()

  // 1. Re-validar token server-side (previne race condition)
  const { data: convite, error: erroConvite } = await admin
    .from('convites')
    .select('id, usado')
    .eq('token', token)
    .maybeSingle()

  if (erroConvite || !convite) {
    return NextResponse.json({ erro: 'Link inválido ou já utilizado.' }, { status: 400 })
  }

  if (convite.usado) {
    return NextResponse.json({ erro: 'Este link já foi utilizado.' }, { status: 400 })
  }

  // 2. Criar usuário via anon client para obter sessão utilizável no client
  const anon = criarClienteAnon()
  const { data: authData, error: erroAuth } = await anon.auth.signUp({
    email: email.trim(),
    password: senha,
  })

  if (erroAuth || !authData.user) {
    const jaExiste = erroAuth?.message?.toLowerCase().includes('already registered')
    return NextResponse.json(
      { erro: jaExiste ? 'Este e-mail já possui uma conta.' : 'Não foi possível criar a conta. Tente novamente.' },
      { status: 400 },
    )
  }

  if (!authData.session) {
    // E-mail confirmation está ativo — não conseguimos redirecionar automaticamente
    return NextResponse.json(
      { erro: 'Conta criada! Verifique seu e-mail para ativar o acesso.' },
      { status: 202 },
    )
  }

  // 3. Inserir salao_config usando admin (bypassa RLS)
  const { error: erroConfig } = await admin.from('salao_config').insert({
    user_id: authData.user.id,
    nome_salao: nomeSalao.trim(),
    cor_primaria: '#ec4899',
  })

  if (erroConfig) {
    console.error('[onboarding] erro ao inserir salao_config:', erroConfig.message)
    return NextResponse.json(
      { erro: 'Erro ao configurar o salão. Contate o suporte.' },
      { status: 500 },
    )
  }

  // 4. Marcar convite como usado
  await admin.from('convites').update({ usado: true }).eq('token', token)

  return NextResponse.json({
    sessao: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    },
  })
}
```

- [ ] **Step 2: Verificar tipos — sem `any`, sem erro de TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros em `app/api/onboarding/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/onboarding/route.ts
git commit -m "feat: api route POST /api/onboarding para criação de conta via token"
```

---

## Task 2: Server Component `app/onboarding/page.tsx`

**Files:**
- Criar: `app/onboarding/page.tsx`

**Interfaces:**
- Consome: `searchParams: Promise<{ token?: string }>` do Next.js 16
- Produz: renderiza `<FormularioOnboarding token={string} />`

---

- [ ] **Step 1: Criar o arquivo `app/onboarding/page.tsx`**

```typescript
import FormularioOnboarding from './formulario'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { token } = await searchParams
  return <FormularioOnboarding token={token ?? ''} />
}
```

- [ ] **Step 2: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: server component para página /onboarding"
```

---

## Task 3: Client Component `app/onboarding/formulario.tsx`

**Files:**
- Criar: `app/onboarding/formulario.tsx`

**Interfaces:**
- Consome: `{ token: string }` prop de `page.tsx`
- Consome: `supabase.from('convites').select('id, usado').eq('token', token)` via anon client
- Consome: `POST /api/onboarding` → `{ sessao }` | `{ erro }`
- Produz: estados visuais + redirecionamento para `/` após sucesso

**Estados:**
- `'verificando'` — montagem: consulta token no Supabase
- `'invalido'` — token não existe ou `usado = true`
- `'formulario'` — token válido, exibe campos
- `'salvando'` — submit em andamento

**Modal:**
- `modalAberto: 'termos' | 'privacidade' | null`
- Fecha com clique no backdrop ou no botão X

---

- [ ] **Step 1: Criar o arquivo `app/onboarding/formulario.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Estado = 'verificando' | 'invalido' | 'formulario' | 'salvando'
type ModalAberto = 'termos' | 'privacidade' | null

interface Props {
  token: string
}

export default function FormularioOnboarding({ token }: Props) {
  const router = useRouter()

  const [estado, setEstado] = useState<Estado>('verificando')
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null)

  // campos do formulário
  const [nomeSalao, setNomeSalao] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [termosAceitos, setTermosAceitos] = useState(false)

  // erros dos campos
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => {
    if (!token) {
      setEstado('invalido')
      return
    }

    supabase
      .from('convites')
      .select('id, usado')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data || data.usado) {
          setEstado('invalido')
        } else {
          setEstado('formulario')
        }
      })
  }, [token])

  function validar(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!nomeSalao.trim()) e.nomeSalao = 'Informe seu nome'
    if (!email.trim()) e.email = 'Informe o e-mail'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'E-mail inválido'
    if (!senha) e.senha = 'Crie uma senha'
    else if (senha.length < 6) e.senha = 'A senha deve ter pelo menos 6 caracteres'
    if (senha !== confirmarSenha) e.confirmarSenha = 'As senhas não coincidem'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroGeral('')

    const novosErros = validar()
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return
    if (!termosAceitos) return

    setEstado('salvando')

    try {
      const resposta = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nomeSalao, email, senha }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErroGeral(dados.erro ?? 'Erro ao criar conta. Tente novamente.')
        setEstado('formulario')
        return
      }

      await supabase.auth.setSession(dados.sessao)
      document.cookie = 'sb-logged-in=1; path=/; SameSite=Lax; Max-Age=604800'
      router.replace('/')
    } catch {
      setErroGeral('Sem conexão. Verifique a internet e tente novamente.')
      setEstado('formulario')
    }
  }

  // ── verificando ───────────────────────────────────────────────────
  if (estado === 'verificando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#fdf2f8] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-500">Verificando seu convite…</p>
        </div>
      </div>
    )
  }

  // ── inválido ──────────────────────────────────────────────────────
  if (estado === 'invalido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#fdf2f8] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-5xl">❌</p>
            <h1 className="mt-3 text-xl font-bold text-zinc-900">Link inválido</h1>
          </div>
          <div className="rounded-2xl bg-white px-6 py-8 shadow-lg text-center">
            <p className="text-sm leading-relaxed text-zinc-600">
              Este link é inválido ou já foi utilizado.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Solicite um novo convite à administração do sistema.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── formulário ────────────────────────────────────────────────────
  const salvando = estado === 'salvando'

  return (
    <>
      {/* Modal de termos/privacidade */}
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalAberto === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setModalAberto(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white px-6 py-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900">
                {modalAberto === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
              </h2>
              <button
                type="button"
                onClick={() => setModalAberto(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Em breve — os termos completos estarão disponíveis aqui.
            </p>
            <button
              type="button"
              onClick={() => setModalAberto(null)}
              className="mt-6 h-11 w-full rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#fdf2f8] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-5xl">💅</p>
            <h1 className="mt-3 text-xl font-bold text-zinc-900">Criar sua conta</h1>
            <p className="mt-1 text-sm text-zinc-500">Preencha os dados para acessar o sistema</p>
          </div>

          <div className="rounded-2xl bg-white px-6 py-8 shadow-lg">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {/* Nome do profissional */}
              <div className="flex flex-col gap-1">
                <label htmlFor="nomeSalao" className="text-sm font-medium text-zinc-700">
                  Nome do profissional
                </label>
                <input
                  id="nomeSalao"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  value={nomeSalao}
                  onChange={(e) => setNomeSalao(e.target.value)}
                  disabled={salvando}
                  placeholder="Seu nome"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                    erros.nomeSalao ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.nomeSalao && (
                  <span role="alert" className="text-sm text-red-600">{erros.nomeSalao}</span>
                )}
              </div>

              {/* E-mail */}
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={salvando}
                  placeholder="seu@email.com"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                    erros.email ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.email && (
                  <span role="alert" className="text-sm text-red-600">{erros.email}</span>
                )}
              </div>

              {/* Senha */}
              <div className="flex flex-col gap-1">
                <label htmlFor="senha" className="text-sm font-medium text-zinc-700">
                  Senha
                </label>
                <input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={salvando}
                  placeholder="Mínimo 6 caracteres"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                    erros.senha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.senha && (
                  <span role="alert" className="text-sm text-red-600">{erros.senha}</span>
                )}
              </div>

              {/* Confirmar senha */}
              <div className="flex flex-col gap-1">
                <label htmlFor="confirmarSenha" className="text-sm font-medium text-zinc-700">
                  Confirmar senha
                </label>
                <input
                  id="confirmarSenha"
                  type="password"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  disabled={salvando}
                  placeholder="Repita a senha"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                    erros.confirmarSenha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.confirmarSenha && (
                  <span role="alert" className="text-sm text-red-600">{erros.confirmarSenha}</span>
                )}
              </div>

              {/* Erro geral */}
              {erroGeral && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroGeral}
                </p>
              )}

              {/* Checkbox de termos */}
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={termosAceitos}
                  onChange={(e) => setTermosAceitos(e.target.checked)}
                  disabled={salvando}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-pink-500"
                />
                <span className="text-sm text-zinc-600 leading-relaxed">
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setModalAberto('termos')}
                    className="font-medium text-pink-600 underline underline-offset-2 hover:text-pink-700"
                  >
                    Termos de Uso
                  </button>
                  {' '}e a{' '}
                  <button
                    type="button"
                    onClick={() => setModalAberto('privacidade')}
                    className="font-medium text-pink-600 underline underline-offset-2 hover:text-pink-700"
                  >
                    Política de Privacidade
                  </button>
                </span>
              </label>

              {/* Botão de submit */}
              <button
                type="submit"
                disabled={salvando || !termosAceitos}
                className="mt-1 h-12 rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? 'Criando conta…' : 'Criar minha conta'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/formulario.tsx
git commit -m "feat: formulário de onboarding por token com modal de termos"
```

---

## Task 4: Build e verificação manual

**Files:**
- Nenhum arquivo novo — apenas build e checklist

---

- [ ] **Step 1: Rodar build completo**

```bash
npm run build
```

Esperado: saída `✓ Compiled successfully`, sem erros de TypeScript ou build.

- [ ] **Step 2: Corrigir erros se houver**

Se `npm run build` falhar, aplicar as correções e rodar novamente até passar.

- [ ] **Step 3: Checklist de verificação manual**

Abrir `http://localhost:3000/onboarding` (sem token):
- [ ] Exibe estado `verificando` por um instante
- [ ] Redireciona para estado `invalido` com mensagem "Este link é inválido ou já foi utilizado"

Abrir `http://localhost:3000/onboarding?token=TOKEN_INVALIDO`:
- [ ] Exibe estado `invalido`

Abrir `http://localhost:3000/onboarding?token=TOKEN_VALIDO`:
- [ ] Exibe o formulário com 4 campos + checkbox
- [ ] Botão "Criar minha conta" começa desabilitado (checkbox desmarcado)
- [ ] Clicar em "Termos de Uso" → abre modal com texto placeholder
- [ ] Clicar em "Política de Privacidade" → abre modal com texto placeholder
- [ ] Clicar fora do modal → fecha
- [ ] Clicar no X → fecha
- [ ] Marcar checkbox → botão habilitado
- [ ] Submeter com campos vazios → erros inline nos campos
- [ ] Submeter com senha < 6 chars → erro "pelo menos 6 caracteres"
- [ ] Submeter com senhas diferentes → erro "As senhas não coincidem"
- [ ] Submeter com dados válidos e token válido → cria conta, redireciona para `/`
- [ ] Tentar usar o mesmo token novamente → estado `invalido`

- [ ] **Step 4: Commit final (se houver correções)**

```bash
git add -p
git commit -m "fix: correções de build e TypeScript no onboarding"
```
