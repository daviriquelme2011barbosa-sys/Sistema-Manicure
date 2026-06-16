'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tela = 'login' | 'esqueci' | 'link_enviado' | 'nova_senha'

export default function LoginPage() {
  const router = useRouter()
  const [tela, setTela] = useState<Tela>('login')

  // login
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroEmail, setErroEmail] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [erroCredenciais, setErroCredenciais] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sessaoExpirada, setSessaoExpirada] = useState(false)

  // recuperação
  const [emailRecuperacao, setEmailRecuperacao] = useState('')
  const [erroEmailRecuperacao, setErroEmailRecuperacao] = useState('')
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false)

  // nova senha
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erroNovaSenha, setErroNovaSenha] = useState('')
  const [erroConfirmarSenha, setErroConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sessao') === 'expirada') setSessaoExpirada(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setTela('nova_senha')
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErroEmail('')
    setErroSenha('')
    setErroCredenciais('')

    let valido = true
    if (!email.trim()) { setErroEmail('Preencha o e-mail'); valido = false }
    if (!senha) { setErroSenha('Preencha a senha'); valido = false }
    if (!valido) return

    setEnviando(true)

    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      setErroCredenciais(dados.erro ?? 'Erro ao entrar. Tente novamente.')
      setEnviando(false)
      return
    }

    await supabase.auth.setSession(dados.sessao)
    document.cookie = 'sb-logged-in=1; path=/; SameSite=Lax; Max-Age=604800'
    router.push('/')
  }

  async function handleEnviarRecuperacao(e: React.FormEvent) {
    e.preventDefault()
    setErroEmailRecuperacao('')

    if (!emailRecuperacao.trim()) {
      setErroEmailRecuperacao('Preencha o e-mail')
      return
    }

    setEnviandoRecuperacao(true)

    await supabase.auth.resetPasswordForEmail(emailRecuperacao.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })

    // sempre mostra sucesso — não vazar se o e-mail existe ou não
    setTela('link_enviado')
    setEnviandoRecuperacao(false)
  }

  async function handleSalvarNovaSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroNovaSenha('')
    setErroConfirmarSenha('')

    let valido = true
    if (novaSenha.length < 6) {
      setErroNovaSenha('A senha deve ter pelo menos 6 caracteres')
      valido = false
    }
    if (novaSenha !== confirmarSenha) {
      setErroConfirmarSenha('As senhas não coincidem')
      valido = false
    }
    if (!valido) return

    setSalvandoSenha(true)

    const { error } = await supabase.auth.updateUser({ password: novaSenha })

    if (error) {
      setErroNovaSenha('Não foi possível salvar. Tente novamente.')
      setSalvandoSenha(false)
      return
    }

    await supabase.auth.signOut()
    router.replace('/login')
  }

  // ── nova senha ────────────────────────────────────────────────────
  if (tela === 'nova_senha') {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-5xl">🔑</p>
          <h1 className="mt-3 text-xl font-bold text-zinc-900">Nova senha</h1>
          <p className="mt-1 text-sm text-zinc-500">Digite a sua nova senha de acesso</p>
        </div>

        <div className="rounded-2xl bg-white px-6 py-8 shadow-lg">
          <form onSubmit={handleSalvarNovaSenha} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label htmlFor="nova-senha" className="text-sm font-medium text-zinc-700">
                Nova senha
              </label>
              <input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={salvandoSenha}
                placeholder="Mínimo 6 caracteres"
                className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                  erroNovaSenha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                }`}
              />
              {erroNovaSenha && (
                <span role="alert" className="text-sm text-red-600">{erroNovaSenha}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirmar-senha" className="text-sm font-medium text-zinc-700">
                Confirmar senha
              </label>
              <input
                id="confirmar-senha"
                type="password"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                disabled={salvandoSenha}
                placeholder="Repita a senha"
                className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                  erroConfirmarSenha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                }`}
              />
              {erroConfirmarSenha && (
                <span role="alert" className="text-sm text-red-600">{erroConfirmarSenha}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={salvandoSenha}
              className="mt-1 h-12 rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvandoSenha ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── link enviado ──────────────────────────────────────────────────
  if (tela === 'link_enviado') {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-5xl">📧</p>
          <h1 className="mt-3 text-xl font-bold text-zinc-900">Verifique seu e-mail</h1>
        </div>

        <div className="rounded-2xl bg-white px-6 py-8 shadow-lg">
          <p className="text-sm leading-relaxed text-zinc-600">
            Enviamos um link de recuperação para o seu e-mail. O e-mail virá do Supabase — verifique também sua caixa de spam.
          </p>

          <button
            onClick={() => { setTela('login'); setEmailRecuperacao('') }}
            className="mt-6 h-12 w-full rounded-xl border border-zinc-300 font-semibold text-zinc-700 transition hover:bg-zinc-50 active:bg-zinc-100"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  // ── esqueci minha senha ───────────────────────────────────────────
  if (tela === 'esqueci') {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-5xl">💅</p>
          <h1 className="mt-3 text-xl font-bold text-zinc-900">Recuperar senha</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Enviaremos um link de recuperação para o seu e-mail
          </p>
        </div>

        <div className="rounded-2xl bg-white px-6 py-8 shadow-lg">
          <form onSubmit={handleEnviarRecuperacao} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label htmlFor="email-recuperacao" className="text-sm font-medium text-zinc-700">
                E-mail
              </label>
              <input
                id="email-recuperacao"
                type="email"
                autoComplete="email"
                value={emailRecuperacao}
                onChange={(e) => setEmailRecuperacao(e.target.value)}
                disabled={enviandoRecuperacao}
                placeholder="seu@email.com"
                className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                  erroEmailRecuperacao ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                }`}
              />
              {erroEmailRecuperacao && (
                <span role="alert" className="text-sm text-red-600">{erroEmailRecuperacao}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={enviandoRecuperacao}
              className="mt-1 h-12 rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviandoRecuperacao ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>

            <button
              type="button"
              onClick={() => { setTela('login'); setErroEmailRecuperacao('') }}
              className="h-10 text-sm text-zinc-500 transition hover:text-zinc-700"
            >
              Voltar para o login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── login ─────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <p className="text-5xl">💅</p>
        <h1 className="mt-3 text-xl font-bold text-zinc-900">Gestão de Clientes</h1>
        <p className="mt-1 text-sm text-zinc-500">Acesso exclusivo para a dona do salão</p>
      </div>

      <div className="rounded-2xl bg-white px-6 py-8 shadow-lg">
        {sessaoExpirada && (
          <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Sua sessão expirou, faça login novamente.
          </p>
        )}

        <form onSubmit={handleLogin} noValidate className="flex flex-col gap-5">
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
              disabled={enviando}
              placeholder="seu@email.com"
              className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                erroEmail ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
              }`}
            />
            {erroEmail && (
              <span role="alert" className="text-sm text-red-600">{erroEmail}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="senha" className="text-sm font-medium text-zinc-700">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
              placeholder="••••••••"
              className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 ${
                erroSenha ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
              }`}
            />
            {erroSenha && (
              <span role="alert" className="text-sm text-red-600">{erroSenha}</span>
            )}
          </div>

          {erroCredenciais && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erroCredenciais}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-1 h-12 rounded-xl bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => { setTela('esqueci'); setErroCredenciais('') }}
            className="h-10 text-sm text-zinc-500 transition hover:text-zinc-700"
          >
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}
