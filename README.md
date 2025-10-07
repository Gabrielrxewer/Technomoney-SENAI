# Technomoney-SENAI
Protótipo da Technomoney destinada a avaliação do SENAI

## Configuração do `TOTP_ENC_KEY`

O serviço de autenticação exige que a variável de ambiente `TOTP_ENC_KEY` seja
definida com um segredo forte para criptografar os segredos de TOTP. Utilize uma
string com pelo menos 32 caracteres misturando letras maiúsculas, minúsculas,
números e símbolos. Um exemplo de configuração pode ser encontrado em
[`technomoney-auth/.env.example`](technomoney-auth/.env.example). Substitua esse
valor por outro gerado especificamente para o seu ambiente antes de ir para
produção.

## `technomoney-auth`

- Cada refresh token passa a representar uma sessão (`sid`) persistida na tabela
  `sessions`. Sempre que o refresh for revogado, a sessão é marcada como
  revogada e tokens de acesso associados passam a ser considerados inativos na
  introspecção.
- Tokens de acesso assinados com DPoP agora carregam `cnf.jkt` no resultado da
  introspecção. Somente objetos simples com `jkt` em formato de string são
  expostos para evitar poluição do contrato.
- Configure os novos segredos de introspecção:
  - `INTROSPECTION_CLIENTS`: lista separada por vírgula no formato
    `clientId:clientSecret`. Utilize senhas fortes por cliente que precise
    consultar o endpoint `/oauth2/introspect`.
  - `INTROSPECTION_MTLS_ALLOWED_CNS`: lista (opcional) de valores `CN` aceitos
    para certificados cliente quando a introspecção for protegida por mTLS.
- Sempre rotacione as credenciais de introspecção ao expor o serviço para outros
  consumidores internos.
- Ativamos anti-replay nativo para TOTP guardando o último counter por `TOTP_REPLAY_TTL`
  segundos (padrão 300). Logs `mfa.enroll.*`, `mfa.challenge.*`, `ws.connection.*`
  e `auth.refresh.*` incluem `requestId`, identificadores mascarados e são
  retidos por, no mínimo, 180 dias para auditoria.
- Dispositivos confiáveis agora armazenam em Redis os metadados `acr`/`amr`
  obtidos durante o primeiro desafio MFA **e** replicam uma versão sanitizada
  assinada via HMAC no cookie seguro `tdmeta`. Assim, mesmo em ambientes onde o
  Redis estiver indisponível o backend consegue reconstruir `acr=aal2`, fatores
  `amr` deduplicados e os claims `trusted_device*` sem reemitir o TOTP. O segredo
  utilizado para assinar o cookie deriva de `TRUSTED_DEVICE_SECRET` (mínimo 32
  caracteres) ou, na ausência dele, da chave privada ativa do JWT.
- O fluxo `POST /api/auth/refresh` agora reaproveita com segurança os metadados
  do trusted device (quando pertencem ao mesmo usuário) para assinar o novo
  access token com `acr=aal2` e `amr` deduplicados. Tentativas de reutilizar
  cookies de outro usuário são descartadas, garantindo que endpoints AAL2 como
  `/assets` continuem acessíveis após recarregar a página.
- Correção no controlador de login garante que o Express exponha `Request`
  tipado corretamente ao reconstruir sessões de dispositivos confiáveis, evitando
  crashes do `ts-node` e reforçando a reutilização segura do cookie `tdid` para
  manter `acr=aal2`.

## `technomoney-payment-api`

- Todas as chamadas autenticadas agora validam o token de acesso via o endpoint
  `/oauth2/introspect` do autenticador. Tokens revogados ou expirados retornam
  `401 Unauthorized`.
- Defina as novas variáveis de ambiente para introspecção segura:
  - `AUTH_INTROSPECTION_URL`: URL completa do endpoint de introspecção.
  - `AUTH_INTROSPECTION_CLIENT_ID` e `AUTH_INTROSPECTION_CLIENT_SECRET`:
    credenciais usadas na autenticação HTTP Basic.
- Garanta que essas credenciais sejam armazenadas com o mesmo rigor dos demais
  segredos da aplicação e rotacione-as periodicamente.

## `technomoney-api`


