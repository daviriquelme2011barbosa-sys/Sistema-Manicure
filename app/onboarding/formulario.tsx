'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { CampoSenha } from '@/components/CampoSenha'
import { CampoWhatsApp } from '@/components/CampoWhatsApp'
import { DDI_BRASIL, normalizarWhatsAppCompleto, validarNumeroWhatsApp } from '@/lib/whatsapp'
import { IconeCheck } from '@/components/icons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
)

type Estado = 'verificando' | 'invalido' | 'formulario' | 'salvando' | 'confirmado'
type ModalAberto = 'termos' | 'privacidade' | null

const REGEX_CARACTERE_ESPECIAL = /[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/

function senhaTemOitoCaracteres(senha: string): boolean {
  return senha.length >= 8
}

function senhaTemCaractereEspecial(senha: string): boolean {
  return REGEX_CARACTERE_ESPECIAL.test(senha)
}

function senhaValida(senha: string): boolean {
  return senhaTemOitoCaracteres(senha) && senhaTemCaractereEspecial(senha)
}

interface Props {
  token: string
}

export default function FormularioOnboarding({ token }: Props) {
  const router = useRouter()

  const [estado, setEstado] = useState<Estado>('verificando')
  const [modalAberto, setModalAberto] = useState<ModalAberto>(null)

  const [nomeSalao, setNomeSalao] = useState('')
  const [ddi, setDdi] = useState(DDI_BRASIL)
  const [numero, setNumero] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [termosAceitos, setTermosAceitos] = useState(false)

  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => {
    if (!token) {
      setEstado('invalido')
      return
    }

    supabase
      .from('convites')
      .select('id, usado')
      .eq('token', token)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data || data.usado) {
          setEstado('invalido')
        } else {
          setEstado('formulario')
        }
      })
  }, [token])

  function validar(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!nomeSalao.trim()) e.nomeSalao = 'Informe seu nome'
    const validacaoWhatsApp = validarNumeroWhatsApp(ddi, numero)
    if (!validacaoWhatsApp.valido) e.whatsapp = validacaoWhatsApp.erro ?? 'Informe seu WhatsApp'
    if (!email.trim()) e.email = 'Informe o e-mail'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'E-mail inválido'
    if (!senha) e.senha = 'Crie uma senha'
    else if (!senhaValida(senha)) {
      e.senha = 'A senha deve ter pelo menos 8 caracteres e 1 caractere especial'
    }
    if (senha !== confirmarSenha) e.confirmarSenha = 'As senhas não coincidem'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroGeral('')

    const novosErros = validar()
    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return
    if (!termosAceitos) return

    setEstado('salvando')

    try {
      const resposta = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nomeSalao, whatsapp: normalizarWhatsAppCompleto(ddi, numero), email, senha }),
      })

      const dados = await resposta.json()

      if (resposta.status === 202) {
        setEstado('confirmado')
        return
      }

      if (!resposta.ok) {
        setErroGeral(dados.erro ?? 'Erro ao criar conta. Tente novamente.')
        setEstado('formulario')
        return
      }

      await supabase.auth.setSession(dados.sessao)
      document.cookie = 'sb-logged-in=1; path=/; SameSite=Lax; Max-Age=604800'
      router.replace('/')
    } catch {
      setErroGeral('Sem conexão. Verifique a internet e tente novamente.')
      setEstado('formulario')
    }
  }

  // ── verificando ───────────────────────────────────────────────────
  if (estado === 'verificando') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#F3F0FF] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-500">Verificando seu convite…</p>
        </div>
      </div>
    )
  }

  // ── inválido ──────────────────────────────────────────────────────
  if (estado === 'invalido') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#F3F0FF] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-5xl">❌</p>
            <h1 className="text-xl font-bold text-zinc-900">Link inválido</h1>
          </div>
          <div className="rounded-2xl bg-white px-6 py-8 shadow-lg text-center">
            <p className="text-sm leading-relaxed text-zinc-600">
              Este link é inválido ou já foi utilizado.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Solicite um novo convite à administração do sistema.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── confirmado ────────────────────────────────────────────────────
  if (estado === 'confirmado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#F3F0FF] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <IconeCheck size={48} className="mx-auto text-emerald-500" />
            <h1 className="mt-3 text-xl font-bold text-zinc-900">Conta criada com sucesso!</h1>
          </div>
          <div className="rounded-2xl bg-white px-6 py-8 shadow-lg text-center">
            <p className="text-sm leading-relaxed text-zinc-600">
              Enviamos um e-mail de confirmação para{' '}
              <span className="font-medium text-zinc-900">{email}</span>.
              Acesse seu e-mail e clique no link para ativar sua conta e fazer o primeiro acesso.
            </p>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="mt-6 h-12 w-full rounded-xl bg-primary font-semibold text-white transition hover:bg-primary-hover active:bg-primary-pressed"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── formulário + salvando ─────────────────────────────────────────
  const salvando = estado === 'salvando'

  return (
    <>
      {modalAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modalAberto === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
          className="animar-overlay fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/40 px-0 sm:justify-center sm:px-4"
          onClick={() => setModalAberto(null)}
        >
          <div
            className="animar-sheet flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[85vh] sm:max-w-sm sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 mt-3 h-1 w-10 flex-shrink-0 rounded-full bg-zinc-200 sm:hidden" />

            <div className="flex flex-shrink-0 items-center justify-between px-6 pb-3 pt-2">
              <h2 className="text-base font-semibold text-zinc-900">
                {modalAberto === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
              </h2>
              <button
                type="button"
                onClick={() => setModalAberto(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {modalAberto === 'termos' ? (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-400">Última atualização: 19/06/2026</p>
                  <SecaoOnboarding titulo="1. Aceitação dos Termos">
                    Ao acessar e utilizar a plataforma Facilitaai, o usuário declara ter lido,
                    compreendido e concordado com os presentes Termos de Uso. Caso não concorde
                    com alguma condição, o uso da plataforma deve ser interrompido.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="2. Sobre a Plataforma">
                    A Facilitaai é uma plataforma de gestão e reativação de clientes destinada a
                    profissionais autônomos e pequenos negócios. Permite o cadastro de clientes,
                    registro de atendimentos, controle de histórico e envio de mensagens de
                    reativação via WhatsApp.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="3. Cadastro e Acesso">
                    O acesso à plataforma é concedido pelo responsável da Facilitaai após
                    contratação do serviço. O usuário é responsável por manter suas credenciais de
                    acesso em sigilo e por todas as ações realizadas em sua conta.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="4. Planos e Pagamentos">
                    A contratação inclui uma taxa de implantação e uma mensalidade conforme o plano
                    escolhido. O pagamento é realizado via Pix ou cartão. A mensalidade é cobrada
                    mensalmente a partir do segundo mês de uso. O usuário tem 7 dias corridos após
                    a entrega para solicitar reembolso integral da taxa de implantação, sem
                    necessidade de justificativa.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="5. Cancelamento">
                    O usuário pode cancelar o serviço a qualquer momento mediante aviso prévio de
                    30 dias. Após o cancelamento, os dados permanecem disponíveis por 30 dias e são
                    permanentemente excluídos após esse prazo.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="6. Responsabilidades do Usuário">
                    O usuário se compromete a: utilizar a plataforma apenas para fins legais, não
                    compartilhar o acesso com terceiros não autorizados, manter os dados de suas
                    clientes atualizados e corretos, obter consentimento de suas clientes para
                    coleta e uso dos dados conforme a LGPD.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="7. Responsabilidades da Facilitaai">
                    A Facilitaai se compromete a: manter a plataforma disponível e funcional,
                    proteger os dados dos usuários conforme a Política de Privacidade, oferecer
                    suporte conforme o plano contratado, notificar o usuário sobre mudanças
                    relevantes na plataforma.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="8. Limitação de Responsabilidade">
                    A Facilitaai não se responsabiliza por: resultados de negócio decorrentes do
                    uso da plataforma, falhas de conexão ou indisponibilidade do WhatsApp, uso
                    indevido das credenciais de acesso pelo próprio usuário.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="9. Propriedade Intelectual">
                    Todo o conteúdo da plataforma, incluindo código, design e funcionalidades, é
                    de propriedade exclusiva da Facilitaai. É proibida a reprodução, cópia ou
                    distribuição sem autorização prévia.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="10. Contato">
                    📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
                  </SecaoOnboarding>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-zinc-400">Última atualização: 19/06/2026</p>
                  <SecaoOnboarding titulo="Seção I — Informações Gerais">
                    Esta Política de Privacidade descreve como os dados pessoais dos usuários são
                    coletados, utilizados e protegidos na plataforma Facilitaai. Elaborada em
                    conformidade com a LGPD (Lei nº 13.709/2018) e o Marco Civil da Internet (Lei
                    nº 12.965/2014). Responsável: Davi Riquelme —
                    📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="Seção II — Dados Coletados">
                    Nome completo, endereço de e-mail, número de WhatsApp, data de nascimento,
                    foto de perfil (opcional), dados de navegação (IP, navegador, dispositivo).
                    Coletados no cadastro ou no formulário público do profissional responsável pela
                    conta.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="Seção III — Finalidade do Tratamento">
                    Dados utilizados exclusivamente para: identificação e cadastro de clientes,
                    gestão de histórico de atendimentos, comunicação via WhatsApp e melhoria da
                    plataforma. Os dados não são vendidos, compartilhados ou repassados a
                    terceiros.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="Seção IV — Armazenamento e Segurança">
                    Dados armazenados com criptografia e controle de acesso por autenticação.
                    Apenas o profissional responsável pela conta tem acesso aos dados de suas
                    clientes. Em caso de cancelamento, dados mantidos por 30 dias e depois
                    permanentemente excluídos.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="Seção V — Direitos do Usuário">
                    Confirmar existência de tratamento, acessar dados, solicitar correção ou
                    exclusão, revogar consentimento. Contato:
                    📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="Seção VI — Cookies">
                    A plataforma utiliza cookies para manter a sessão autenticada. O usuário pode
                    desativá-los no navegador, porém isso pode impedir o funcionamento do login.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="Seção VII — Alterações">
                    Alterações serão comunicadas pela aba Novidades dentro da plataforma.
                  </SecaoOnboarding>
                  <SecaoOnboarding titulo="Seção VIII — Contato">
                    📧 davi.riquelme2011barbosa@gmail.com | 📱 +55(12)99227-0163
                  </SecaoOnboarding>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-zinc-100 px-6 pb-6 pt-4">
              <button
                type="button"
                onClick={() => setModalAberto(null)}
                className="h-11 w-full rounded-xl bg-primary font-semibold text-white transition hover:bg-primary-hover"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#F3F0FF] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-5xl">😊</p>
            <h1 className="text-xl font-bold text-zinc-900">Criar sua conta</h1>
            <p className="mt-1 text-sm text-zinc-500">Preencha os dados para acessar o sistema</p>
          </div>

          <div className="rounded-2xl bg-white px-6 py-8 shadow-lg">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              <div className="flex flex-col gap-1">
                <label htmlFor="nomeSalao" className="text-sm font-medium text-zinc-700">
                  Nome do profissional
                </label>
                <input
                  id="nomeSalao"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  value={nomeSalao}
                  onChange={(e) => setNomeSalao(e.target.value)}
                  disabled={salvando}
                  placeholder="Seu nome"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-primary/40 disabled:bg-zinc-100 ${
                    erros.nomeSalao ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.nomeSalao && (
                  <span role="alert" className="text-sm text-red-600">{erros.nomeSalao}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="whatsapp" className="text-sm font-medium text-zinc-700">
                  WhatsApp
                </label>
                <CampoWhatsApp
                  id="whatsapp"
                  variante="publico"
                  ddi={ddi}
                  numero={numero}
                  onChange={(novoDdi, novoNumero) => {
                    setDdi(novoDdi)
                    setNumero(novoNumero)
                  }}
                  disabled={salvando}
                  erro={!!erros.whatsapp}
                />
                {erros.whatsapp && (
                  <span role="alert" className="text-sm text-red-600">{erros.whatsapp}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={salvando}
                  placeholder="seu@email.com"
                  className={`h-12 rounded-xl border px-4 text-base text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none transition focus:ring-2 focus:ring-primary/40 disabled:bg-zinc-100 ${
                    erros.email ? 'border-red-500 focus:ring-red-400' : 'border-zinc-300'
                  }`}
                />
                {erros.email && (
                  <span role="alert" className="text-sm text-red-600">{erros.email}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="senha" className="text-sm font-medium text-zinc-700">
                  Senha
                </label>
                <CampoSenha
                  id="senha"
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={salvando}
                  placeholder="Mínimo 8 caracteres"
                  erro={!!erros.senha}
                />
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className={senhaTemOitoCaracteres(senha) ? 'text-green-600' : 'text-zinc-400'}>
                    ✓ 8 caracteres
                  </span>
                  <span className={senhaTemCaractereEspecial(senha) ? 'text-green-600' : 'text-zinc-400'}>
                    ✓ 1 caractere especial
                  </span>
                </div>
                {erros.senha && (
                  <span role="alert" className="text-sm text-red-600">{erros.senha}</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="confirmarSenha" className="text-sm font-medium text-zinc-700">
                  Confirmar senha
                </label>
                <CampoSenha
                  id="confirmarSenha"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  disabled={salvando}
                  placeholder="Repita a senha"
                  erro={!!erros.confirmarSenha}
                />
                {erros.confirmarSenha && (
                  <span role="alert" className="text-sm text-red-600">{erros.confirmarSenha}</span>
                )}
              </div>

              {erroGeral && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroGeral}
                </p>
              )}

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={termosAceitos}
                  onChange={(e) => setTermosAceitos(e.target.checked)}
                  disabled={salvando}
                  className="mt-0.5 h-5 w-5 flex-shrink-0 accent-primary"
                />
                <span className="text-sm text-zinc-600 leading-relaxed">
                  Li e aceito os{' '}
                  <button
                    type="button"
                    onClick={() => setModalAberto('termos')}
                    className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                  >
                    Termos de Uso
                  </button>
                  {' '}e a{' '}
                  <button
                    type="button"
                    onClick={() => setModalAberto('privacidade')}
                    className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                  >
                    Política de Privacidade
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={salvando || !termosAceitos}
                className="mt-1 h-12 rounded-xl bg-primary font-semibold text-white transition hover:bg-primary-hover active:bg-primary-pressed active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando ? 'Criando conta…' : 'Criar minha conta'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </>
  )
}

function SecaoOnboarding({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{titulo}</h3>
      <p className="text-sm leading-relaxed text-zinc-600">{children}</p>
    </div>
  )
}
