# Technomoney-SENAI
Protótipo da Technomoney destinada à avaliação do SENAI, composto por múltiplos
microsserviços Node.js/TypeScript com ênfase em autenticação forte (AAL2),
proteções antifraude e consumo de dados de mercado.

## Visão geral da documentação

Todos os serviços possuem README próprio com fluxos, variáveis de ambiente e
orientações de segurança revisadas. Utilize a tabela abaixo para localizar cada
documento:

| Serviço | Responsabilidade | Documentação |
| --- | --- | --- |
| `technomoney-auth` | Autenticação/OAuth2 + MFA TOTP, sessões e WebSocket | [`technomoney-auth/README.md`](technomoney-auth/README.md) |
| `technomoney-api` | Domínio de ativos, sincronização com mercado e middleware de autorização | [`technomoney-api/README.md`](technomoney-api/README.md) |
| `technomoney-payment-api` | Integração com Mercado Pago, webhooks assinados e validação de tokens | [`technomoney-payment-api/README.md`](technomoney-payment-api/README.md) |
| `technomoney-ia` | Serviço heurístico de análise fundamentalista protegido por introspecção | [`technomoney-ia/README.md`](technomoney-ia/README.md) |
| `technomoney-app` | Front-end React/Vite com MFA, carteira e painel de ativos | [`technomoney-app/README.md`](technomoney-app/README.md) |
| `technomoney-fake-api` | Mock seguro para dados de mercado utilizados em desenvolvimento | [`technomoney-fake-api/README.md`](technomoney-fake-api/README.md) |

Os READMEs foram validados para cobrir:

- fluxos de segurança (CSRF, MFA, rate limiting e introspecção OAuth2);
- listas completas de variáveis de ambiente e boas práticas de armazenamento de
  segredos;
- instruções de execução local (npm scripts) e, quando aplicável, testes
  automatizados;
- contratos de API e restrições de autenticação exigidas pelos consumidores.

## Execução com Docker Compose central

O repositório inclui um `docker-compose.yml` na raiz que sobe Postgres, Redis e
os microsserviços principais (auth, API de domínio, pagamentos e serviço de IA)
em uma única orquestração. Para utilizá-lo:

> **Pré-requisito:** certifique-se de que o Docker Engine está ativo antes de
> rodar qualquer comando (`Docker Desktop` iniciado no Windows/macOS ou `sudo
> systemctl start docker` no Linux). Use `docker info` para validar a conexão
> com o daemon; sem isso o compose não consegue construir nem subir os
> serviços.
1. Copie cada `prod.env` para `.env` dentro de seu respectivo diretório e
   preencha segredos exclusivos para o ambiente (ex.: `technomoney-auth/prod.env`
   → `technomoney-auth/.env`).
2. Garanta que `technomoney-auth/.env` contenha chaves fortes (`TOTP_ENC_KEY`,
   `TRUSTED_DEVICE_SECRET`, credenciais do banco e `REDIS_URL` já apontando
   para `redis://redis:6379/0`).
3. Opcionalmente execute a fake API de mercado separadamente (não faz parte do
   compose) e ajuste `MARKET_API_BASE_URL` para apontar para ela.

### Serviços orquestrados

| Serviço | Porta | Descrição |
| --- | --- | --- |
| `redis` | `6379` | Cache usado pelo autenticador para trusted devices, rate limiting e anti-replay TOTP. |
| `postgres` | `5432` | Banco compartilhado para autenticador, API principal e pagamentos (migrations aplicadas automaticamente). |
| `auth` | `4000` | Autenticador com `INTROSPECTION_CLIENTS` pré-configurados (`core-service`, `payments-service`, `ia-service`). |
| `api` | `4002` | API de ativos apontando para o autenticador via `/oauth2/introspect`. |
| `payments` | `3001` | API de pagamentos com introspecção obrigatória. |
| `ia-agent` | `4010` | Serviço de IA consumindo a introspecção do autenticador. |

> ⚠️ `technomoney-fake-api` e `technomoney-app` não estão inclusos no compose
> atual; suba-os separadamente quando precisar do front-end ou dos dados de
> mercado simulados.

### Comandos úteis

```bash
# Construir imagens e subir tudo em segundo plano
docker compose up --build -d

# Acompanhar logs
docker compose logs -f

# Encerrar e remover containers/volumes efêmeros
docker compose down

# O serviço `auth` aceita um arquivo de entrada customizado via `ENTRY_FILE`
# (variável opcional no `.env`). Quando não definida ele executa `dist/server.js`
# automaticamente.
```

## Configuração do `TOTP_ENC_KEY`

O serviço de autenticação exige que a variável de ambiente `TOTP_ENC_KEY` seja
definida com um segredo forte para criptografar os segredos de TOTP. Utilize uma
string com pelo menos 32 caracteres misturando letras maiúsculas, minúsculas,
números e símbolos. Um exemplo de configuração pode ser encontrado em
[`technomoney-auth/prod.env`](technomoney-auth/prod.env). Substitua esse valor
por outro gerado especificamente para o seu ambiente antes de ir para produção.

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
- O serviço sincroniza automaticamente novos tickers disponibilizados pela fake API, adicionando-os ao banco sem sobrescrever ativos existentes e mantendo o histórico preservado.
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
- O logger HTTP agora respeita os níveis corretos (`info` para 2xx/3xx, `warn`
  para 4xx e `error` apenas quando há falha real), reduzindo ruído operacional e
  melhorando o monitoramento de incidentes de segurança.

## `technomoney-app`

- O dashboard e a carteira deixam de usar mocks e consomem `GET /assets` e
  `GET /assets/:tag` da API principal, reutilizando o cache seguro do React
  Query e respeitando o fluxo de refresh de tokens com AAL2.
- A página `/stock-detail/:tag` consome a mesma API para preencher gráfico histórico, notícias, análise textual e metadados corporativos, eliminando os mocks anteriores do front-end.
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
