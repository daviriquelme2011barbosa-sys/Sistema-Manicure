import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (!request.cookies.get('sb-logged-in')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/clientes/:path*',
    '/cadastro',
    '/cadastrados/:path*',
    '/reativar/:path*',
    '/historico/:path*',
    '/aniversariantes/:path*',
    '/movimentacao/:path*',
    '/changelog/:path*',
    '/configuracoes/:path*',
    '/agenda/:path*',
    // /agendar/:path* é rota pública — intencionalmente ausente
    // /cadastro/[salaoId] é formulário público — intencionalmente ausente
    // /onboarding é rota pública — intencionalmente ausente
  ],
}
