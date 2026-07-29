'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { textoSemAparecer } from '@/lib/formatters'
import { linkWhatsApp } from '@/lib/whatsapp'
import { SkeletonLista } from '@/components/SkeletonLista'
import { IconeVoltar, IconeWhatsApp } from '@/components/icons'
import type { ClienteReativar } from '@/types'

function BadgeStatus({ status }: { status: 'vermelho' | 'amarelo' }) {
  return (
    <span
      className={`mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-full ${
        status === 'vermelho' ? 'bg-danger animar-dot' : 'bg-warning'
      }`}
    />
  )
}

function montarLinkWhatsApp(cliente: ClienteReativar): string {
  const primeiroNome = cliente.nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! 😊 Senti sua falta aqui no salão. Faz um tempinho que você não aparece — bora marcar um horário pra deixar essas unhas em dia? 😊`
  return linkWhatsApp(cliente.whatsapp, mensagem)
}

export default function ReativarPage() {
  const [clientes, setClientes] = useState<ClienteReativar[]>([])
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
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

  const totalSumidas = clientes.filter((c) => c.status === 'vermelho').length

  function subtitulo(): string {
    if (carregando || erro) return ''
    if (totalSumidas === 0) return 'Nenhuma sumida — só atenção'
    if (totalSumidas === 1) return '1 cliente sumida há mais de 60 dias'
    return `${totalSumidas} clientes sumidas há mais de 60 dias`
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/clientes"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-hover"
            aria-label="Voltar para lista de clientes"
          >
            <IconeVoltar />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-text">
              Clientes para reativar
            </h1>
            {!carregando && !erro && (
              <p className="text-sm text-text-secondary">{subtitulo()}</p>
            )}
          </div>
          {!carregando && !erro && clientes.length > 0 && (
            <div className="flex flex-shrink-0 flex-col items-end">
              <span className="text-2xl font-bold leading-none tabular-nums text-danger">
                {clientes.length}
              </span>
              <span className="text-[11px] font-medium text-text-muted">
                para reativar
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={4} comBotao />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-danger">
            {erro}
          </p>
        ) : clientes.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center px-4">
            <span className="text-5xl" aria-hidden="true">🎉</span>
            <p className="font-medium text-text">
              Nenhuma cliente sumida no momento
            </p>
            <p className="text-sm text-text-muted">
              Continue registrando os atendimentos para manter o controle!
            </p>
          </div>
        ) : (
          <ul className="animar-lista flex flex-col gap-3">
            {clientes.map((cliente) => (
              <li
                key={cliente.id}
                className="rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:bg-hover"
              >
                <div className="flex gap-3">
                  <BadgeStatus status={cliente.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">
                      {cliente.nome}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {textoSemAparecer(cliente.dias_desde_ultima_visita)}
                    </p>
                  </div>
                </div>
                <a
                  href={montarLinkWhatsApp(cliente)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (salaoId) {
                      void supabase
                        .from('reativacoes')
                        .insert({ salao_id: salaoId, cliente_id: cliente.id })
                    }
                  }}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-base font-semibold text-white shadow-[0_2px_8px_rgba(37,211,102,0.3)] transition hover:bg-[#20BD5A] hover:shadow-[0_4px_14px_rgba(37,211,102,0.4)] active:bg-[#1AA34C] active:scale-[0.98]"
                >
                  <IconeWhatsApp />
                  Mandar mensagem
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
