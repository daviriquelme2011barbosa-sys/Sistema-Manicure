'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SERVICOS_SUGERIDOS = [
  'Manicure',
  'Pedicure',
  'Manicure e pedicure',
  'Spa dos pés',
  'Blindagem',
  'Alongamento de unhas',
  'Nail art',
  'Esmaltação em gel',
]

function normalizarWhatsApp(valor: string): string {
  return valor.replace(/\D/g, '')
}

function dataHoje(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

type Toast = { mensagem: string; tipo: 'sucesso' | 'erro' } | null

export default function CadastroPage() {
  const router = useRouter()

  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [servico, setServico] = useState('')
  const [dataAtendimento, setDataAtendimento] = useState(dataHoje)
  const [observacoes, setObservacoes] = useState('')
  const [autorizaContato, setAutorizaContato] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<Toast>(null)

  function mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const novosErros: Record<string, string> = {}

    if (!nome.trim()) {
      novosErros.nome = 'Informe o nome da cliente'
    }

    const whatsappNormalizado = normalizarWhatsApp(whatsapp)
    if (!whatsapp.trim()) {
      novosErros.whatsapp = 'Informe o WhatsApp'
    } else if (whatsappNormalizado.length < 10) {
      novosErros.whatsapp = 'Número inválido — confira o WhatsApp'
    }

    if (!servico.trim()) {
      novosErros.servico = 'Selecione ou descreva o serviço'
    }

    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setSalvando(true)

    const { data: clienteExistente, error: erroConsulta } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('whatsapp', whatsappNormalizado)
      .maybeSingle()

    if (erroConsulta) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
      setSalvando(false)
      return
    }

    if (clienteExistente) {
      const { error: erroAtend } = await supabase.from('atendimentos').insert({
        cliente_id: clienteExistente.id,
        servico: servico.trim(),
        data_atendimento: dataAtendimento,
      })

      if (erroAtend) {
        mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
        setSalvando(false)
        return
      }

      mostrarToast(
        `Atendimento adicionado para ${clienteExistente.nome.split(' ')[0]}`,
        'sucesso',
      )
    } else {
      const { data: novaCliente, error: erroCliente } = await supabase
        .from('clientes')
        .insert({
          nome: nome.trim(),
          whatsapp: whatsappNormalizado,
          observacoes: observacoes.trim() || null,
          autoriza_contato: autorizaContato,
        })
        .select('id, nome')
        .single()

      if (erroCliente || !novaCliente) {
        mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
        setSalvando(false)
        return
      }

      const { error: erroAtend } = await supabase.from('atendimentos').insert({
        cliente_id: novaCliente.id,
        servico: servico.trim(),
        data_atendimento: dataAtendimento,
      })

      if (erroAtend) {
        mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
        setSalvando(false)
        return
      }

      mostrarToast(
        `Cliente ${novaCliente.nome.split(' ')[0]} cadastrada com sucesso`,
        'sucesso',
      )
    }

    setTimeout(() => router.push('/clientes'), 1500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-4 right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg sm:left-auto sm:right-4 sm:w-80 ${
            toast.tipo === 'sucesso' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.mensagem}
        </div>
      )}

      {/* Cabeçalho */}
      <header className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
        <Link
          href="/clientes"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Voltar para lista de clientes"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Novo atendimento</h1>
      </header>

      {/* Formulário */}
      <main className="flex-1 px-4 pb-28 pt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

          {/* Nome */}
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="nome"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={salvando}
              placeholder="Nome da cliente"
              className={`h-12 rounded-lg border px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50 ${
                erros.nome ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
              }`}
            />
            {erros.nome && (
              <span role="alert" className="text-sm text-red-600">
                {erros.nome}
              </span>
            )}
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-1">
            <label htmlFor="whatsapp" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              WhatsApp <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="whatsapp"
              type="tel"
              autoComplete="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              disabled={salvando}
              placeholder="(38) 99999-0000"
              className={`h-12 rounded-lg border px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50 ${
                erros.whatsapp ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
              }`}
            />
            {erros.whatsapp && (
              <span role="alert" className="text-sm text-red-600">
                {erros.whatsapp}
              </span>
            )}
          </div>

          {/* Serviço */}
          <div className="flex flex-col gap-1">
            <label htmlFor="servico" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Serviço <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="servico"
              type="text"
              list="lista-servicos"
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              disabled={salvando}
              placeholder="Ex: Manicure, Pedicure…"
              className={`h-12 rounded-lg border px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50 ${
                erros.servico ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
              }`}
            />
            <datalist id="lista-servicos">
              {SERVICOS_SUGERIDOS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {erros.servico && (
              <span role="alert" className="text-sm text-red-600">
                {erros.servico}
              </span>
            )}
          </div>

          {/* Data do atendimento */}
          <div className="flex flex-col gap-1">
            <label htmlFor="dataAtendimento" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Data do atendimento <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="dataAtendimento"
              type="date"
              value={dataAtendimento}
              onChange={(e) => setDataAtendimento(e.target.value)}
              disabled={salvando}
              className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
            />
          </div>

          {/* Observações */}
          <div className="flex flex-col gap-1">
            <label htmlFor="observacoes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Observações
              <span className="ml-1 text-xs font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span>
            </label>
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={salvando}
              placeholder="Preferências, alergias…"
              rows={3}
              className="resize-none rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-3 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
            />
          </div>

          {/* Consentimento */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={autorizaContato}
              onChange={(e) => setAutorizaContato(e.target.checked)}
              disabled={salvando}
              className="mt-0.5 h-5 w-5 flex-shrink-0 accent-pink-500"
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Cliente autoriza contato via WhatsApp para lembretes e reativação
            </span>
          </label>

          {!autorizaContato && (
            <p role="alert" className="text-center text-xs text-amber-600 dark:text-amber-400">
              O consentimento é necessário para cadastrar a cliente no sistema.
            </p>
          )}

          <button
            type="submit"
            disabled={salvando || !autorizaContato}
            className="h-12 rounded-lg bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? 'Salvando…' : 'Salvar atendimento'}
          </button>

          <p className="text-center text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
            Os dados cadastrados são usados exclusivamente para gestão interna do salão,
            conforme a <abbr title="Lei Geral de Proteção de Dados">LGPD</abbr>.
          </p>
        </form>
      </main>
    </div>
  )
}
