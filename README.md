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
