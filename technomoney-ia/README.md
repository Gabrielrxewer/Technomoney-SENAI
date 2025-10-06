# Technomoney IA Service

Serviço Node.js responsável por orquestrar os agentes de IA/fundamentalistas da plataforma. Ele recebe os dados completos do ativo, gera uma tendência (Comprar/Manter/Vender) e devolve um texto analítico ajustado. Todas as rotas são protegidas com introspecção OAuth2 no autenticador (`technomoney-auth`) e aplicam rate limiting para mitigar abuso.

## Arquitetura e fluxos
- **MVC enxuto**: controllers validam payloads com Zod (`analysisRequestSchema`), delegando a lógica de pontuação ao `AiAgentService` (camada de serviço).
- **Segurança**:
  - Middlewares aplicam Helmet, CORS restrito por ambiente, compressão e rate limit (`express-rate-limit`).
  - O middleware `authenticate` introspecta tokens no autenticador e recusa sessões sem AAL2, tokens step-up ou inativos.
  - Logs sanitizados via Pino evitam vazamento de tokens (`maskToken`).
- **Modelo heurístico**: combina score fundamental (DY, ROE, margem, EV/EBIT), palavras-chave da análise textual e notícias recentes. Thresholds de compra/manutenção são parametrizáveis por ambiente (`AGENT_BUY_THRESHOLD`, `AGENT_HOLD_THRESHOLD`).

## Rotas
| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/ia/v1/analysis` | Recebe `asset` completo (estrutura de `AssetDetail`) e devolve `{ tendencia, analise, confidence, score, insights, modelo }`. Requer header `Authorization: Bearer <token>` válido. |
| `GET` | `/health` | Health-check simples usado por orquestradores. |

## Execução local
1. Instale dependências:
   ```bash
   npm install
   ```
2. Copie `prod.env` para `.env` e ajuste variáveis (usar sempre URLs HTTPS em ambientes reais).
3. Rodar em desenvolvimento (hot reload com `ts-node`):
   ```bash
   npm run dev
   ```
4. Executar testes unitários:
   ```bash
   npm test
   ```
5. Build + start produção:
   ```bash
   npm run build
   npm start
   ```

## Variáveis de ambiente
| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `PORT` | Não (default `4010`) | Porta HTTP. Publique atrás de proxy com TLS. |
| `LOG_LEVEL` | Não | Nível de log do Pino (`info`, `warn`, `debug`, ...). |
| `AUTH_INTROSPECTION_URL` | Sim | Endpoint HTTPS `/oauth2/introspect` do `technomoney-auth`. |
| `AUTH_INTROSPECTION_CLIENT_ID` | Sim (se o provedor exigir Basic) | ID do cliente autorizado a introspectar. |
| `AUTH_INTROSPECTION_CLIENT_SECRET` | Sim (quando aplicável) | Segredo do cliente introspector. Rotacione com frequência. |
| `RATE_LIMIT_WINDOW_MS` | Não | Janela em ms do rate limit global. |
| `RATE_LIMIT_MAX` | Não | Máximo de requisições na janela. Ajuste conforme capacidade. |
| `CORS_ALLOWED_ORIGINS` | Não | Lista separada por vírgula de origens permitidas. Vazio = aceita qualquer origem (apenas para dev). |
| `AGENT_MODEL_NAME` | Não | Nome lógico exibido no response (ex.: `fundamental-trend-v1`). |
| `AGENT_BUY_THRESHOLD` | Não | Pontuação mínima (0-100) para recomendar "Comprar". Deve ser maior que `AGENT_HOLD_THRESHOLD`. |
| `AGENT_HOLD_THRESHOLD` | Não | Limite inferior para manter (abaixo disso vira "Vender"). |

> **Nunca** commite segredos reais. Utilize vaults/secret managers e injete as variáveis na pipeline de CI/CD.

## Estratégia de tendência
O serviço calcula uma pontuação base a partir de `fundamentals.score`, ajustando com indicadores como ROE, margem, EV/EBIT e Dividend Yield. Palavras positivas/negativas do texto analítico e notícias incrementam ou reduzem o score. O retorno inclui `insights` explicando cada ajuste, facilitando auditoria e rastreabilidade da recomendação.

## Monitoramento e segurança operacional
- Configure dashboards para acompanhar erros `ia.auth.denied` (possíveis problemas de token) e `ia.analysis.invalid_payload` (payload malformado).
- Aplique políticas de rotação de segredos e monitore o endpoint de introspecção por tentativas suspeitas.
- Habilite mTLS no autenticador (`INTROSPECTION_MTLS_ALLOWED_CNS`) quando o tráfego sair da mesma rede de confiança.
