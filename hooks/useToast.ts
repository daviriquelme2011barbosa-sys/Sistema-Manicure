import { useState } from 'react'
import type { Toast } from '@/types'

export function useToast() {
  const [toast, setToast] = useState<Toast>(null)

  function mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast(null), 3000)
  }

  return { toast, mostrarToast }
}
