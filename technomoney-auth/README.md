Protótipo da Technomoney destinada a avaliação do SENAI.

## Visão geral do autenticador back-end

O serviço `technomoney-auth` concentra toda a autenticação da plataforma. Ele
expõe uma API REST principal (`/api/auth`), fluxos de MFA TOTP (`/api/totp`),
endpoints OIDC/OAuth 2.0 (`/oauth2/*`, `/.well-known/*`) e um canal WebSocket
para notificar eventos de sessão. O processo roda em Node.js/Express com
proteções de segurança defensivas habilitadas por padrão (Helmet, CORS
restritivo, cookies seguros e forçamento de HTTPS).

### Componentes principais

- **Gateway HTTP seguro**: aplica `helmet`, força HTTPS, gera `requestId`
  correlacionável e protege JSON com tamanho máximo de 1 MB.
- **Proteções antiabuso**: todos os POST críticos passam por CSRF token, limites
  de taxa via Redis (`express-rate-limit` e `rate-limiter-flexible`) e, quando
  aplicável, verificação reCAPTCHA v3.
- **Serviço de autenticação**: registra usuários, valida credenciais com
  `bcrypt`, gera hashes Argon2 para resets/confirmações e emite tokens com chaves
  assimétricas gerenciadas pelo `keys.service`.
- **Sessões persistentes**: cada refresh token origina um `sid` hash de SHA-256
  persistido. Além do hash, armazenamos o nível de autenticação (`aal`) vigente,
  permitindo que renovações mantenham acessos de `aal2` após MFA. A introspecção
  e o WebSocket usam esse identificador para saber se a sessão continua ativa.
- **MFA TOTP com antifraude**: segredos TOTP são criptografados com AES-256-GCM
  usando `TOTP_ENC_KEY`; códigos são válidos uma vez por janela e o último
  contador fica retido por `TOTP_REPLAY_TTL` segundos para mitigar replay.
- **Trusted devices + Step-up**: dispositivos confiáveis ficam guardados em
  Redis; logins fora da lista exigem step-up MFA (enrolamento ou desafio TOTP)
  com emissão de token temporário.
- **OIDC completo**: suporte a PAR + PKCE (code flow), ID Token assinado com as
  mesmas chaves do acesso, opção de exigir DPoP (`REQUIRE_DPOP=true`) e
  introspecção protegida por Basic ou mTLS (`INTROSPECTION_CLIENTS`,
  `INTROSPECTION_MTLS_ALLOWED_CNS`).
- **Canal em tempo real**: `/api/auth/ws-ticket` gera tickets efêmeros que
  validam a conexão WebSocket. Eventos importantes incluem `token.expiring_soon`,
  `jwks.rotated` e `stepup.required`.

### Fluxos críticos

#### Registro seguro
1. `POST /api/auth/register` executa rate limit por IP + e-mail, valida força de
   senha e reCAPTCHA dedicado.
2. Credenciais são salvas com hash Argon2, `username` é checado para unicidade e
   a sessão inicial é criada via `SessionService`.
3. O cookie `refreshToken` recebe `httpOnly`, `sameSite=strict` e `secure=true`.

#### Login com step-up
1. `POST /api/auth/login` valida credenciais e aplica limites por IP/e-mail.
2. Se não houver trusted device, o serviço consulta o status TOTP:
   - Usuário sem MFA: resposta `401` com `stepUp="enroll_totp"` e token
     temporário emitido por `AuthService.issueStepUpToken`.
   - Usuário com MFA: resposta `401` com `stepUp="totp"` exigindo desafio.
3. Trusted device válido → `AuthService.createSession` gera novo par
   access/refresh; `scheduleTokenExpiringSoon` agenda aviso no WebSocket.

#### Renovação e revogação
- `POST /api/auth/refresh` valida token de atualização, verifica se o `sid`
  continua ativo e retorna tokens novos preservando o `acr/aal` mais alto já
  conquistado pela sessão (ex.: após step-up TOTP). Tentativas de reuse geram log
  de auditoria `auth.refresh.reuse_detected` e revogam a sessão.
- `POST /api/auth/logout` e `AuthService.resetPassword` revogam todos os refresh
  tokens ativos do usuário.

#### Recuperação e verificação de e-mail
- `/api/auth/recover` e `/api/auth/verify-email` usam rate limit dedicado, tokens
  de uso único (hash Argon2) e links construídos com
  `PASSWORD_RESET_URL`/`EMAIL_VERIFICATION_URL`.
- Tokens expiram conforme `RESET_TOKEN_TTL` e `EMAIL_VERIFICATION_TOKEN_TTL`
  (limitados a 3600 s), atendendo ASVS V2.

#### Fluxos OAuth 2.0 / OIDC
- `POST /oauth2/par` aceita somente `code` com PKCE S256, guarda o pedido por
  5 min e retorna `request_uri` quando o cliente exige PAR.
- `GET /oauth2/authorize` valida `request_uri`/PKCE, gera `code` efêmero ligado
  ao usuário autenticado e marca `nonce` quando enviado.
- `POST /oauth2/token` troca o código por tokens:
  - Access token: assinado pelo `JwtService`, carrega `sid`, `acr`, `amr`,
    `username`, `email` e, quando `REQUIRE_DPOP=true`, `cnf.jkt`.
  - ID token: emitido por `signIdToken`, replicando `nonce`.
