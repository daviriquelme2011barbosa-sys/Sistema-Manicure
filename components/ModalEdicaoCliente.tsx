'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { parsearPreco } from '@/lib/formatters'
import {
  montarNumeroInternacional,
  normalizarWhatsAppCompleto,
  separarDdiNumero,
  validarNumeroWhatsApp,
} from '@/lib/whatsapp'
import { SERVICOS_SUGERIDOS } from '@/lib/constantes'
import { IconeFechar, IconeLixeira, IconeAlerta } from '@/components/icons'
import { CampoWhatsApp } from '@/components/CampoWhatsApp'
import type { ClienteStatus } from '@/types'

type Props = {
  cliente: ClienteStatus
  onFechar: () => void
  onSalvo: (atualizado: ClienteStatus) => void
  onExcluido: (id: string) => void
  mostrarToast: (mensagem: string, tipo: 'sucesso' | 'erro') => void
}

export function ModalEdicaoCliente({ cliente, onFechar, onSalvo, onExcluido, mostrarToast }: Props) {
  const whatsappInicial = separarDdiNumero(cliente.whatsapp)
  const [edicao, setEdicao] = useState({
    nome: cliente.nome,
    ddi: whatsappInicial.ddi,
    numero: whatsappInicial.numero,
    email: cliente.email ?? '',
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

    const validacaoWhatsApp = validarNumeroWhatsApp(edicao.ddi, edicao.numero)
    if (!validacaoWhatsApp.valido) {
      novosErros.whatsapp = validacaoWhatsApp.erro ?? 'Informe o WhatsApp'
    }

    if (edicao.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edicao.email.trim())) {
      novosErros.email = 'E-mail inválido'
    }

    setErrosEdicao(novosErros)
    if (Object.keys(novosErros).length > 0) return

    setSalvandoEdicao(true)

    const whatsappNormalizado = normalizarWhatsAppCompleto(edicao.ddi, edicao.numero)

    if (whatsappNormalizado !== montarNumeroInternacional(cliente.whatsapp)) {
      // Deduplicação pelo número completo, incluindo a forma legada (sem DDI).
      const candidatos = [whatsappNormalizado]
      if (whatsappNormalizado.startsWith('55')) {
        candidatos.push(whatsappNormalizado.slice(2))
      }

      const { data: duplicados } = await supabase
        .from('clientes')
        .select('id')
        .neq('id', cliente.id)
        .in('whatsapp', candidatos)
        .limit(1)

      if (duplicados && duplicados.length > 0) {
        setErrosEdicao({ whatsapp: 'Este número já está cadastrado' })
        setSalvandoEdicao(false)
        return
      }
    }

    const { error: erroCliente } = await supabase
      .from('clientes')
      .update({
        nome: edicao.nome.trim(),
        whatsapp: whatsappNormalizado,
        email: edicao.email.trim() || null,
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
      email: edicao.email.trim() || null,
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
      className="fixed inset-0 z-40 flex flex-col justify-end overflow-hidden sm:items-center sm:justify-center"
    >
      <div className="animar-overlay absolute inset-0 bg-black/40" onClick={fecharEdicao} />
      <div className="animar-sheet relative flex flex-col w-full max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl bg-white dark:bg-slate-800 shadow-xl sm:max-w-md sm:rounded-2xl">
        <button
          onClick={fecharEdicao}
          disabled={salvandoEdicao || excluindo}
          className="absolute right-3 top-3 hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
          aria-label="Fechar"
        >
          <IconeFechar />
        </button>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-8 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Editar cliente</h2>
          <button
            onClick={fecharEdicao}
            disabled={salvandoEdicao || excluindo}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            aria-label="Fechar"
          >
            <IconeFechar />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Nome */}
          <div className="flex flex-col">
            <label htmlFor="edit-nome" className="form-label">
              Nome <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="edit-nome"
              type="text"
              autoCapitalize="words"
              value={edicao.nome}
              onChange={(e) => setEdicao((prev) => ({ ...prev, nome: e.target.value }))}
              disabled={salvandoEdicao || excluindo}
              className={`form-input${errosEdicao.nome ? ' form-input-erro' : ''}`}
            />
            {errosEdicao.nome && (
              <span role="alert" className="form-error"><IconeAlerta />{errosEdicao.nome}</span>
            )}
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col">
            <label htmlFor="edit-whatsapp" className="form-label">
              WhatsApp <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <CampoWhatsApp
              id="edit-whatsapp"
              variante="painel"
              ddi={edicao.ddi}
              numero={edicao.numero}
              onChange={(novoDdi, novoNumero) =>
                setEdicao((prev) => ({ ...prev, ddi: novoDdi, numero: novoNumero }))
              }
              disabled={salvandoEdicao || excluindo}
              erro={!!errosEdicao.whatsapp}
            />
            {errosEdicao.whatsapp && (
              <span role="alert" className="form-error"><IconeAlerta />{errosEdicao.whatsapp}</span>
            )}
          </div>

          {/* E-mail */}
          <div className="flex flex-col">
            <label htmlFor="edit-email" className="form-label">
              E-mail
              <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
            </label>
            <input
              id="edit-email"
              type="email"
              value={edicao.email}
              onChange={(e) => setEdicao((prev) => ({ ...prev, email: e.target.value }))}
              disabled={salvandoEdicao || excluindo}
              placeholder="seu@email.com"
              className={`form-input${errosEdicao.email ? ' form-input-erro' : ''}`}
            />
            {errosEdicao.email && (
              <span role="alert" className="form-error"><IconeAlerta />{errosEdicao.email}</span>
            )}
          </div>

          {/* Serviço */}
          <div className="flex flex-col">
            <label htmlFor="edit-servico" className="form-label">
              Último serviço
              <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
            </label>
            <input
              id="edit-servico"
              type="text"
              list="lista-servicos-edit"
              value={edicao.servico}
              onChange={(e) => setEdicao((prev) => ({ ...prev, servico: e.target.value }))}
              disabled={salvandoEdicao || excluindo}
              placeholder="Ex: Manicure, Pedicure…"
              className="form-input"
            />
            <datalist id="lista-servicos-edit">
              {SERVICOS_SUGERIDOS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Data do último atendimento */}
          {cliente.ultima_visita && (
            <div className="flex flex-col">
              <label htmlFor="edit-ultima-visita" className="form-label">
                Data do último atendimento
              </label>
              <input
                id="edit-ultima-visita"
                type="date"
                value={edicao.ultimaVisita}
                onChange={(e) => setEdicao((prev) => ({ ...prev, ultimaVisita: e.target.value }))}
                disabled={salvandoEdicao || excluindo}
                className="form-input"
              />
            </div>
          )}

          {/* Preço do último atendimento */}
          <div className="flex flex-col">
            <label htmlFor="edit-preco" className="form-label">
              Preço do último atendimento
              <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
            </label>
            {carregandoPreco ? (
              <div className="h-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
            ) : cliente.ultima_visita ? (
              <div className={`flex h-12 items-center overflow-hidden rounded-lg border border-slate-200 transition-colors duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 dark:border-slate-700 ${salvandoEdicao || excluindo ? 'bg-slate-100 dark:bg-slate-700/50' : 'bg-white dark:bg-slate-800'}`}>
                <span className="flex-shrink-0 pl-4 pr-2 text-sm select-none text-slate-500 dark:text-slate-400">
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
                  className="h-full flex-1 bg-transparent pr-4 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none disabled:cursor-not-allowed"
                />
              </div>
            ) : (
              <input
                id="edit-preco"
                type="text"
                disabled
                placeholder="Sem atendimento registrado"
                className="h-12 rounded-lg border border-slate-200 dark:border-slate-700 px-4 text-base bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 cursor-not-allowed"
              />
            )}
          </div>

          {/* Observações */}
          <div className="flex flex-col">
            <label htmlFor="edit-observacoes" className="form-label">
              Observações
              <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="edit-observacoes"
              value={edicao.observacoes}
              onChange={(e) => setEdicao((prev) => ({ ...prev, observacoes: e.target.value }))}
              disabled={salvandoEdicao || excluindo}
              placeholder="Preferências, alergias…"
              rows={2}
              className="form-textarea"
            />
          </div>

          {/* Consentimento */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={edicao.autorizaContato}
              onChange={(e) => setEdicao((prev) => ({ ...prev, autorizaContato: e.target.checked }))}
              disabled={salvandoEdicao || excluindo}
              className="mt-0.5 h-5 w-5 flex-shrink-0 accent-primary"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
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
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluirCliente}
                  disabled={excluindo}
                  className="btn-danger flex-1 text-sm"
                >
                  {excluindo && <span className="form-spinner" aria-hidden="true" />}
                  {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao || !edicao.autorizaContato}
                className="btn-primary w-full active:scale-[0.98]"
              >
                {salvandoEdicao && <span className="form-spinner" aria-hidden="true" />}
                {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
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
    </div>
  )
}
