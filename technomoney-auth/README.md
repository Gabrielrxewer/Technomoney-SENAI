# Technomoney Auth Service

Serviço responsável por autenticação, emissão de tokens e suporte a fluxos OIDC.

## Variáveis de ambiente relevantes

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `TOTP_ENC_KEY` | Sim | Chave forte (>= 32 caracteres) para criptografar segredos TOTP. |
| `TOTP_REPLAY_TTL` | Não | TTL (60–3600s, padrão 300) para reter o último counter TOTP e bloquear replays na mesma janela. |
| `INTROSPECTION_CLIENTS` | Sim | Lista separada por vírgula no formato `clientId:clientSecret` autorizada a consultar `/oauth2/introspect`. |
| `INTROSPECTION_MTLS_ALLOWED_CNS` | Não | Lista opcional de valores `CN` aceitos para clientes autenticados via mTLS. |
| `DB_USERNAME` | Sim | Usuário dedicado do banco de dados. Garanta privilégios mínimos para reduzir impacto em caso de comprometimento. |
| `DB_PASSWORD` | Sim | Senha forte do banco de dados, armazenada em cofre seguro. |
| `DB_DATABASE` | Sim | Nome do banco utilizado pelo serviço de autenticação. |
| `DB_HOST` | Sim | Host do servidor de banco de dados acessível somente pela rede interna confiável. |
| `DB_PORT` | Sim | Porta do banco (ex.: `5432` para PostgreSQL). |
| `DB_DRIVER` | Sim | Dialeto suportado pelo Sequelize (ex.: `postgres`). |
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Não | Quando definido como `true`, `1`, `yes` ou `on` (case-insensitive), bloqueia login até que o usuário confirme o e-mail recebido via link único. |
| `RESET_TOKEN_TTL` | Não | TTL em segundos (máx. 3600) do token de redefinição de senha emitido via `/recover`. |
| `EMAIL_VERIFICATION_TOKEN_TTL` | Não | TTL em segundos (máx. 3600) do token de verificação enviado por `/verify-email`. |
| `PASSWORD_RESET_URL` | Sim | URL base da aplicação cliente que receberá o token de redefinição (`?token=<id>.<segredo>`). |
| `EMAIL_VERIFICATION_URL` | Sim | URL base usada no e-mail de confirmação (`?token=<id>.<segredo>`). |

> Gere segredos exclusivos por cliente e mantenha-os em um cofre seguro. Tokens
> de acesso só são considerados ativos se a sessão (`sid`) correspondente estiver
> marcada como não revogada na tabela `sessions`.

## Migrações do banco de dados

1. Configure as variáveis de ambiente acima (idealmente via `prod.env` ou um gerenciador seguro de segredos).
2. Certifique-se de que o arquivo `.sequelizerc` aponte para `src/config/config.js`, que expõe as credenciais TypeScript para o `sequelize-cli` com suporte a `ts-node`.
3. Execute `npx sequelize-cli db:migrate` para aplicar as migrações existentes, incluindo a criação da tabela `sessions`, antes de liberar o login em produção.

> Restrinja o acesso a esse comando a pipelines autenticadas e monitore a execução para evitar execuções indevidas que possam alterar o esquema sem autorização.

## Boas práticas de segurança

* Rejeitamos clientes não autenticados na introspecção com respostas sanitizadas e status HTTP adequado, evitando vazamento de detalhes de implementação e reduzindo vetores de enumeração.
* Tokens de recuperação e verificação são de uso único, armazenados apenas como hash Argon2 e expiram em menos de uma hora, reduzindo o impacto de vazamentos de banco.
* O rate-limit dedicado (`/recover`, `/verify-email`) impede abuso automatizado e combina-se com proteção CSRF em todas as rotas sensíveis.
* Validamos códigos TOTP apenas uma vez por janela de 30s e guardamos o último counter por até `TOTP_REPLAY_TTL` segundos, mitigando reutilização maliciosa mesmo em cenários de desvio do front-end.

## Monitoramento e retenção de logs

* Eventos `mfa.enroll.*`, `mfa.challenge.*`, `ws.connection.*` e `auth.refresh.*` são enviados ao pipeline central de observabilidade com retenção mínima de 180 dias. Eles incluem `requestId`, `userId` mascarado e, quando aplicável, identificadores de sessão.
* O serviço rejeita códigos TOTP repetidos dentro da janela de tolerância e registra falhas com nível `warn`/`error` para alimentar dashboards de tentativa de fraude. Ajuste `TOTP_REPLAY_TTL` para alinhar com a retenção de tickets no Redis (valor padrão cobre três ciclos de 30s com folga).
* Eventos de reuse de refresh token (`auth.refresh.reuse_detected`) são logados como erro e também enviados ao canal de auditoria (`channel: audit`), permitindo alertas e trilhas de investigação independentes do log aplicativo.

## Fluxos de recuperação de credenciais e verificação de e-mail

1. **Solicitação de redefinição** (`POST /recover`): exige CSRF token válido e aplica rate-limit específico. O serviço persiste token único (`UUID` + hash Argon2) na tabela `password_resets` e envia e-mail com `PASSWORD_RESET_URL?token=<id>.<segredo>`.
2. **Confirmação de redefinição** (`POST /recover/confirm`): requer senha forte (política aplicada) e valida hash, expiração e uso único antes de atualizar a senha, revogando todas as sessões/tokens ativos.
3. **Solicitação de verificação** (`POST /verify-email`): disponível para reenviar links sem indicar se o e-mail existe, mitigando enumeração. Tokens são registrados na tabela `email_verifications`.
4. **Confirmação de e-mail** (`POST /verify-email/confirm`): após validar o token, a flag `email_verified` é ativada. Quando `AUTH_REQUIRE_VERIFIED_EMAIL=true`, o login permanece bloqueado até essa confirmação.

> Garanta que os links sejam entregues via canal TLS confiável e revogue tokens antigos sempre que suspeitar de comprometimento. As variáveis de TTL permitem ajustar a janela de exposição mantendo o limite inferior a 1 hora conforme ASVS V2.2.3.
