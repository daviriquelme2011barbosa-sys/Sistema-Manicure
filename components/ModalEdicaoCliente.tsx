'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizarWhatsApp, parsearPreco } from '@/lib/formatters'
import { SERVICOS_SUGERIDOS } from '@/lib/constantes'
import { IconeFechar, IconeLixeira } from '@/components/icons'
import type { ClienteStatus } from '@/types'

type Props = {
  cliente: ClienteStatus
  onFechar: () => void
  onSalvo: (atualizado: ClienteStatus) => void
  onExcluido: (id: string) => void
  mostrarToast: (mensagem: string, tipo: 'sucesso' | 'erro') => void
}

export function ModalEdicaoCliente({ cliente, onFechar, onSalvo, onExcluido, mostrarToast }: Props) {
  const [edicao, setEdicao] = useState({
    nome: cliente.nome,
    whatsapp: cliente.whatsapp,
    servico: cliente.ultimo_servico ?? '',
    ultimaVisita: cliente.ultima_visita ?? '',
    observacoes: cliente.observacoes ?? '',
    autorizaContato: cliente.autoriza_contato ?? true,
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
    if (!cliente.ultima_visita) return

    let ativo = true
    async function carregarPreco() {
      setCarregandoPreco(true)
      const { data } = await supabase
        .from('atendimentos')
        .select('id, preco')
        .eq('cliente_id', cliente.id)
        .order('data_atendimento', { ascending: false })
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!ativo) return

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

    carregarPreco()
    return () => {
      ativo = false
    }
  }, [cliente.id, cliente.ultima_visita])

  function fecharEdicao() {
    if (salvandoEdicao || excluindo) return
    onFechar()
  }

  async function salvarEdicao() {
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

    if (whatsappNormalizado !== cliente.whatsapp) {
      const { data: duplicado } = await supabase
        .from('clientes')
        .select('id')
        .eq('whatsapp', whatsappNormalizado)
        .neq('id', cliente.id)
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
      .eq('id', cliente.id)

    if (erroCliente) {
      mostrarToast('Não foi possível salvar. Tente novamente.', 'erro')
      setSalvandoEdicao(false)
      return
    }

    const servicoAlterado =
      edicao.servico.trim() !== '' &&
      edicao.servico.trim() !== (cliente.ultimo_servico ?? '')

    const dataAlterada =
      !!cliente.ultima_visita && edicao.ultimaVisita !== cliente.ultima_visita

    const precoAtual = parsearPreco(edicao.preco)
    const precoAlterado = ultimoAtendimentoId !== null && precoAtual !== precoOriginal

    if (servicoAlterado || dataAlterada || precoAlterado) {
      let atendId: string | null = ultimoAtendimentoId
      if (!atendId) {
        const { data: ultimoAtend } = await supabase
          .from('atendimentos')
          .select('id')
          .eq('cliente_id', cliente.id)
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

        await supabase.from('atendimentos').update(atualizacao).eq('id', atendId)
      }
    }

    onSalvo({
      ...cliente,
      nome: edicao.nome.trim(),
      whatsapp: whatsappNormalizado,
      observacoes: edicao.observacoes.trim() || null,
      ultimo_servico: servicoAlterado ? edicao.servico.trim() : cliente.ultimo_servico,
      ultima_visita: dataAlterada ? edicao.ultimaVisita : cliente.ultima_visita,
      autoriza_contato: edicao.autorizaContato,
    })

    mostrarToast('Dados atualizados', 'sucesso')
    onFechar()
  }

  async function excluirCliente() {
    setExcluindo(true)

    const { error: erroAtend } = await supabase
      .from('atendimentos')
      .delete()
      .eq('cliente_id', cliente.id)

    if (erroAtend) {
      mostrarToast('Não foi possível excluir. Tente novamente.', 'erro')
      setExcluindo(false)
      setConfirmarExclusao(false)
      return
    }

    const { error: erroCliente } = await supabase
      .from('clientes')
      .delete()
      .eq('id', cliente.id)

    if (erroCliente) {
      mostrarToast('Não foi possível excluir. Tente novamente.', 'erro')
      setExcluindo(false)
      setConfirmarExclusao(false)
      return
    }

    onExcluido(cliente.id)
    mostrarToast(`${cliente.nome.split(' ')[0]} removida`, 'sucesso')
    onFechar()
  }

  return (
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
          {cliente.ultima_visita && (
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
            ) : cliente.ultima_visita ? (
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
  )
}
