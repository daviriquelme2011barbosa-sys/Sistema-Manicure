'use client'

import Image from 'next/image'
import { useState } from 'react'
import { normalizarWhatsApp } from '@/lib/formatters'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

type Toast = { mensagem: string; tipo: 'sucesso' | 'erro' } | null

type Props = {
  salaoId: string
  nomeSalao: string
  corPrimaria: string
  fotoUrl?: string | null
  nomeManicure?: string | null
  genero?: string | null
}

export default function FormularioCadastroPublico({
  salaoId,
  nomeSalao,
  corPrimaria,
  fotoUrl,
  nomeManicure,
  genero,
}: Props) {
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [autorizaContato, setAutorizaContato] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [avisoWhatsApp, setAvisoWhatsApp] = useState('')
  const [toast, setToast] = useState<Toast>(null)

  function mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  function validar(): Record<string, string> {
    const novosErros: Record<string, string> = {}

    if (!nome.trim()) {
      novosErros.nome = 'Informe seu nome'
    } else if (nome.trim().split(/\s+/).length < 2) {
      novosErros.nome = 'Por favor, informe seu nome completo (nome e sobrenome)'
    }

    const whatsappNormalizado = normalizarWhatsApp(whatsapp)
    if (!whatsapp.trim()) {
      novosErros.whatsapp = 'Informe seu WhatsApp'
    } else if (whatsappNormalizado.length < 10) {
      novosErros.whatsapp = 'Número inválido — mínimo 10 dígitos'
    }

    if (!email.trim()) {
      novosErros.email = 'Informe seu e-mail para receber confirmações de cadastro'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      novosErros.email = 'Digite um e-mail válido (ex: nome@email.com)'
    }

    return novosErros
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const novosErros = validar()
    setErros(novosErros)
    setAvisoWhatsApp('')
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)

    try {
      const resposta = await fetch('/api/cadastro-publico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salaoId,
          nome: nome.trim(),
          whatsapp,
          email: email.trim() || null,
          dataNascimento: dataNascimento || null,
          observacoes: observacoes.trim() || null,
          autorizaContato,
        }),
      })

      const corpo = await resposta.json()

      if (!resposta.ok) {
        if (corpo.duplicado) {
          setAvisoWhatsApp(
            'Este número já está cadastrado no nosso sistema. Provavelmente você já fez seu cadastro anteriormente! 😊',
          )
          return
        }
        if (corpo.campo) {
          setErros({ [corpo.campo]: corpo.erro })
        } else {
          mostrarToast(corpo.erro ?? 'Erro ao enviar. Tente novamente.', 'erro')
        }
        return
      }

      setSucesso(true)
      setNome('')
      setWhatsapp('')
      setEmail('')
      setDataNascimento('')
      setObservacoes('')
      setAutorizaContato(false)
      setErros({})
    } catch {
      mostrarToast('Sem conexão. Verifique a internet e tente novamente.', 'erro')
    } finally {
      setEnviando(false)
    }
  }

  const estiloAurora: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    backgroundColor: '#fdfbff',
    backgroundImage: `
      radial-gradient(ellipse 100% 70% at 50% -10%, ${hexToRgba(corPrimaria, 0.42)}, transparent 70%),
      radial-gradient(ellipse 75% 55% at 92% 100%, ${hexToRgba(corPrimaria, 0.28)}, transparent 60%),
      radial-gradient(ellipse 65% 50% at 8% 65%, ${hexToRgba(corPrimaria, 0.18)}, transparent 55%)
    `,
  }

  // Container de scroll sem background próprio — aurora fixa aparece por baixo
  const estiloScroll: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    overflowY: 'auto',
    zIndex: 1,
  }

  if (sucesso) {
    return (
      <>
        <div aria-hidden="true" className="aurora-bg-salao pointer-events-none" style={estiloAurora} />
        <div style={estiloScroll}>
          <div className="relative flex min-h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-5xl" style={{ color: corPrimaria }}>💗</p>
            <h2 className="text-lg font-semibold" style={{ color: corPrimaria }}>
              Obrigado pelo seu cadastro! 💗
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Seus dados foram registrados. Até a próxima visita!
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Aurora fixa atrás do scroll — sempre visível independente da posição de rolagem */}
      <div aria-hidden="true" className="aurora-bg-salao pointer-events-none" style={estiloAurora} />

      <div style={estiloScroll}>
        {/* Toast */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`animar-toast fixed left-4 right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg sm:left-auto sm:right-4 sm:w-80 ${
              toast.tipo === 'sucesso' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.mensagem}
          </div>
        )}

        {/* Conteúdo */}
        <div className="relative flex min-h-full flex-col">

        {/* Cabeçalho */}
        <header
          className="px-6 py-8 text-center rounded-b-3xl shadow-sm overflow-hidden"
          style={{ backgroundColor: 'white', position: 'relative' }}
        >
          {/* Glow radial */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              backgroundImage: `radial-gradient(circle at center, ${hexToRgba(corPrimaria, 0.35)}, transparent)`,
            }}
          />

          {/* Conteúdo acima do gradiente */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex justify-center mb-4">
              {fotoUrl ? (
                <Image
                  src={fotoUrl}
                  alt={nomeManicure ?? nomeSalao}
                  width={96}
                  height={96}
                  className="rounded-full object-cover shadow-md"
                  style={{ border: `4px solid ${corPrimaria}` }}
                />
              ) : (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold shadow-md bg-white"
                  style={{ border: `4px solid ${corPrimaria}`, color: corPrimaria }}
                >
                  {(nomeManicure ?? nomeSalao).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h1 className="text-lg font-semibold" style={{ color: corPrimaria }}>
              Olá! Faça seu cadastro e entre para a lista de clientes {genero === 'feminino' ? 'da ' : genero === 'masculino' ? 'do ' : ''}{nomeManicure ?? nomeSalao} 💅
            </h1>
          </div>
        </header>

        <main className="flex-1 px-4 pb-12 pt-6">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-6"
          >
            {/* Nome */}
            <div className="campo-formulario flex flex-col gap-1" style={{ animationDelay: '60ms' }}>
              <label htmlFor="nome" className="text-sm font-medium text-zinc-700">
                Nome <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="nome"
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={enviando}
                placeholder="Nome completo"
                className={`h-12 rounded-lg border px-4 text-base text-zinc-900 bg-white placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-400 disabled:bg-zinc-100 ${
                  erros.nome ? 'border-red-500' : 'border-zinc-300'
                }`}
              />
              <p className="text-sm text-zinc-400">
                Por favor, informe seu nome completo para evitar confusões
              </p>
              {erros.nome && (
                <span role="alert" className="text-sm text-red-600">
                  {erros.nome}
                </span>
              )}
            </div>

            {/* WhatsApp */}
            <div className="campo-formulario flex flex-col gap-1" style={{ animationDelay: '140ms' }}>
              <label htmlFor="whatsapp" className="text-sm font-medium text-zinc-700">
                WhatsApp <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="whatsapp"
                type="tel"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value)
                  setAvisoWhatsApp('')
                }}
                disabled={enviando}
                placeholder="(38) 99999-0000"
                className={`h-12 rounded-lg border px-4 text-base text-zinc-900 bg-white placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-400 disabled:bg-zinc-100 ${
                  erros.whatsapp
                    ? 'border-red-500'
                    : avisoWhatsApp
                      ? 'border-amber-400'
                      : 'border-zinc-300'
                }`}
              />
              {erros.whatsapp && (
                <span role="alert" className="text-sm text-red-600">
                  {erros.whatsapp}
                </span>
              )}
              {avisoWhatsApp && !erros.whatsapp && (
                <span role="status" className="text-sm text-amber-600">
                  {avisoWhatsApp}
                </span>
              )}
            </div>

            {/* E-mail */}
            <div className="campo-formulario flex flex-col gap-1" style={{ animationDelay: '220ms' }}>
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                E-mail <span aria-hidden="true" className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={enviando}
                placeholder="seu@email.com"
                className={`h-12 rounded-lg border px-4 text-base text-zinc-900 bg-white placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-400 disabled:bg-zinc-100 ${
                  erros.email ? 'border-red-500' : 'border-zinc-300'
                }`}
              />
              {erros.email && (
                <span role="alert" className="text-sm text-red-600">
                  {erros.email}
                </span>
              )}
            </div>

            {/* Data de nascimento */}
            <div className="campo-formulario flex flex-col gap-1" style={{ animationDelay: '300ms' }}>
              <label htmlFor="data_nascimento" className="text-sm font-medium text-zinc-700">
                Data de nascimento
                <span className="ml-1 text-xs font-normal text-zinc-400">(opcional)</span>
              </label>
              <input
                id="data_nascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                disabled={enviando}
                className="h-12 rounded-lg border border-zinc-300 px-4 text-base text-zinc-900 bg-white shadow-sm outline-none transition focus:ring-2 focus:ring-pink-400 disabled:bg-zinc-100"
              />
            </div>

            {/* Observações */}
            <div className="campo-formulario flex flex-col gap-1" style={{ animationDelay: '380ms' }}>
              <label htmlFor="observacoes" className="text-sm font-medium text-zinc-700">
                Observações
                <span className="ml-1 text-xs font-normal text-zinc-400">(opcional)</span>
              </label>
              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={enviando}
                placeholder="Alergias, preferências…"
                rows={3}
                className="resize-none rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 bg-white placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-pink-400 disabled:bg-zinc-100"
              />
            </div>

            {/* Consentimento LGPD */}
            <label className="campo-formulario flex cursor-pointer items-start gap-3" style={{ animationDelay: '460ms' }}>
              <input
                type="checkbox"
                checked={autorizaContato}
                onChange={(e) => setAutorizaContato(e.target.checked)}
                disabled={enviando}
                className="mt-0.5 h-5 w-5 flex-shrink-0 accent-pink-500"
              />
              <span className="text-sm text-zinc-600">
                Autorizo o salão a entrar em contato comigo via WhatsApp para
                agendamentos e reativação
                <span aria-hidden="true" className="text-red-500"> *</span>
              </span>
            </label>

            {!autorizaContato && (
              <p role="alert" className="text-center text-xs text-amber-600">
                Marque o consentimento para habilitar o envio.
              </p>
            )}

            <button
              type="submit"
              disabled={enviando || !autorizaContato}
              className="campo-formulario h-12 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: '#fdf2f8', color: corPrimaria, border: `1.5px solid ${corPrimaria}`, animationDelay: '540ms' }}
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>

            <p className="text-center text-xs leading-relaxed text-zinc-400">
              Seus dados são usados exclusivamente para gestão interna do salão,
              conforme a{' '}
              <abbr title="Lei Geral de Proteção de Dados">LGPD</abbr>.
            </p>
          </form>
        </main>

        </div>{/* fim conteúdo */}
      </div>
    </>
  )
}
