import FormularioOnboarding from './formulario'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const { token } = await searchParams
  return <FormularioOnboarding token={token ?? ''} />
}
