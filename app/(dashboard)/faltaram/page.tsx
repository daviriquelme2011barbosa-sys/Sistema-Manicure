'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/formatters'
import { IconeWhatsApp } from '@/components/icons'

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
  return `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`
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
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Faltaram</h1>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          Clientes com horário marcado que não compareceram
        </p>
      </header>

      <main className="flex-1 px-4 pb-28 pt-6">
        {carregando ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        ) : faltaram.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl">🎉</p>
            <p className="mt-3 text-base font-semibold text-zinc-700 dark:text-zinc-200">
              Nenhuma falta registrada
            </p>
            <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
              Boa notícia! Todas as clientes compareceram.
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {nome}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatarData(ag.data)}
                      {ag.horario && ` às ${ag.horario.slice(0, 5)}`}
                      {ag.servico && ` · ${ag.servico}`}
                    </p>
                  </div>

                  {whatsapp && (
                    <a
                      href={construirLinkWhatsApp(whatsapp, nome)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600 active:bg-green-700"
                      aria-label={`Enviar mensagem para ${nome}`}
                    >
                      <IconeWhatsApp />
                    </a>
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
