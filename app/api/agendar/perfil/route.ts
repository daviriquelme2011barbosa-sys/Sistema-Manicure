import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/validators'

function criarAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { nome, salaoId } = body

  if (typeof nome !== 'string' || !nome.trim()) {
    return NextResponse.json({ erro: 'Informe um nome válido.', campo: 'nome' }, { status: 400 })
  }
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

  const { error } = await admin
    .from('clientes')
    .update({ nome: nome.trim() })
    .eq('email', user.email)
    .eq('salao_id', salaoId)

  if (error) {
    return NextResponse.json({ erro: 'Não foi possível salvar. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}