- As rotas `/assets` agora expõem dados enriquecidos (`fundamentals`, `marketCap`, textos analíticos) e validam a resposta externa com Zod antes de persistir preços/volumes.
- Todas as requisições ao domínio de ativos exigem tokens com `acr=aal2`; em caso de ausência o middleware retorna `WWW-Authenticate: error="insufficient_aal"` para forçar MFA.
- A Fake Market API fornece o novo contrato e deve ser configurada em `MARKET_API_BASE_URL` via HTTPS em produção.
- O middleware de autenticação agora usa somente o fluxo de introspecção via
  `AUTH_INTROSPECTION_URL`, rejeitando sessões inativas imediatamente para
  reduzir superfícies de abuso.
- Quando a introspecção retornar `cnf.jkt`, o middleware passa a exigir o
  cabeçalho DPoP para cada requisição e verifica a prova contra o hash do token,
  bloqueando tentativas sem comprovação criptográfica.
- Configure as variáveis de ambiente antes de subir o serviço:
  - `AUTH_JWKS_URL`, `AUTH_ISSUER` e `AUTH_AUDIENCE`: defina o endpoint HTTPS
    do JWKS público e os metadados de emissor/audiência esperados para os
    tokens. Nunca aponte para origens sem TLS.
  - `AUTH_CLOCK_TOLERANCE`, `AUTH_ACCEPTED_ALGORITHMS` e `AUTH_STATIC_JWKS`
    (opcionais): ajuste a tolerância de relógio em segundos, a lista de
    algoritmos permitidos e, se necessário, um JWKS estático armazenado com o
    mesmo rigor de outros segredos e rotacionado com frequência.
  - `AUTH_INTROSPECTION_URL`: endereço HTTPS do endpoint `/oauth2/introspect`.
  - `AUTH_INTROSPECTION_CLIENT_ID` e `AUTH_INTROSPECTION_CLIENT_SECRET`:
    credenciais usadas na chamada autenticada.
- Limite o acesso a essas credenciais apenas para serviços autorizados e
  monitore logs de introspecção para detectar tentativas suspeitas.

## `technomoney-ia`

- Serviço dedicado aos agentes de IA com arquitetura MVC em TypeScript, protegido
  por introspecção OAuth2. O middleware rejeita tokens sem `acr=aal2`, aplicando
  rate limiting (`express-rate-limit`), Helmet e CORS configurável para reduzir
  superfícies de ataque.
- A rota `POST /api/ia/v1/analysis` valida payloads com Zod antes de delegar ao
  `AiAgentService`, que calcula tendência (Comprar/Manter/Vender) com base em
  fundamentos (score, ROE, margem, EV/EBIT), análise textual e notícias.
- O serviço retorna justificativas (`insights`) e o score ajustado, permitindo
  auditoria da recomendação. Use `AGENT_BUY_THRESHOLD` > `AGENT_HOLD_THRESHOLD`
  para controlar a sensibilidade do modelo e monitore logs `ia.auth.denied` para
  detectar tokens inválidos ou tentativas de abuso.

## `technomoney-app`

- O dashboard e a carteira deixam de usar mocks e consomem `GET /assets` e
  `GET /assets/:tag` da API principal, reutilizando o cache seguro do React
  Query e respeitando o fluxo de refresh de tokens com AAL2.
- Toda requisição passa pelo `fetchApiWithAuth`, que injeta o Bearer atual e
  executa um único refresh em caso de `401`, mantendo o rigor de segurança do
  backend.
- O cartão de "Tendência" envia os dados completos do ativo para o serviço
  `technomoney-ia`, recebendo análise heurística autenticada e exibindo status
  de carregamento/erro sem expor detalhes sensíveis.
- Configure `VITE_API_URL`, `VITE_AUTH_API_URL`, `VITE_RECAPTCHA_SITEKEY` e os
  parâmetros de CSRF (`VITE_CSRF_*`) antes de executar, além do novo
  `VITE_AI_AGENT_URL`. O front exige HTTPS e `withCredentials=true` para operar
  com o autenticador e o serviço de IA.
- O cliente HTTP valida se todas as variáveis `VITE_*` de URL estão definidas
  (`VITE_API_URL`, `VITE_AUTH_API_URL`, `VITE_PAYMENTS_API_URL` e
  `VITE_AI_AGENT_URL`). Caso alguma falte, a inicialização falha explicitamente,
  evitando que o navegador tente chamar origens indefinidas e exponha dados
  sensíveis.
- Em caso de falhas na API de mercado, a interface apresenta mensagens de erro
  com ação de retry sem expor detalhes sensíveis ao usuário final.
