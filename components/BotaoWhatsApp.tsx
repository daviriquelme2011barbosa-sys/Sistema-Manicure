import { IconeWhatsApp } from '@/components/icons'

type BotaoWhatsAppProps = {
  /** Link `https://wa.me/...` já pronto (montado com lib/whatsapp) */
  href: string
  /** Texto do botão. Ignorado quando `compact` está ativo. */
  label?: string
  /** Renderiza só o ícone (quadrado 40×40) — para linhas de lista mais estreitas */
  compact?: boolean
  /** Obrigatório quando `compact`, para leitores de tela */
  ariaLabel?: string
  onClick?: () => void
  className?: string
}

/**
 * CTA único de WhatsApp do sistema (auditoria Fase 5 — Correção 3).
 * Substitui as duas variantes antigas (barra verde full-width e botão
 * circular verde) por um único componente: 40px de altura, largura
 * automática, cor primária da marca (nunca o verde do WhatsApp).
 */
export function BotaoWhatsApp({
  href,
  label = 'Mandar mensagem',
  compact = false,
  ariaLabel,
  onClick,
  className = '',
}: BotaoWhatsAppProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={compact ? ariaLabel ?? label : undefined}
      className={`inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-md bg-primary font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] active:bg-primary-pressed ${
        compact ? 'w-10 px-0' : 'px-4 text-sm'
      } ${className}`}
    >
      <IconeWhatsApp size={18} />
      {!compact && label}
    </a>
  )
}
