# Design — Onboarding por Token de Uso Único

**Data:** 2026-06-18  
**Status:** Aprovado

---

## Problema

Novos salões precisam de uma forma segura de criar sua conta sem intervenção manual do administrador. Um link com token de uso único é gerado previamente (inserido direto na tabela `convites`) e enviado à dona do salão. Ao acessar o link ela preenche seus dados e já entra no sistema.

---

## Arquitetura

### Peças

| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `app/onboarding/page.tsx` | Server Component | Lê `?token` dos searchParams, passa para o client |
| `app/onboarding/formulario.tsx` | Client Component | Valida token, exibe estados, chama API |
| `app/api/onboarding/route.ts` | API Route (POST) | Cria Auth user, insere salao_config, marca convite como usado |

---

## Fluxo de dados

```
Usuário acessa /onboarding?token=TOKEN
  → formulario.tsx busca convite na tabela convites (anon key, client-side)
  → token inválido ou usado=true → estado "invalido"
  → token válido → estado "formulario"
  → usuário preenche: nome do profissional, e-mail, senha, confirmar senha
  → usuário marca checkbox de aceite dos termos
  → submit → POST /api/onboarding { token, nomeSalao, email, senha }
      → API re-valida token (previne race condition)
      → supabase.auth.signUp(email, senha)
      → INSERT salao_config (user_id, nome_salao, cor_primaria='#ec4899')
      → UPDATE convites SET usado=true WHERE token=$1
      → retorna { access_token, refresh_token }
  → client: supabase.auth.setSession() + cookie sb-logged-in=1
  → router.replace('/')
```

---

## Estados da tela

| Estado | Trigger | UI |
|--------|---------|-----|
| `verificando` | montagem do componente | Spinner/skeleton centralizado |
| `invalido` | token não existe ou `usado=true` | Card de erro ❌ "Este link é inválido ou já foi utilizado" |
| `formulario` | token válido | Formulário completo |
| `salvando` | submit em andamento | Botão desabilitado "Criando conta…" |

---

## Formulário

Campos obrigatórios:
- **Nome do profissional** — texto livre, usado como `nome_salao` em `salao_config`
- **E-mail** — email, usado para criar Auth user
- **Senha** — password, mínimo 6 caracteres
- **Confirmar senha** — deve coincidir com senha

Checkbox obrigatório (acima do botão):
- "Li e aceito os **Termos de Uso** e a **Política de Privacidade**"
- "Termos de Uso" e "Política de Privacidade" são links clicáveis que abrem modal
- Modal exibe placeholder: "Em breve — os termos completos estarão disponíveis aqui"
- Sem marcar o checkbox o botão "Criar minha conta" fica desabilitado

---

## Visual

- Layout: fundo `from-white to-[#fdf2f8]` (mesmo de `(auth)/layout.tsx`)
- Card: `rounded-2xl bg-white px-6 py-8 shadow-lg`
- Inputs: `h-12 rounded-xl border` com `focus:ring-2 focus:ring-pink-500`
- Botão principal: `bg-pink-500 text-white h-12 rounded-xl`
- Emoji 😊 + título "Criar sua conta" no topo
- Mobile-first, `max-w-sm` centralizado

---

## Segurança

- Token validado client-side (UX) **e** server-side (integridade)
- Erros internos do Supabase nunca expostos — mensagens genéricas ao usuário
- Senha mínimo 6 caracteres validada no client antes do submit
- `convites.usado = true` marca o token como consumido imediatamente após uso
- Nenhuma chave `service_role` no frontend — só `anon key`

---

## Fora de escopo

- Geração/envio de tokens (feito manualmente no banco por enquanto)
- Edição de dados do salão após criação (coberto por configurações existentes)
- Termos completos de uso/privacidade (placeholder por ora)