- `POST /oauth2/introspect` restringe clientes a `INTROSPECTION_CLIENTS` ou
  certificados válidos; respostas omitem detalhes quando inválido (`invalid_client`).

### Controles de segurança adicionais

- CSP rígido com nonce aleatório por resposta (`secureHeaders`).
- Cookies CSRF somente leitura, com `secure` automático em produção.
- Redis obrigatório em produção (`ensureRedis`), com política de reconexão
  configurável via `REDIS_*`.
- Logs estruturados Pino (`LOG_LEVEL`) com remoção de campos sensíveis; corrige
  níveis de sucesso via `HTTP_SUCCESS_LOG_LEVEL`.
- Sanitização de erros: somente mensagens mínimas são expostas; detalhes ficam
  nos logs quando `AUTH_VERBOSE_ERRORS` está desabilitado.
- Auditoria prolongada (`mfa.*`, `auth.refresh.*`, `ws.connection.*`) garantindo
  retenção mínima de 180 dias.

### Observabilidade e monitoramento

- Cada requisição ganha `requestId` e IP/UA nos logs.
- Eventos WebSocket permitem alertar expiração de tokens e rotação de chaves JWKS.
- Falhas de reCAPTCHA, tentativas de MFA inválidas e bloqueios de rate limit são
  registrados com severidade adequada (`warn`/`error`).

### Variáveis de ambiente essenciais (`technomoney-auth/prod.env`)

| Variável | Obrigatória | Finalidade |
| --- | --- | --- |
| `PORT` | Sim | Porta HTTP do serviço (default 4000).
| `NODE_ENV` | Sim | Defina `production` em produção para reforçar cookies, HTTPS e validações.
| `TOTP_ENC_KEY` | Sim | Chave forte (≥32 chars misturando classes) usada para AES-256-GCM dos segredos TOTP.
| `REDIS_URL` | Sim em produção | Redis utilizado por rate limits, trusted devices e antifraude TOTP.
| `JWT_KEYS_DIR`/`JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` | Sim | Fonte das chaves que assinam/verificam tokens. Sempre proteja o PEM privado.
| `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Sim | Metadados e TTL dos tokens emitidos.
| `INTROSPECTION_CLIENTS` | Sim | Lista `clientId:clientSecret` autorizada a consultar `/oauth2/introspect`.
| `INTROSPECTION_MTLS_ALLOWED_CNS` | Opcional | CNs aceitos quando introspecção usa mTLS.
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Opcional | Bloqueia login até que o e-mail seja confirmado.
| `PASSWORD_RESET_URL`, `EMAIL_VERIFICATION_URL` | Sim | URLs HTTPS da aplicação cliente que recebem tokens de recuperação/confirmação.
| `RECAPTCHA_SECRET`, `RECAPTCHA_MIN_SCORE`, `RECAPTCHA_HOSTNAME` | Sim em produção | Configuração do reCAPTCHA v3.
| `ALLOWED_ORIGINS`/`FE_URL` | Sim | Lista de origens confiáveis para CORS e CSRF.
| `DB_*` | Sim | Credenciais do banco (princípio do menor privilégio, TLS obrigatório).
| `OIDC_CLIENTS`, `REQUIRE_PAR`, `REQUIRE_DPOP` | Conforme necessidade | Controlam clientes OIDC, exigência de PAR e DPoP.

Consulte o arquivo [`technomoney-auth/prod.env`](technomoney-auth/prod.env) para a
lista completa e recomendações de segurança comentadas.

### Documentação complementar

- Documento detalhado em PDF: [`docs/authentication-backend.pdf`](docs/authentication-backend.pdf)
- Fluxograma do fluxo completo (Mermaid): [`docs/authentication-flowchart.mmd`](docs/authentication-flowchart.mmd)

## Integração com serviços consumidores

- **`technomoney-payment-api`**: valida tokens via `/oauth2/introspect`. Tokens
  revogados ou expirados retornam `401 Unauthorized`. Configure `AUTH_INTROSPECTION_URL`,
  `AUTH_INTROSPECTION_CLIENT_ID` e `AUTH_INTROSPECTION_CLIENT_SECRET` com segredos
  fortes e rotacione-os periodicamente.
- **`technomoney-api`**: middleware usa apenas introspecção (`AUTH_INTROSPECTION_URL`).
  Quando `cnf.jkt` vem presente, exige cabeçalho DPoP alinhado ao hash do token e
  rejeita requisições sem prova criptográfica. Configure `AUTH_JWKS_URL`,
  `AUTH_ISSUER`, `AUTH_AUDIENCE`, além das credenciais de introspecção.

## Configuração do `TOTP_ENC_KEY`

O serviço de autenticação exige que a variável de ambiente `TOTP_ENC_KEY` seja
definida com um segredo forte para criptografar os segredos de TOTP. Utilize uma
string com pelo menos 32 caracteres misturando letras maiúsculas, minúsculas,
números e símbolos. Um exemplo de configuração pode ser encontrado em
[`technomoney-auth/.env.example`](technomoney-auth/.env.example). Substitua esse
valor por outro gerado especificamente para o seu ambiente antes de ir para
produção.
