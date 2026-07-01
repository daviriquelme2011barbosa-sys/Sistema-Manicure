import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/validators'

const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const TAMANHO_MAXIMO = 5 * 1024 * 1024

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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const salaoId = formData.get('salaoId')
  const arquivo = formData.get('arquivo')

  if (typeof salaoId !== 'string' || !UUID_REGEX.test(salaoId)) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 })
  }
  if (!(arquivo.type in TIPOS_PERMITIDOS)) {
    return NextResponse.json({ erro: 'Formato não permitido. Use JPEG, PNG, WebP ou GIF.' }, { status: 400 })
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: 'A foto deve ter no máximo 5MB.' }, { status: 400 })
  }

  const admin = criarAdmin()

  const {
    data: { user },
    error: erroUser,
  } = await admin.auth.getUser(token)

  if (erroUser || !user?.email) {
    return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 401 })
  }

  const { data: cliente, error: erroCliente } = await admin
    .from('clientes')
    .select('id')
    .eq('email', user.email)
    .eq('salao_id', salaoId)
    .maybeSingle()

  if (erroCliente || !cliente) {
    return NextResponse.json({ erro: 'Cliente não encontrado.' }, { status: 404 })
  }

  const ext = TIPOS_PERMITIDOS[arquivo.type]
  const caminho = `clientes/${cliente.id}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type })

  if (uploadError) {
    return NextResponse.json({ erro: 'Não foi possível enviar a foto. Tente novamente.' }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(caminho)
  const novaUrl = urlData.publicUrl

  const { error: updateError } = await admin
    .from('clientes')
    .update({ foto_url: novaUrl })
    .eq('id', cliente.id)

  if (updateError) {
    return NextResponse.json({ erro: 'Foto enviada mas não foi possível salvar. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true, fotoUrl: novaUrl })
}
