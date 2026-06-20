import type { Toast } from '@/types'

export function ToastView({ toast }: { toast: Toast }) {
  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`animar-toast fixed left-4 right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg sm:left-auto sm:right-4 sm:w-80 ${
        toast.tipo === 'sucesso' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {toast.mensagem}
    </div>
  )
}
