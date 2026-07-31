import { createClient } from '@supabase/supabase-js'
import { UUID_REGEX } from '@/lib/validators'
import { IconeCadeado } from '@/components/icons'
import FormularioAgendamento from './formulario-agendamento'

type SalaoConfig = {
  id: string
  nome_salao: string
  cor_primaria: string
  nome_manicure: string | null
  plano: string | null
  whatsapp: string | null
}

async function buscarSalao(salaoId: string): Promise<SalaoConfig | null> {
  if (!UUID_REGEX.test(salaoId)) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const { data, error } = await supabase
    .from('salao_config')
    .select('id, nome_salao, cor_primaria, nome_manicure, plano, whatsapp')
    .eq('id', salaoId)
    .maybeSingle()

  if (error || !data) return null
  return data as SalaoConfig
}

export default async function AgendarPage({
  params,
}: {
  params: Promise<{ salaoId: string }>
}) {
  const { salaoId } = await params
  const salao = await buscarSalao(salaoId)

  if (!salao) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <h1 className="text-xl font-semibold text-slate-800">Salão não encontrado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Verifique o link com a sua manicure e tente novamente.
        </p>
      </div>
    )
  }

  const plano = salao.plano ?? 'basic'
  if (plano !== 'profissional' && plano !== 'master') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <IconeCadeado size={40} className="mx-auto text-slate-400" />
        <h1 className="mt-4 text-xl font-semibold text-slate-800">
          Agendamento online não disponível para este salão
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Entre em contato diretamente com a profissional para agendar.
        </p>
      </div>
    )
  }

  return (
    <FormularioAgendamento
      salaoId={salao.id}
      nomeSalao={salao.nome_salao}
      corPrimaria={salao.cor_primaria ?? '#7C5CFF'}
      nomeManicure={salao.nome_manicure}
      whatsappManicure={salao.whatsapp}
    />
  )
}
