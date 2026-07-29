'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarDiaMes } from '@/lib/formatters'
import { linkWhatsApp } from '@/lib/whatsapp'
import { SkeletonLista } from '@/components/SkeletonLista'
import { IconeWhatsApp, IconeChevronBaixo } from '@/components/icons'
import type { Aniversariante } from '@/types'

function montarLinkWhatsApp(cliente: Aniversariante): string {
  const primeiroNome = cliente.nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! 🎂 Hoje é um dia especial — feliz aniversário! Que tal comemorar com as unhas em dia? Adoraria te ver aqui no salão! 😊`
  return linkWhatsApp(cliente.whatsapp, mensagem)
}

export default function AniversariantesPage() {
  const [deHoje, setDeHoje] = useState<Aniversariante[]>([])
  const [doMes, setDoMes] = useState<Aniversariante[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mesExpandido, setMesExpandido] = useState(false)

  useEffect(() => {
    async function carregar() {
      const agora = new Date()
      const mesAtual = agora.getMonth() + 1
      const diaAtual = agora.getDate()

      try {
        const { data: salaoData, error: salaoError } = await supabase
          .from('salao_config')
          .select('id')
          .maybeSingle()

        if (salaoError) throw salaoError
        const salaoId = salaoData?.id
        if (!salaoId) throw new Error('Salão não encontrado')

        const { data, error } = await supabase
          .from('clientes')
          .select('id, nome, whatsapp, data_nascimento')
          .eq('salao_id', salaoId)
          .not('data_nascimento', 'is', null)

        if (error) throw error

        const doMesCompleto = ((data ?? []) as Aniversariante[]).filter((c) => {
          const mes = parseInt(c.data_nascimento.split('-')[1], 10)
          return mes === mesAtual
        })

        const hoje = doMesCompleto.filter(
          (c) => parseInt(c.data_nascimento.split('-')[2], 10) === diaAtual
        )

        const restantes = doMesCompleto
          .filter((c) => parseInt(c.data_nascimento.split('-')[2], 10) !== diaAtual)
          .sort(
            (a, b) =>
              parseInt(a.data_nascimento.split('-')[2], 10) -
              parseInt(b.data_nascimento.split('-')[2], 10)
          )

        setDeHoje(hoje)
        setDoMes(restantes)
      } catch {
        setErro('Não foi possível carregar. Tente novamente.')
      }

      setCarregando(false)
    }

    carregar()
  }, [])

  const semNenhum = deHoje.length === 0 && doMes.length === 0

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4">
        <h1 className="text-base font-semibold text-text">
          Aniversariantes do mês
        </h1>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        {carregando ? (
          <SkeletonLista itens={4} comBotao />
        ) : erro ? (
          <p role="alert" className="mt-8 text-center text-sm text-danger">
            {erro}
          </p>
        ) : semNenhum ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center px-4">
            <span className="text-5xl" aria-hidden="true">🎂</span>
            <p className="font-medium text-text">
              Nenhum aniversariante este mês
            </p>
            <p className="text-sm text-text-muted">
              As clientes precisam informar a data de nascimento no formulário de cadastro.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Aniversariantes de hoje */}
            {deHoje.length > 0 && (
              <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-warning">
                  🎂 Hoje
                </p>
                <ul className="animar-lista flex flex-col gap-3">
                  {deHoje.map((cliente) => (
                    <li
                      key={cliente.id}
                      className="rounded-xl border border-warning/30 bg-warning-soft p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 text-2xl" aria-hidden="true">🎂</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-text">
                            {cliente.nome}
                          </p>
                          <span className="mt-1 inline-flex items-center rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-white">
                            🎉 Aniversário hoje!
                          </span>
                        </div>
                      </div>
                      <a
                        href={montarLinkWhatsApp(cliente)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white shadow-[0_2px_8px_rgba(37,211,102,0.3)] transition hover:bg-[#20BD5A] active:bg-[#1AA34C] active:scale-[0.98]"
                      >
                        <IconeWhatsApp />
                        Mandar mensagem
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Aniversariantes do mês */}
            {doMes.length > 0 && (
              <section>
                <button
                  onClick={() => setMesExpandido((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 shadow-sm transition hover:bg-hover"
                  aria-expanded={mesExpandido}
                >
                  <span className="text-sm font-medium text-text">
                    🎁{' '}
                    {doMes.length === 1
                      ? '1 aniversariante este mês'
                      : `${doMes.length} aniversariantes este mês`}
                  </span>
                  <IconeChevronBaixo
                    className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${mesExpandido ? 'rotate-180' : ''}`}
                  />
                </button>

                {mesExpandido && (
                  <ul className="animar-lista mt-3 flex flex-col gap-3">
                    {doMes.map((cliente) => (
                      <li
                        key={cliente.id}
                        className="rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:bg-hover"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 text-xl" aria-hidden="true">🎂</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-text">
                              {cliente.nome}
                            </p>
                            <span className="mt-1 inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-secondary">
                              {formatarDiaMes(cliente.data_nascimento)}
                            </span>
                          </div>
                        </div>
                        <a
                          href={montarLinkWhatsApp(cliente)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white shadow-[0_2px_8px_rgba(37,211,102,0.3)] transition hover:bg-[#20BD5A] active:bg-[#1AA34C] active:scale-[0.98]"
                        >
                          <IconeWhatsApp />
                          Mandar mensagem
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
