import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarRateLimiter, obterIp } from '@/lib/rate-limit'
import {
  DDI_BRASIL,
  normalizarWhatsAppCompleto,
  validarNumeroWhatsApp,
} from '@/lib/whatsapp'
import { UUID_REGEX } from '@/lib/validators'

const permitir = criarRateLimiter(5)

function criarClienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(request: NextRequest) {
  const ip = obterIp(request)

  if (!permitir(ip)) {
    return NextResponse.json(
      { erro: 'Muitas tentativas. Aguarde um minuto e tente novamente.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const { salaoId, nome, ddi, numero, email, dataNascimento, observacoes, autorizaContato, senha } = body

  if (typeof salaoId !== 'string' || !UUID_REGEX.test(salaoId)) {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (typeof nome !== 'string' || !nome.trim()) {
    return NextResponse.json(
      { erro: 'Informe seu nome.', campo: 'nome' },
      { status: 400 },
    )
  }

  const ddiNormalizado = typeof ddi === 'string' && ddi.trim() ? ddi : DDI_BRASIL
  const numeroLocal = typeof numero === 'string' ? numero : ''

  const validacaoWhatsApp = validarNumeroWhatsApp(ddiNormalizado, numeroLocal)
  if (!validacaoWhatsApp.valido) {
    return NextResponse.json(
      { erro: validacaoWhatsApp.erro ?? 'WhatsApp inválido.', campo: 'whatsapp' },
      { status: 400 },
    )
  }

  // Número completo já normalizado (DDI + DDD + número, só dígitos).
  const whatsappNormalizado = normalizarWhatsAppCompleto(ddiNormalizado, numeroLocal)

  if (autorizaContato !== true) {
    return NextResponse.json(
      { erro: 'O consentimento é obrigatório.', campo: 'autorizaContato' },
      { status: 400 },
    )
  }

  const supabase = criarClienteServidor()

  const { data: salao, error: erroSalao } = await supabase
    .from('salao_config')
    .select('id, plano')
    .eq('id', salaoId)
    .maybeSingle()

  if (erroSalao || !salao) {
    return NextResponse.json({ erro: 'Salão não encontrado.' }, { status: 404 })
  }

  const ehPro = salao.plano === 'profissional' || salao.plano === 'master'

  if (ehPro) {
    if (typeof senha !== 'string' || senha.length < 8) {
      return NextResponse.json(
        { erro: 'A senha deve ter pelo menos 8 caracteres.', campo: 'senha' },
        { status: 400 },
      )
    }
  }

  // Deduplicação pelo número completo normalizado. Inclui também a forma legada
  // (sem DDI) para reconhecer cadastros antigos salvos antes da adoção do código do país.
  const candidatosWhatsApp = [whatsappNormalizado]
  if (whatsappNormalizado.startsWith(DDI_BRASIL)) {
    candidatosWhatsApp.push(whatsappNormalizado.slice(DDI_BRASIL.length))
  }

  const { data: clientesExistentes, error: erroConsulta } = await supabase
    .from('clientes')
    .select('id')
    .eq('salao_id', salaoId)
    .in('whatsapp', candidatosWhatsApp)
    .limit(1)

  if (erroConsulta) {
    return NextResponse.json(
      { erro: 'Erro interno. Tente novamente.' },
      { status: 500 },
    )
  }

  if (clientesExistentes && clientesExistentes.length > 0) {
    return NextResponse.json({ duplicado: true }, { status: 409 })
  }

  const dataNascimentoValida =
    typeof dataNascimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)
      ? dataNascimento
      : null

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json(
      { erro: 'Informe seu e-mail.', campo: 'email' },
      { status: 400 },
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json(
      { erro: 'Digite um e-mail válido.', campo: 'email' },
      { status: 400 },
    )
  }

  const dadosCliente = {
    nome: nome.trim(),
    whatsapp: whatsappNormalizado,
    email: (email as string).trim(),
    data_nascimento: dataNascimentoValida,
    observacoes:
      typeof observacoes === 'string' && observacoes.trim()
        ? observacoes.trim()
        : null,
    autoriza_contato: true,
    origem: 'formulario',
    salao_id: salaoId,
    status_cadastro: 'pendente',
  }

  if (ehPro) {
    // Planos Profissional e Master: cria conta Auth para a cliente acessar o agendamento.
    // signUp (não admin.createUser) define a senha corretamente para login via e-mail+senha.
    const emailTrimmed = (email as string).trim()
    const { data: authData, error: erroAuth } = await supabase.auth.signUp({
      email: emailTrimmed,
      password: senha as string,
    })

    if (erroAuth) {
      // Ignora "email já cadastrado" — a cliente pode ter conta de outro salão
      const emailJaExiste =
        erroAuth.message?.toLowerCase().includes('already') ||
        erroAuth.code === 'email_exists'

      if (!emailJaExiste) {
        return NextResponse.json(
          { erro: 'Erro ao criar conta de acesso. Tente novamente.' },
          { status: 500 },
        )
      }
    }

    // Nova conta criada (identities preenchidas): confirma e-mail para login imediato sem verificação
    if (authData?.user && (authData.user.identities?.length ?? 0) > 0) {
      await supabase.auth.admin.updateUserById(authData.user.id, {
        email_confirm: true,
      })
    }

    const { error: erroCliente } = await supabase.from('clientes').insert(dadosCliente)
    if (erroCliente) {
      return NextResponse.json(
        { erro: 'Erro interno. Tente novamente.' },
        { status: 500 },
      )
    }
  } else {
    // Plano Basic: clientes NÃO criam conta no Supabase Auth.
    // Nunca adicionar createUser/signUp aqui para o plano basic.
    const { error: erroCliente } = await supabase.from('clientes').insert(dadosCliente)
    if (erroCliente) {
      return NextResponse.json(
        { erro: 'Erro interno. Tente novamente.' },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ sucesso: true })
}
