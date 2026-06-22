'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CampoSenha } from '@/components/CampoSenha'

type Tela = 'login' | 'esqueci' | 'link_enviado' | 'nova_senha'

function Background() {
  return (
    <>
      <div className="login-orb-1" aria-hidden="true" />
      <div className="login-orb-2" aria-hidden="true" />
    </>
  )
}

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
      <div className="login-page">
        <Background />
        <div className="login-center">
          <div className="w-full" style={{ maxWidth: '384px' }}>
            <div className="mb-8 text-center login-anim-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Nova senha</h1>
              <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Digite a sua nova senha de acesso
              </p>
            </div>

            <div className="login-card login-anim-2">
              <form onSubmit={handleSalvarNovaSenha} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-1 login-anim-3">
                  <label htmlFor="nova-senha" className="login-label">Nova senha</label>
                  <CampoSenha
                    id="nova-senha"
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    disabled={salvandoSenha}
                    placeholder="Mínimo 6 caracteres"
                    erro={!!erroNovaSenha}
                    glass
                  />
                  {erroNovaSenha && (
                    <span role="alert" className="text-xs" style={{ color: '#fca5a5' }}>
                      {erroNovaSenha}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 login-anim-4">
                  <label htmlFor="confirmar-senha" className="login-label">Confirmar senha</label>
                  <CampoSenha
                    id="confirmar-senha"
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    disabled={salvandoSenha}
                    placeholder="Repita a senha"
                    erro={!!erroConfirmarSenha}
                    glass
                  />
                  {erroConfirmarSenha && (
                    <span role="alert" className="text-xs" style={{ color: '#fca5a5' }}>
                      {erroConfirmarSenha}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="login-btn login-anim-5"
                >
                  {salvandoSenha ? 'Salvando…' : 'Salvar nova senha'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── link enviado ──────────────────────────────────────────────────
  if (tela === 'link_enviado') {
    return (
      <div className="login-page">
        <Background />
        <div className="login-center">
          <div className="w-full" style={{ maxWidth: '384px' }}>
            <div className="mb-8 text-center login-anim-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Verifique seu e-mail</h1>
              <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Um link de recuperação foi enviado
              </p>
            </div>

            <div className="login-card login-anim-2">
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Enviamos um link de recuperação para o seu e-mail. O e-mail virá do Supabase — verifique também sua caixa de spam.
              </p>

              <button
                onClick={() => { setTela('login'); setEmailRecuperacao('') }}
                className="login-btn mt-6"
              >
                Voltar para o login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── esqueci minha senha ───────────────────────────────────────────
  if (tela === 'esqueci') {
    return (
      <div className="login-page">
        <Background />
        <div className="login-center">
          <div className="w-full" style={{ maxWidth: '384px' }}>
            <div className="mb-8 text-center login-anim-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">Recuperar senha</h1>
              <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Enviaremos um link de recuperação para o seu e-mail
              </p>
            </div>

            <div className="login-card login-anim-2">
              <form onSubmit={handleEnviarRecuperacao} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-1 login-anim-3">
                  <label htmlFor="email-recuperacao" className="login-label">E-mail</label>
                  <input
                    id="email-recuperacao"
                    type="email"
                    autoComplete="email"
                    value={emailRecuperacao}
                    onChange={(e) => setEmailRecuperacao(e.target.value)}
                    disabled={enviandoRecuperacao}
                    placeholder="seu@email.com"
                    className={`login-input${erroEmailRecuperacao ? ' login-input-erro' : ''}`}
                  />
                  {erroEmailRecuperacao && (
                    <span role="alert" className="text-xs" style={{ color: '#fca5a5' }}>
                      {erroEmailRecuperacao}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={enviandoRecuperacao}
                  className="login-btn login-anim-4"
                >
                  {enviandoRecuperacao ? 'Enviando…' : 'Enviar link de recuperação'}
                </button>

                <button
                  type="button"
                  onClick={() => { setTela('login'); setErroEmailRecuperacao('') }}
                  className="login-link-btn login-anim-5"
                >
                  Voltar para o login
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── login ─────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      <Background />
      <div className="login-center">
        <div className="w-full" style={{ maxWidth: '384px' }}>
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight login-anim-1">
              Gestão de Clientes
            </h1>
            <p className="mt-2 text-sm login-anim-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Acesso exclusivo para a dona(o) do negócio
            </p>
          </div>

          <div className="login-card login-anim-4">
            {sessaoExpirada && (
              <div role="alert" className="login-alert login-alert-aviso mb-5">
                Sua sessão expirou, faça login novamente.
              </div>
            )}

            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-1 login-anim-5">
                <label htmlFor="email" className="login-label">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={enviando}
                  placeholder="seu@email.com"
                  className={`login-input${erroEmail ? ' login-input-erro' : ''}`}
                />
                {erroEmail && (
                  <span role="alert" className="text-xs" style={{ color: '#fca5a5' }}>
                    {erroEmail}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 login-anim-6">
                <label htmlFor="senha" className="login-label">Senha</label>
                <CampoSenha
                  id="senha"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={enviando}
                  placeholder="••••••••"
                  erro={!!erroSenha}
                  glass
                />
                {erroSenha && (
                  <span role="alert" className="text-xs" style={{ color: '#fca5a5' }}>
                    {erroSenha}
                  </span>
                )}
              </div>

              {erroCredenciais && (
                <div role="alert" className="login-alert login-alert-erro">
                  {erroCredenciais}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="login-btn login-anim-7"
              >
                {enviando ? 'Entrando…' : 'Entrar'}
              </button>

              <button
                type="button"
                onClick={() => { setTela('esqueci'); setErroCredenciais('') }}
                className="login-link-btn"
              >
                Esqueci minha senha
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
