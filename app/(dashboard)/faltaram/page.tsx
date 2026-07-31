'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/formatters'
import { montarNumeroInternacional } from '@/lib/whatsapp'
import { BotaoWhatsApp } from '@/components/BotaoWhatsApp'
import { IconeCheck } from '@/components/icons'

type Faltou = {
  id: string
  data: string
  horario: string | null
  servico: string | null
  clientes: { nome: string; whatsapp: string } | null
}

function construirLinkWhatsApp(whatsapp: string, nome: string): string {
  const primeiroNome = nome.split(' ')[0]
  const mensagem = `Oi ${primeiroNome}! Vi que você tinha horário marcado aqui no salão mas não conseguiu aparecer. Que tal a gente remarcar? Estou te esperando! 😊`
  return `https://wa.me/${montarNumeroInternacional(whatsapp)}?text=${encodeURIComponent(mensagem)}`
}

export default function FaltaramPage() {
  const [faltaram, setFaltaram] = useState<Faltou[]>([])
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      const { data: config } = await supabase
        .from('salao_config')
        .select('id, plano')
        .single()

      if (!config) {
        setCarregando(false)
        return
      }

      const plano = (config.plano as string | null) ?? 'basic'
      if (plano !== 'profissional' && plano !== 'master') {
        router.replace('/')
        return
      }

      const { data } = await supabase
        .from('agendamentos')
        .select('id, data, horario, servico, clientes(nome, whatsapp)')
        .eq('salao_id', config.id)
        .eq('status', 'faltou')
        .order('data', { ascending: false })

      setFaltaram((data ?? []) as unknown as Faltou[])
      setCarregando(false)
    }

    carregar()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface px-4 py-4">
        <h1 className="text-base font-semibold text-text">Faltaram</h1>
        <p className="mt-0.5 text-xs text-text-muted">
          Clientes com horário marcado que não compareceram
        </p>
      </header>

      <main className="flex-1 px-4 pb-28 pt-6">
        {carregando ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : faltaram.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <IconeCheck size={44} className="text-text-muted" />
            <p className="mt-3 font-medium text-text">
              Nenhuma cliente faltou ainda
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Quando uma cliente não comparecer ao horário marcado, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {faltaram.map((ag) => {
              const nome = ag.clientes?.nome ?? 'Cliente desconhecida'
              const whatsapp = ag.clientes?.whatsapp ?? ''
              return (
                <li
                  key={ag.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition hover:bg-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text">
                        {nome}
                      </p>
                      <span className="inline-flex flex-shrink-0 items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                        Faltou
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {formatarData(ag.data)}
                      {ag.horario && ` às ${ag.horario.slice(0, 5)}`}
                      {ag.servico && ` · ${ag.servico}`}
                    </p>
                  </div>

                  {whatsapp && (
                    <BotaoWhatsApp
                      href={construirLinkWhatsApp(whatsapp, nome)}
                      compact
                      ariaLabel={`Enviar mensagem para ${nome}`}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
