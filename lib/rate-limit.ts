import type { NextRequest } from 'next/server'

// Rate limiter em memória por processo. Por ser MVP de instância única,
// memória por processo é suficiente — cada chamada a criarRateLimiter mantém
// seu próprio Map, preservando contadores independentes por rota.
type Entrada = { count: number; resetAt: number }

export function criarRateLimiter(limite: number, janelaMs = 60_000) {
  const tentativas = new Map<string, Entrada>()

  return function permitir(ip: string): boolean {
    const agora = Date.now()
    const entrada = tentativas.get(ip)

    if (!entrada || agora > entrada.resetAt) {
      tentativas.set(ip, { count: 1, resetAt: agora + janelaMs })
      return true
    }

    if (entrada.count >= limite) return false

    entrada.count++
    return true
  }
}

export function obterIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}
