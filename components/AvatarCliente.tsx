type Props = {
  fotoUrl?: string | null
  nome: string
  className?: string
}

export function AvatarCliente({ fotoUrl, nome, className = 'h-9 w-9 text-sm' }: Props) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '?'

  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nome}
        className={`flex-shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-teal-500 font-semibold text-white ${className}`}
      aria-hidden="true"
    >
      {inicial}
    </span>
  )
}
