# Technomoney Web App

Front-end desenvolvido em React + Vite que consome os serviços da plataforma Technomoney. O aplicativo cobre autenticação OIDC com MFA (AAL2), consumo da API de ativos e jornada de carteira. As requisições usam `axios` com proteção CSRF e renovação automática de tokens de acesso.

## Fluxo de dados
- **Dashboard**: consome `GET /assets` do `technomoney-api` para exibir ranking, heatmap e métricas agregadas. Os dados são cacheados com React Query por 30 segundos para reduzir carga.
- **Carteira**: utiliza `GET /assets` para montar a lista de tickers e `GET /assets/:tag` para detalhes do ativo selecionado. A tela traduz valores numéricos (preço, DY, fundamentos) e reaproveita o mesmo cache do dashboard.
- **Autenticação**: todo request passa pelo `fetchApiWithAuth`, que injeta o token Bearer atual e executa `refresh` em caso de `401`. Tokens inválidos forçam redirecionamento para o login.

## Configuração
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `prod.env` para `.env` e ajuste conforme o ambiente.
3. Inicie em modo desenvolvimento:
   ```bash
   npm run dev
   ```
4. Execute os testes (modo não interativo):
   ```bash
   npm test -- --watchAll=false
   ```

## Variáveis de ambiente
> **Importante:** nunca exponha segredos em repositórios. Armazene-os em cofres/secret managers e injete via pipeline.

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | Sim | Base URL da `technomoney-api` (ex.: `https://api.example.com`). Deve aceitar HTTPS e cookies para CSRF. |
| `VITE_AUTH_API_URL` | Sim | Base URL do autenticador (`technomoney-auth`). Utilizada para `login`, `refresh`, `me` e WebSocket de eventos. |
| `VITE_PAYMENTS_API_URL` | Não | Base URL opcional da API de pagamentos. |
| `VITE_RECAPTCHA_SITEKEY` | Sim | Site key usada nas páginas de login/registro. |
| `VITE_CSRF_COOKIE_NAME` | Não (default `csrf`) | Nome do cookie de CSRF entregue pelo autenticador. |
| `VITE_CSRF_HEADER_NAME` | Não (default `x-csrf-token`) | Header enviado em requisições state-changing. |
| `VITE_CSRF_PATH` | Não (default `/auth/csrf`) | Endpoint que inicializa o cookie de CSRF. |

### Boas práticas de segurança
- Hospede o front-end exclusivamente via HTTPS e com `Strict-Transport-Security` ativo.
- Configure `VITE_API_URL`/`VITE_AUTH_API_URL` apontando para domínios que imponham TLS e certificados válidos.
- Ative `SameSite=strict` nos cookies sensíveis (`csrf`, refresh tokens) e limite `Access-Control-Allow-Origin` aos domínios da aplicação.
- Monitore respostas `401/403` para detectar sessões inválidas e tente `refresh` apenas uma vez para evitar brute force de tokens.

## Execução em produção
1. Gere o build otimizado:
   ```bash
   npm run build
   ```
2. Publique a pasta `dist/` atrás de CDN com HTTPS obrigatório.
3. Garanta que as variáveis acima estejam presentes no ambiente de execução (por exemplo, configurando-as em Docker/CI).

## Integração com o back-end
- O front depende da `technomoney-api` já protegida por introspecção OAuth2 (AAL2). Configure CORS na API para incluir o domínio do front.
- A `technomoney-fake-api` pode ser usada em desenvolvimento apontando `MARKET_API_BASE_URL` do `technomoney-api` para `http://localhost:4001`. Ela fornece os dados esperados pelo dashboard/carteira.
- Rotas críticas (login, MFA, refresh) usam `withCredentials=true`, portanto configure `Access-Control-Allow-Credentials` no back-end e não utilize curingas (`*`) para `origin`.

## Testes
- A suíte usa `react-scripts test`. Execute com `--watchAll=false` em CI para evitar processos interativos.
- Tests importantes:
  - `Dashboard.test.tsx`: garante que o fluxo de `refresh` após `401` recupere dados do mercado.
  - Componentes de login e MFA validam o fluxo de autenticação seguro (WebAuthn + TOTP).

Manter o front alinhado ao contrato do back-end evita divergências e garante que os dados apresentados respeitem as políticas de segurança e conformidade definidas para AAL2.
