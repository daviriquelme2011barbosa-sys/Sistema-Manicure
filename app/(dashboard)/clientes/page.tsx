'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

type ClienteStatus = {
  id: string
  nome: string
  whatsapp: string
  observacoes: string | null
  ultima_visita: string | null
  dias_desde_ultima_visita: number | null
  ultimo_servico: string | null
  status: 'verde' | 'amarelo' | 'vermelho' | 'sem_atendimento'
  autoriza_contato: boolean | null
}

type FiltroStatus = 'todos' | 'verde' | 'amarelo' | 'vermelho'

type Toast = { mensagem: string; tipo: 'sucesso' | 'erro' } | null

const ORDEM_STATUS: Record<ClienteStatus['status'], number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
  sem_atendimento: 3,
}

const BORDA_STATUS: Record<ClienteStatus['status'], string> = {
  verde: 'border-l-green-500',
  amarelo: 'border-l-yellow-400',
  vermelho: 'border-l-red-500',
  sem_atendimento: 'border-l-zinc-300 dark:border-l-zinc-600',
}

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

function parsarPreco(valor: string): number | null {
  const limpo = valor.trim().replace(',', '.')
  if (!limpo) return null
  const num = parseFloat(limpo)
  return isNaN(num) ? null : num
}

function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function textoElapsado(dias: number): string {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `${dias} dias atrás`
}


