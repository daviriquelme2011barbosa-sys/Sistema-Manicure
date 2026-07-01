import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/validators'

type ChaveDia = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'

const MAPA_DIA_JS: Record<ChaveDia, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
}

function criarAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  let body: { salaoId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { salaoId } = body
  if (typeof salaoId !== 'string' || !UUID_REGEX.test(salaoId)) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const admin = criarAdmin()

  const {
    data: { user },
    error: erroUser,
  } = await admin.auth.getUser(token)

  if (erroUser || !user?.email) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  // Bloqueia manicures: dono de salão não deve acessar a página de agendamento
  const { data: salaoOwner } = await admin
    .from('salao_config')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (salaoOwner) {
    return NextResponse.json({ status: 'is_owner' })
  }

  const { data: cliente, error: erroCliente } = await admin
    .from('clientes')
    .select('id, nome, status_cadastro')
    .eq('email', user.email)
    .eq('salao_id', salaoId)
    .maybeSingle()

  if (erroCliente) {
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }

  if (!cliente) {
    return NextResponse.json({ status: 'nao_encontrado' })
  }

  if (cliente.status_cadastro !== 'aprovado') {
    return NextResponse.json({ status: 'pendente' })
  }

  const { data: horarios } = await admin
    .from('horarios_disponiveis')
    .select('*')
    .eq('salao_id', salaoId)
    .maybeSingle()

  const diasAtivos: number[] = []
  if (horarios) {
    for (const chave of Object.keys(MAPA_DIA_JS) as ChaveDia[]) {
      const dia = (horarios as Record<string, unknown>)[chave] as Record<string, unknown> | null
      if (dia?.ativo === true) {
        diasAtivos.push(MAPA_DIA_JS[chave])
      }
    }
  }

  // foto_url é buscado em consulta separada e tolera a coluna ainda não existir
  // (pendente da migration sql/add-foto-url-clientes.sql) sem quebrar o login.
  const { data: fotoData } = await admin
    .from('clientes')
    .select('foto_url')
    .eq('id', cliente.id)
    .maybeSingle()

  return NextResponse.json({
    status: 'aprovado',
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    clienteFotoUrl: (fotoData as { foto_url: string | null } | null)?.foto_url ?? null,
    diasAtivos,
  })
}
