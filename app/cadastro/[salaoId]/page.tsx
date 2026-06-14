import { createClient } from '@supabase/supabase-js'
import FormularioCadastroPublico from './formulario'

type SalaoConfig = {
  id: string
  nome_salao: string
  cor_primaria: string
  foto_url: string | null
  nome_manicure: string | null
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function buscarSalao(salaoId: string): Promise<SalaoConfig | null> {
  if (!UUID_REGEX.test(salaoId)) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const { data, error } = await supabase
    .from('salao_config')
    .select('id, nome_salao, cor_primaria, foto_url, nome_manicure')
    .eq('id', salaoId)
    .maybeSingle()

  if (error || !data) return null
  return data as SalaoConfig
}

export default async function CadastroPublicoPage({
  params,
}: {
  params: Promise<{ salaoId: string }>
}) {
  const { salaoId } = await params
  const salao = await buscarSalao(salaoId)

  if (!salao) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <p className="text-5xl">💅</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-800">
          Salão não encontrado
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Verifique o link com a sua manicure e tente novamente.
        </p>
      </div>
    )
  }

  return (
    <FormularioCadastroPublico
      salaoId={salao.id}
      nomeSalao={salao.nome_salao}
      corPrimaria={salao.cor_primaria ?? '#ec4899'}
      fotoUrl={salao.foto_url}
      nomeManicure={salao.nome_manicure}
    />
  )
}
