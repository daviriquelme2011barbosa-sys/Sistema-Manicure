'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { IconeFechar } from '@/components/icons'

interface Slide {
  emoji: string
  titulo: string
  texto: string
}

const SLIDES: Slide[] = [
  {
    emoji: '🔐',
    titulo: 'Login',
    texto: 'Logue com seu e-mail e senha que preencheu no formulário de onboarding',
  },
  {
    emoji: '🏠',
    titulo: 'Dashboard',
    texto: 'Menu principal com um resumo do seu sistema — clientes ativas, sumidas, aniversariantes, atendimentos do mês, faturamento e total de clientes',
  },
  {
    emoji: '📊',
    titulo: 'Gráfico',
    texto: 'Ainda no menu, um pouco mais pra baixo, você terá um gráfico de comparações com meses anteriores mostrando novas clientes, clientes ativas e reativações efetivas',
  },
  {
    emoji: '📋',
    titulo: 'Menu',
    texto: 'Área de menu — aqui você acessa todas as seções do sistema',
  },
  {
    emoji: '👥',
    titulo: 'Clientes',
    texto: 'Área de controle de clientes — aqui ficam os clientes com atendimento registrado. Verde = até 30 dias sem visita. Amarelo = mais de 31 dias. Vermelho = 60 dias ou mais',
  },
  {
    emoji: '📝',
    titulo: 'Cadastrados',
    texto: 'Área de cadastrados — todos os clientes que se cadastrarem pelo formulário público estarão aqui',
  },
  {
    emoji: '✅',
    titulo: 'Registrar Atendimento',
    texto: 'Aqui você registra os atendimentos. Todos os clientes cadastrados aparecem aqui. Clique na cliente e preencha o formulário',
  },
  {
    emoji: '💬',
    titulo: 'Reativar',
    texto: 'Clientes para reativar — clientes que estão há 30 dias ou mais sem aparecer estarão aqui com um botão que abre o WhatsApp com mensagem personalizada. Objetivo: reativar clientes que você nem lembrava que estavam sumidas',
  },
  {
    emoji: '🎂',
    titulo: 'Aniversariantes',
    texto: 'Aqui ficam todos os aniversariantes do mês e do dia. Assim como em reativar, há um botão para enviar mensagem personalizada pelo WhatsApp. OBS: Reativar clientes através de uma data especial',
  },
  {
    emoji: '📅',
    titulo: 'Histórico',
    texto: 'Aqui é o histórico — todos os atendimentos registrados no mês escolhido estarão aqui',
  },
  {
    emoji: '🔔',
    titulo: 'Movimentação',
    texto: 'Toda movimentação das últimas 24h, semana ou mês estará aqui. Exemplo: tal cliente se cadastrou, tal cliente foi reativada, hoje é aniversário de tal pessoa...',
  },
  {
    emoji: '⭐',
    titulo: 'Novidades',
    texto: 'Aqui todas as novidades, mudanças e melhorias no sistema serão informadas',
  },
  {
    emoji: '⚙️',
    titulo: 'Configurações',
    texto: 'Nas configurações você pode ver o e-mail da conta, editar seu nome, escolher seu gênero, copiar o link do formulário ou baixar o QR Code para colar no seu estabelecimento',
  },
  {
    emoji: '🎨',
    titulo: 'Personalizar Formulário',
    texto: 'Ainda nas configurações, você pode editar a cor e a foto do seu formulário. Suas clientes verão a cor e a foto quando acessarem o formulário',
  },
]

const TOTAL = SLIDES.length

interface Props {
  onFechar: () => void
}

export function TutorialCarrossel({ onFechar }: Props) {
  const [indice, setIndice] = useState(0)
  const touchInicioX = useRef<number | null>(null)
  const touchInicioY = useRef<number | null>(null)

  const irPara = useCallback((novoIndice: number) => {
    if (novoIndice < 0 || novoIndice >= TOTAL) return
    setIndice(novoIndice)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
      else if (e.key === 'ArrowRight') setIndice((i) => Math.min(i + 1, TOTAL - 1))
      else if (e.key === 'ArrowLeft') setIndice((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onFechar])

  function onTouchStart(e: React.TouchEvent) {
    touchInicioX.current = e.touches[0].clientX
    touchInicioY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchInicioX.current === null || touchInicioY.current === null) return
    const deltaX = touchInicioX.current - e.changedTouches[0].clientX
    const deltaY = touchInicioY.current - e.changedTouches[0].clientY
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      irPara(deltaX > 0 ? indice + 1 : indice - 1)
    }
    touchInicioX.current = null
    touchInicioY.current = null
  }

  const progresso = ((indice + 1) / TOTAL) * 100
  const ehUltimo = indice === TOTAL - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial do sistema"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4"
      style={{
        background: 'rgba(9,9,11,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Botão fechar */}
      <button
        onClick={onFechar}
        aria-label="Fechar tutorial"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
      >
        <IconeFechar />
      </button>

      {/* Card */}
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(160deg, rgba(36,20,48,0.98) 0%, rgba(18,15,30,0.99) 100%)',
          border: '1px solid rgba(147,51,234,0.25)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Barra de progresso */}
        <div className="h-1.5 w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="carrossel-progresso h-full"
            style={{
              width: `${progresso}%`,
              background: 'linear-gradient(90deg, #ec4899, #9333ea)',
            }}
          />
        </div>

        {/* Counter */}
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-xs font-semibold tracking-wide" style={{ color: 'rgba(236,72,153,0.7)' }}>
            TUTORIAL
          </span>
          <span className="tabular-nums text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {indice + 1} de {TOTAL}
          </span>
        </div>

        {/* Faixa de slides */}
        <div
          className="overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="carrossel-faixa flex"
            style={{ transform: `translateX(-${indice * 100}%)` }}
          >
            {SLIDES.map((slide, i) => (
              <div
                key={i}
                className="min-w-full px-6 pb-2 pt-6"
                aria-hidden={i !== indice}
              >
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(147,51,234,0.15))',
                    border: '1px solid rgba(236,72,153,0.2)',
                  }}
                >
                  {slide.emoji}
                </div>
                <h2 className="mb-3 text-center text-xl font-bold text-white">
                  {slide.titulo}
                </h2>
                <p
                  className="min-h-[72px] text-center text-sm leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.62)' }}
                >
                  {slide.texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Navegação + dots */}
        <div className="flex items-center gap-3 px-5 pb-5 pt-4">
          {/* Anterior */}
          <button
            onClick={() => irPara(indice - 1)}
            disabled={indice === 0}
            aria-label="Slide anterior"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Dots */}
          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => irPara(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className="carrossel-dot rounded-full"
                style={{
                  width: i === indice ? '18px' : '6px',
                  height: '6px',
                  background: i === indice
                    ? 'linear-gradient(90deg, #ec4899, #9333ea)'
                    : 'rgba(255,255,255,0.22)',
                }}
              />
            ))}
          </div>

          {/* Próximo ou Concluir */}
          {ehUltimo ? (
            <button
              onClick={onFechar}
              className="flex h-11 flex-shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #9333ea)',
                boxShadow: '0 4px 16px rgba(236,72,153,0.35)',
              }}
            >
              Concluir
            </button>
          ) : (
            <button
              onClick={() => irPara(indice + 1)}
              aria-label="Próximo slide"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white transition hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #9333ea)',
                boxShadow: '0 4px 16px rgba(236,72,153,0.35)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