function SkeletonLista() {
  return (
    <ul className="flex flex-col gap-3" aria-label="Carregando…">
      {[1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="flex gap-3 rounded-xl bg-white dark:bg-zinc-800 p-4 shadow-sm animate-pulse">
          <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/5 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-3/5 rounded bg-zinc-100 dark:bg-zinc-700/60" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function IconeLapis() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconeFechar() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconeLixeira() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteStatus[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')
  const [nomeSalao, setNomeSalao] = useState('')
  const [toast, setToast] = useState<Toast>(null)

  const [clienteEditando, setClienteEditando] = useState<ClienteStatus | null>(null)
  const [edicao, setEdicao] = useState({
    nome: '',
    whatsapp: '',
    servico: '',
    ultimaVisita: '',
    observacoes: '',
    autorizaContato: true,
    preco: '',
  })
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [errosEdicao, setErrosEdicao] = useState<Record<string, string>>({})
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [ultimoAtendimentoId, setUltimoAtendimentoId] = useState<string | null>(null)
  const [precoOriginal, setPrecoOriginal] = useState<number | null>(null)
  const [carregandoPreco, setCarregandoPreco] = useState(false)

  useEffect(() => {
    async function carregar() {
      const [{ data: clientesData, error: clientesError }, { data: configData }] =
        await Promise.all([
          supabase.from('clientes_status').select('*'),
          supabase.from('salao_config').select('nome_salao').single(),
        ])

      if (clientesError) {
        setErro('Não foi possível carregar a lista. Tente novamente.')
      } else {
        setClientes((clientesData as ClienteStatus[]) ?? [])
      }

      if (configData) setNomeSalao(configData.nome_salao)

      setCarregando(false)
    }

    carregar()
  }, [])

  const clientesOrdenados = useMemo(
    () =>
      [...clientes].sort((a, b) => {
        const diff = ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]
        if (diff !== 0) return diff
        return (b.dias_desde_ultima_visita ?? -1) - (a.dias_desde_ultima_visita ?? -1)
      }),
    [clientes],
  )

  const clientesFiltrados = useMemo(
    () =>
      clientesOrdenados.filter((c) => {
        const passaBusca =
          busca.trim() === '' || c.nome.toLowerCase().includes(busca.toLowerCase().trim())
        const passaFiltro = filtro === 'todos' || c.status === filtro
        return passaBusca && passaFiltro
      }),
    [clientesOrdenados, busca, filtro],
  )

  const contadores = useMemo(
    () => ({
      todos: clientes.length,
      verde: clientes.filter((c) => c.status === 'verde').length,
      amarelo: clientes.filter((c) => c.status === 'amarelo').length,
      vermelho: clientes.filter((c) => c.status === 'vermelho').length,
    }),
    [clientes],
  )

  function mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  async function abrirEdicao(cliente: ClienteStatus) {
    setClienteEditando(cliente)
    setEdicao({
      nome: cliente.nome,
      whatsapp: cliente.whatsapp,
      servico: cliente.ultimo_servico ?? '',
      ultimaVisita: cliente.ultima_visita ?? '',
      observacoes: cliente.observacoes ?? '',
      autorizaContato: cliente.autoriza_contato ?? true,
      preco: '',
    })
    setErrosEdicao({})
    setConfirmarExclusao(false)
    setUltimoAtendimentoId(null)
    setPrecoOriginal(null)

    if (cliente.ultima_visita) {
      setCarregandoPreco(true)
      const { data } = await supabase
        .from('atendimentos')
        .select('id, preco')
        .eq('cliente_id', cliente.id)
        .order('data_atendimento', { ascending: false })
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) {
        const atend = data as { id: string; preco: number | null }
        setUltimoAtendimentoId(atend.id)
        setPrecoOriginal(atend.preco)
        setEdicao((prev) => ({
          ...prev,
          preco: atend.preco != null ? String(atend.preco).replace('.', ',') : '',
        }))
      }
      setCarregandoPreco(false)
    }
  }

  function fecharEdicao() {
    if (salvandoEdicao || excluindo) return
    setClienteEditando(null)
    setConfirmarExclusao(false)
  }

  async function salvarEdicao() {
    if (!clienteEditando) return

    const novosErros: Record<string, string> = {}

    if (!edicao.nome.trim()) {
      novosErros.nome = 'Informe o nome'
    }

    const whatsappNormalizado = normalizarWhatsApp(edicao.whatsapp)
    if (!edicao.whatsapp.trim()) {
      novosErros.whatsapp = 'Informe o WhatsApp'
    } else if (whatsappNormalizado.length < 10) {
      novosErros.whatsapp = 'Número inválido — confira o WhatsApp'
    }

    setErrosEdicao(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setSalvandoEdicao(true)

    if (whatsappNormalizado !== clienteEditando.whatsapp) {
      const { data: duplicado } = await supabase
        .from('clientes')
        .select('id')
        .eq('whatsapp', whatsappNormalizado)
        .neq('id', clienteEditando.id)
        .maybeSingle()

      if (duplicado) {
        setErrosEdicao({ whatsapp: 'Já existe uma cliente com esse WhatsApp' })
        setSalvandoEdicao(false)
        return
      }
    }

    const { error: erroCliente } = await supabase
      .from('clientes')
      .update({
        nome: edicao.nome.trim(),
        whatsapp: whatsappNormalizado,
        observacoes: edicao.observacoes.trim() || null,
        autoriza_contato: edicao.autorizaContato,
      })
      .eq('id', clienteEditando.id)

    if (erroCliente) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
      setSalvandoEdicao(false)
      return
    }

    const servicoAlterado =
      edicao.servico.trim() !== '' &&
      edicao.servico.trim() !== (clienteEditando.ultimo_servico ?? '')

    const dataAlterada =
      !!clienteEditando.ultima_visita &&
      edicao.ultimaVisita !== clienteEditando.ultima_visita

    const precoAtual = parsarPreco(edicao.preco)
    const precoAlterado = ultimoAtendimentoId !== null && precoAtual !== precoOriginal

    if (servicoAlterado || dataAlterada || precoAlterado) {
      let atendId: string | null = ultimoAtendimentoId
      if (!atendId) {
        const { data: ultimoAtend } = await supabase
          .from('atendimentos')
          .select('id')
          .eq('cliente_id', clienteEditando.id)
          .order('data_atendimento', { ascending: false })
          .limit(1)
          .maybeSingle()
        atendId = (ultimoAtend as { id: string } | null)?.id ?? null
      }

      if (atendId) {
        const atualizacao: Record<string, unknown> = {}
        if (servicoAlterado) atualizacao.servico = edicao.servico.trim()
        if (dataAlterada) atualizacao.data_atendimento = edicao.ultimaVisita
        if (precoAlterado) atualizacao.preco = precoAtual

        await supabase
          .from('atendimentos')
          .update(atualizacao)
          .eq('id', atendId)
      }
    }

    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteEditando.id
          ? {
              ...c,
              nome: edicao.nome.trim(),
              whatsapp: whatsappNormalizado,
              observacoes: edicao.observacoes.trim() || null,
              ultimo_servico: servicoAlterado ? edicao.servico.trim() : c.ultimo_servico,
              ultima_visita: dataAlterada ? edicao.ultimaVisita : c.ultima_visita,
              autoriza_contato: edicao.autorizaContato,
            }
          : c,
      ),
    )

    mostrarToast('Dados atualizados', 'sucesso')
    setClienteEditando(null)
    setSalvandoEdicao(false)
  }

  async function excluirCliente() {
    if (!clienteEditando) return
    setExcluindo(true)

    const { error: erroAtend } = await supabase
      .from('atendimentos')
      .delete()
      .eq('cliente_id', clienteEditando.id)

    if (erroAtend) {
      mostrarToast('Não foi possível excluir. Tente novamente.', 'erro')
      setExcluindo(false)
      setConfirmarExclusao(false)
      return
    }

    const { error: erroCliente } = await supabase
      .from('clientes')
      .delete()
      .eq('id', clienteEditando.id)

    if (erroCliente) {
      mostrarToast('Não foi possível excluir. Tente novamente.', 'erro')
      setExcluindo(false)
      setConfirmarExclusao(false)
      return
    }

    setClientes((prev) => prev.filter((c) => c.id !== clienteEditando.id))
    mostrarToast(`${clienteEditando.nome.split(' ')[0]} removida`, 'sucesso')
    setClienteEditando(null)
    setExcluindo(false)
  }

  const FILTROS: { chave: FiltroStatus; label: string }[] = [
    { chave: 'todos', label: 'Todas' },
    { chave: 'verde', label: 'Ativas' },
    { chave: 'amarelo', label: 'Atenção' },
    { chave: 'vermelho', label: 'Sumidas' },
  ]

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

      {/* Modal de edição */}
      {clienteEditando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Editar cliente"
          className="fixed inset-0 z-40 flex flex-col justify-end sm:items-center sm:justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={fecharEdicao} />
          <div className="relative w-full rounded-t-2xl bg-white dark:bg-zinc-900 px-4 pb-8 pt-5 shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700 sm:hidden" />

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Editar cliente</h2>
              <button
                onClick={fecharEdicao}
                disabled={salvandoEdicao || excluindo}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                aria-label="Fechar"
              >
                <IconeFechar />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-nome" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="edit-nome"
                  type="text"
                  autoCapitalize="words"
                  value={edicao.nome}
                  onChange={(e) => setEdicao((prev) => ({ ...prev, nome: e.target.value }))}
                  disabled={salvandoEdicao || excluindo}
                  className={`h-12 rounded-lg border px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50 ${
                    errosEdicao.nome ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                />
                {errosEdicao.nome && (
                  <span role="alert" className="text-sm text-red-600">{errosEdicao.nome}</span>
                )}
              </div>

              {/* WhatsApp */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-whatsapp" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  WhatsApp <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="edit-whatsapp"
                  type="tel"
                  value={edicao.whatsapp}
                  onChange={(e) => setEdicao((prev) => ({ ...prev, whatsapp: e.target.value }))}
                  disabled={salvandoEdicao || excluindo}
                  className={`h-12 rounded-lg border px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50 ${
                    errosEdicao.whatsapp ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                />
                {errosEdicao.whatsapp && (
                  <span role="alert" className="text-sm text-red-600">{errosEdicao.whatsapp}</span>
                )}
              </div>

              {/* Serviço */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-servico" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Último serviço
                  <span className="ml-1 text-xs font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span>
                </label>
                <input
                  id="edit-servico"
                  type="text"
                  list="lista-servicos-edit"
                  value={edicao.servico}
                  onChange={(e) => setEdicao((prev) => ({ ...prev, servico: e.target.value }))}
                  disabled={salvandoEdicao || excluindo}
                  placeholder="Ex: Manicure, Pedicure…"
                  className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
                />
                <datalist id="lista-servicos-edit">
                  {SERVICOS_SUGERIDOS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Data do último atendimento */}
              {clienteEditando.ultima_visita && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-ultima-visita" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Data do último atendimento
                  </label>
                  <input
                    id="edit-ultima-visita"
                    type="date"
                    value={edicao.ultimaVisita}
                    onChange={(e) => setEdicao((prev) => ({ ...prev, ultimaVisita: e.target.value }))}
                    disabled={salvandoEdicao || excluindo}
                    className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
                  />
                </div>
              )}

              {/* Preço do último atendimento */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-preco" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Preço do último atendimento
                  <span className="ml-1 text-xs font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span>
                </label>
                {carregandoPreco ? (
                  <div className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700/50 animate-pulse" />
                ) : clienteEditando.ultima_visita ? (
                  <div className={`flex h-12 items-center overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-pink-500 border-zinc-300 dark:border-zinc-600 ${salvandoEdicao || excluindo ? 'bg-zinc-100 dark:bg-zinc-700/50' : 'bg-white dark:bg-zinc-800'}`}>
                    <span className="flex-shrink-0 pl-4 pr-2 text-sm select-none text-zinc-500 dark:text-zinc-400">
                      R$
                    </span>
                    <input
                      id="edit-preco"
                      type="text"
                      inputMode="decimal"
                      value={edicao.preco}
                      onChange={(e) => setEdicao((prev) => ({ ...prev, preco: e.target.value }))}
                      disabled={salvandoEdicao || excluindo}
                      placeholder="0,00"
                      className="h-full flex-1 bg-transparent pr-4 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                ) : (
                  <input
                    id="edit-preco"
                    type="text"
                    disabled
                    placeholder="Sem atendimento registrado"
                    className="h-12 rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 text-base bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 cursor-not-allowed"
                  />
                )}
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1">
                <label htmlFor="edit-observacoes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Observações
                  <span className="ml-1 text-xs font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span>
                </label>
                <textarea
                  id="edit-observacoes"
                  value={edicao.observacoes}
                  onChange={(e) => setEdicao((prev) => ({ ...prev, observacoes: e.target.value }))}
                  disabled={salvandoEdicao || excluindo}
                  placeholder="Preferências, alergias…"
                  rows={2}
                  className="resize-none rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-3 text-base text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-700/50"
                />
              </div>

              {/* Consentimento */}
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={edicao.autorizaContato}
                  onChange={(e) => setEdicao((prev) => ({ ...prev, autorizaContato: e.target.checked }))}
                  disabled={salvandoEdicao || excluindo}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-pink-500"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Cliente autoriza contato via WhatsApp
                </span>
              </label>

              {confirmarExclusao ? (
                <div className="flex flex-col gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Isso apaga todos os dados da cliente permanentemente e não pode ser desfeito.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmarExclusao(false)}
                      disabled={excluindo}
                      className="h-11 flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={excluirCliente}
                      disabled={excluindo}
                      className="h-11 flex-1 rounded-lg bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {excluindo ? 'Excluindo…' : 'Confirmar exclusão'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={salvarEdicao}
                    disabled={salvandoEdicao || !edicao.autorizaContato}
                    className="h-12 rounded-lg bg-pink-500 font-semibold text-white transition hover:bg-pink-600 active:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {salvandoEdicao ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                  <button
                    onClick={() => setConfirmarExclusao(true)}
                    disabled={salvandoEdicao}
                    className="flex h-10 items-center justify-center gap-2 text-sm text-red-500 dark:text-red-400 transition hover:text-red-700 dark:hover:text-red-300 disabled:opacity-40"
                  >
                    <IconeLixeira />
                    Excluir cliente
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra superior */}
      <header className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 pr-14">
        <h1 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {nomeSalao || 'Meu salão'}
        </h1>
      </header>

      {/* Busca */}
      <div className="px-4 pt-4">
        <input
          type="search"
          placeholder="Buscar pelo nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3">
        {FILTROS.map(({ chave, label }) => (
          <button
            key={chave}
            onClick={() => setFiltro(chave)}
            className={`flex-shrink-0 h-9 rounded-full px-4 text-sm font-medium transition ${
              filtro === chave
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            {label} ({contadores[chave] ?? contadores.todos})
          </button>
        ))}
      </div>

      {/* Lista */}
      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-red-600">
            {erro}
          </p>
        ) : clientesFiltrados.length === 0 ? (
          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {busca || filtro !== 'todos'
              ? 'Nenhuma cliente encontrada para essa busca.'
              : 'Nenhuma cliente cadastrada ainda.'}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {clientesFiltrados.map((cliente) => (
              <li
                key={cliente.id}
                className={`flex gap-4 rounded-xl bg-white dark:bg-zinc-800 p-5 shadow-sm border-l-4 ${BORDA_STATUS[cliente.status]}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{cliente.nome}</p>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {cliente.ultima_visita ? (
                      <>
                        Última visita: {formatarData(cliente.ultima_visita)}
                        {' · '}
                        {textoElapsado(cliente.dias_desde_ultima_visita!)}
                        {cliente.ultimo_servico && ` · ${cliente.ultimo_servico}`}
                      </>
                    ) : (
                      'Sem atendimentos registrados'
                    )}
                  </p>
                  {cliente.observacoes && (
                    <p className="mt-1 flex items-start gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-shrink-0" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span className="line-clamp-2">{cliente.observacoes}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => abrirEdicao(cliente)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 dark:text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300"
                  aria-label={`Editar ${cliente.nome}`}
                >
                  <IconeLapis />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
